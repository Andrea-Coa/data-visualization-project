# Corrección de la orientación de los electrodos en MNE (17 de noviembre de 2026)

Documento de evidencia, con la misma estructura que `correccion_sesiones.md`: qué estaba mal, cómo se confirmó, qué se cambió y qué cambia en los resultados.

## Qué estaba mal

`electrodes.tsv` de ds004902 usa los ejes de EEGLAB/BESA: **x hacia la nariz, y hacia la oreja izquierda**, z hacia arriba (Fp1 = (80.8, 26.1, −4.0) mm; T7 = (0, 84.5, −8.8) mm). El sistema `head` de MNE es **x hacia la derecha, y hacia la nariz**. La función `build_montage` del notebook 02 de la Semana 6 copiaba x e y tal cual, así que MNE veía la cabeza girada 90° (Fp1 en x = +80 mm, es decir, a la derecha; la nariz apuntando a la derecha). El dataset no trae `coordsystem.json` que lo aclare.

Qué afectaba y qué no:

| Paso | ¿Afectado? | Por qué |
|---|---|---|
| Interpolación esférica de canales malos | No | depende de distancias entre electrodos, que un giro no cambia |
| Posición de FCz (punto medio de Fz y Cz) | No | mismo motivo |
| Detección ocular por correlación con Fp1/Fp2 (`find_bads_eog`) | No | usa la señal, no la posición |
| **ICLabel** (componentes oculares y musculares) | **Sí** | clasifica cada componente por su mapa topográfico, que veía girado |
| Topomapas de la app (`tools/build_coords.py`) | No | ya convertía bien los ejes (X = −y, Y = x) |

## Cómo se confirmó

1. Posiciones en MNE con el montaje del notebook: Fp1 = (80.8, 26.1) mm, T7 = (0, 84.5) mm; con la corrección: Fp1 = (−26.1, 80.8), T7 = (−84.5, 0), Oz = (0, −85): adelante a la izquierda, oreja izquierda y atrás, como debe ser.
2. Con las 139 ICA en caché: la selección con el montaje girado reproduce exactamente los componentes quitados en caché (139 de 139), lo que valida la comparación. Con la orientación correcta, ICLabel cambia en promedio 9.2 de las 30 etiquetas por grabación, y el conjunto de componentes quitados cambia en 132 de 139 grabaciones.

## Qué se cambió

- `tools/eeg_ica.py`: nueva `build_montage` (X = −y, Y = x, Z = z, en metros) que `fix_sessions` pone en lugar de la del notebook; todos los scripts que usan `notebook_defs()` (incluidos `build_quality.py`, `build_secondary.py` y `build_cui_variant.py`) la heredan. **El notebook de la Semana 6 no se editó.**
- La regla de selección pasa a `v4`: la ICA en caché (que no depende de las posiciones) se reutiliza y la selección de componentes se rehace con la orientación correcta.
- Se regeneraron todos los datos (17 nov 2026, 8 núcleos): `build_eeg_ica`, topomapas por banda, participantes, cruzado, calidad, 1/f y sincronía, rasgos y clasificador, multiverso, multiverso por banda y variante de Cui.

## Qué cambia en los resultados

| | Antes (montaje girado) | Después |
|---|---|---|
| Componentes quitados por grabación | 5.1 (2.5 oculares, 2.6 musculares) | 7.2 (3.7 oculares, 3.5 musculares) |
| Épocas conservadas | 71.0 de 75 | 72.0 de 75 |
| θ σθ: electrodos con q < 0.05 (d_z) | 61 de 61 (0.30 a 0.77) | 61 de 61 (0.28 a 0.75) |
| θ μθ: electrodos con q < 0.05 | 45 de 61 | 42 de 61 |
| Δσθ frontal | d_z 0.71, p = 1.4e-7 | d_z 0.74, p = 6.6e-8 |
| δ σθ / β σθ: electrodos con q < 0.05 | 49 / 7 | 36 / 15 |
| Parpadeos: ρ(Δσθ con y sin parpadeos), frontal | 0.948 | 0.937 |
| Parpadeos: ρ(Δparpadeos, Δσθ), frontal | 0.15 | 0.14 |
| Parte periódica: ρ(Δσθ, Δσθ periódica), frontal | 0.78 | 0.81 |
| Multiverso: significativos en la dirección predicha | 4 de 896 (p = 0.72) | 3 de 896 (p = 0.76) |
| Multiverso: r mediana | +0.027 (p = 0.34) | +0.037 (p = 0.28) |
| ρ(Δσθ centrotemporal, ΔPVT), n = 30 | +0.37 (p = 0.047) | +0.30 (p = 0.11) |
| ρ(Δσθ frontal, ΔPVT), n = 30 | +0.16 (p = 0.39) | +0.18 (p = 0.34) |
| Análisis cruzado: c en σθ frontal | +0.0128 (t = 5.40) | +0.0134 (t = 5.77) |
| Clasificador pareado, AUC logística / EBM / GBM | 0.88 / 0.90 / 0.84 | 0.89 / 0.90 / 0.91 |
| Clasificador estricto, AUC logística / EBM / GBM | 0.75 / 0.72 / 0.70 | 0.72 / 0.72 / 0.61 |
| Control de visita, AUC (pareado) | 0.49 | 0.52 |
| Variante de Cui: componentes quitados (NS / SD) | 1.9 / 2.6 | 2.6 / 2.9 (Cui et al.: 2.6 a 3.1) |
| Variante de Cui: ρ con ΔPVT centrotemporal / frontal | +0.33 / −0.04 | +0.33 / +0.00 |

Ninguna conclusión cambia: la privación sube σθ en todo el cuero cabelludo, el efecto es sobre todo oscilatorio, los parpadeos no lo explican, no es un efecto de visita y σθ no predice la conducta. El único cambio de lectura es que el vínculo centrotemporal con la PVT, que antes rozaba la significación (p = 0.047, sin corregir), ahora no la alcanza (p = 0.11): era frágil, y el informe ya lo trataba como débil. En el clasificador, la caja negra (GBM) pasa a quedar levemente por encima de los modelos explicables en el escenario pareado (0.91 frente a 0.89–0.90) y claramente por debajo en el estricto (0.61 frente a 0.72). Lo que más se mueve son delta y beta, las bandas más sensibles al músculo, porque ahora se quitan más componentes musculares.
