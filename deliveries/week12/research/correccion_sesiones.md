# Corrección de la asignación sesión → condición (15 de noviembre de 2026)

Fase A de `PLAN.md`. Documento de evidencia: qué estaba mal, cómo se confirmó, qué se cambió y qué cambia en los resultados.

## Qué estaba mal

En ds004902 la carpeta de sesión indica la **condición**, no el orden temporal: `ses-1` es siempre sueño normal (NS) y `ses-2` siempre privación de sueño (SD). El orden en que cada persona hizo las dos visitas está solo en `SessionOrder` de `participants.tsv` (`NS->SD` o `SD->NS`, contrabalanceado).

La función `session_to_condition` del notebook de la Semana 6 (`deliveries/week06/code/02_eeg_pipeline.ipynb`, celda 3), que usaban todos los scripts de `deliveries/week12/app/tools/`, asignaba `ses-1` a la **primera** condición de `SessionOrder`. Para las personas `NS->SD` coincidía por casualidad; para las `SD->NS` (28 con EEG pareado, 30 en `participants.tsv`) NS y SD del EEG quedaban intercambiados y su Δ = SD − NS tenía el signo invertido. La conducta (PVT, KSS, SSS, PANAS) no estaba afectada: viene en columnas ya etiquetadas por condición.

## Evidencia (tres fuentes independientes)

1. **README del dataset** (`ds004902/README`, líneas 3–4): «two experiments involving normal sleep (NS---session1) and sleep deprivation (SD---session2) … Please note here Session 1 (NS) and Session 2 (SD) is not the time order, the time order is counterbalanced across participants and is listed in metadata».
2. **Artículo del dataset**: Xiang, Fan, Bai, Lv y Lei (2024). A resting-state EEG dataset for sleep deprivation. *Scientific Data, 11*, 427. https://doi.org/10.1038/s41597-024-03268-2 . Texto completo leído en Europe PMC (PMC11043390): «This dataset encompasses all EEG data, and PVT data from two experimental sessions: session 1 is NS and session 2 is SD» y «The NS and SD conditions are counterbalanced across participants to eliminate sequence effects».
3. **Los propios datos, antes de corregir**: Δσθ frontal era +0.013 en `NS->SD` (31 suben, 9 bajan) y −0.012 en `SD->NS` (9 suben, 19 bajan): el EEG seguía a la carpeta y no a la condición. La conducta, en cambio, subía en los dos órdenes (ΔKSS y ΔPVT positivos). Después de corregir, el EEG también sube en los dos órdenes (tabla de abajo).

No se usó la hora de inicio de los archivos: los `.json` de BIDS no guardan la fecha de grabación, y las horas de `EEG_SamplingTime_*` son de cada sesión, no indican cuál fue primero.

## Qué se cambió

- `tools/eeg_ica.py`: nuevas funciones `session_to_condition` (`ses-1` → NS, `ses-2` → SD), `visit_of` (en qué visita, 1 o 2, se grabó cada condición, desde `SessionOrder`) y `fix_sessions`. `notebook_defs()` reemplaza la función del notebook por la correcta. **El notebook de la Semana 6 no se editó** (es una entrega anterior).
- `tools/build_quality.py`, `tools/build_secondary.py`, `tools/build_cui_variant.py`: sus copias de `notebook_defs()` también llaman a `eeg_ica.fix_sessions`.
- `tools/build_eeg_ica.py`: usa la asignación corregida y agrega la columna `visit` (1 o 2) en `eeg_theta_per_electrode.csv` y `eeg_theta_epochs_roi.csv`, para la prueba por orden de sesiones (fase B de `PLAN.md`).
- `tools/build_multiverse.py`: el pipeline de la Semana 6 sin ICA (`deliveries/week06/data/processed/`) tiene el mismo error y no se regenera; se corrige **al leerlo**, intercambiando NS y SD de las personas `SD->NS`. Su control de consistencia con `merged_summary.csv` de la Semana 6 invierte el signo de esas personas.
- Se regeneraron todos los datos de la app (`build_eeg_ica`, `build_topo_stats`, `build_subject_topo`, `build_coords`, `build_participants`, `build_multiverse`, `build_secondary`, `build_quality`, `build_cui_variant` y `data.js`).

## Verificación

Comparando `data/processed_ica/` antes y después (las ICA salen de la misma caché, `ds004902/derivatives/batimix-ica/`, guardada por grabación y no por condición, así que no hay ruido de una ICA nueva):

| Comprobación | Resultado |
|---|---|
| Filas por electrodo emparejadas | 8479 de 8479 |
| `NS->SD` (41 personas en el archivo): μθ y σθ sin cambios | diferencia máxima 2.3e-15 (redondeo) |
| `SD->NS` (30 personas): NS nuevo = SD viejo y viceversa | diferencia máxima 2.8e-15 (redondeo) |
| Series por época y electrodo (139 registros) | intercambio exacto, mismas épocas rechazadas (diferencia 0) |
| Signo de Δ por orden de sesiones, después | positivo en los dos órdenes (abajo) |

Δ medio por orden de sesiones, después de corregir (personas que suben ↑ y bajan ↓):

| | NS→SD | SD→NS |
|---|---|---|
| Δσθ frontal | +0.0134 (31↑ 9↓, n = 40) | +0.0119 (19↑ 9↓, n = 28) |
| Δσθ centrotemporal | +0.0132 (31↑ 9↓) | +0.0122 (22↑ 6↓) |
| Δμθ frontal | +0.0230 (24↑ 16↓) | +0.0141 (19↑ 9↓) |
| ΔPVT (ms, conducta) | +50.3 (12↑ 0↓, n = 12) | +35.2 (15↑ 2↓, n = 18) |
| ΔKSS (conducta) | +1.70 (15↑ 3↓, n = 23) | +2.80 (9↑ 0↓, n = 10) |

## Qué cambia en los resultados (68 personas con EEG pareado)

| | Antes | Después |
|---|---|---|
| Δσθ frontal | 40↑ 28↓, t = 1.12, p = 0.27, d_z = 0.14 | 50↑ 18↓, t = 5.82, p = 1.8e-7, d_z = 0.71 |
| Δσθ centrotemporal | 37↑ 31↓, t = 1.07, p = 0.29, d_z = 0.13 | 53↑ 15↓, t = 6.16, p = 4.6e-8, d_z = 0.75 |
| Δμθ frontal | 33↑ 35↓, t = 1.23, p = 0.22, d_z = 0.15 | 43↑ 25↓, t = 3.29, p = 0.0016, d_z = 0.40 |
| Δμθ centrotemporal | 36↑ 32↓, t = 0.50, p = 0.62, d_z = 0.06 | 54↑ 14↓, t = 4.47, p = 3.1e-5, d_z = 0.54 |
| Electrodos σθ con p < 0.05 / q < 0.05 | 5 / 0 de 61 | 61 / 61 de 61 (d_z de +0.31 a +0.76) |
| Electrodos μθ con p < 0.05 / q < 0.05 | 4 / 0 de 61 | 55 / 52 de 61 (d_z de +0.05 a +0.67) |
| ρ(Δσθ frontal, ΔPVT), n = 30 | −0.04 (p = 0.81) | +0.16 (p = 0.39) |
| ρ(Δσθ frontal, ΔKSS), n = 32 | 0.00 (p = 0.99) | +0.20 (p = 0.27) |
| ρ(Δσθ frontal, ΔSSS), n = 33 | +0.37 (p = 0.04) | −0.19 (p = 0.28) |
| ρ(Δσθ frontal, ΔPANAS+), n = 65 | −0.17 (p = 0.19) | +0.25 (p = 0.04) |

Consecuencias para la historia del proyecto:
- **Ya no es cierto que «no hay aumento grupal»**: la privación aumenta la variabilidad (σθ) y la media (μθ) de theta, en casi toda la cabeza y con tamaño de efecto mediano a grande. La heterogeneidad individual sigue existiendo (18 de 68 bajan en σθ frontal), pero ya no es «mitad y mitad».
- **El «efecto de orden de sesión»** que mostraba la comparación por orden (casi todos los electrodos con FDR, signos opuestos entre grupos) **era este error**, no un efecto real. Tras corregir, los dos órdenes suben.
- **La no replicación de Cui et al. (2026) se mantiene**: ρ con ΔPVT pasa de −0.04 a +0.16, en la dirección esperada pero no significativa (n = 30).
- La correlación con ΔSSS que salía significativa (+0.37) desaparece. Aparece una con ΔPANAS+ (+0.25, p = 0.04, sin corregir por los marcadores probados), pero va en la dirección contraria a la predicha (más theta inestable con más afecto positivo): no es un indicio de vulnerabilidad. En el multiverso, el marcador más consistente pasa a ser el tiempo de reacción mediano del PVT (r mediana +0.21 en sus 128 análisis, de −0.03 a +0.39), aunque la prueba conjunta sobre los 896 análisis sigue sin superar el azar (σθ: r mediana +0.030, p = 0.34).
- Todos los textos con cifras (About, notas ⓘ, Report, `README.md`, `RefinedDraftReport.md`, `PeerCritiqueResponse`) deben rehacerse. **Avisar al equipo antes de entregar.**

## Segunda corrección del mismo día: dos grabaciones a 5000 Hz

Al fijar los parámetros de Welch (fase 2 de `PLAN.md`) apareció otro problema: tres grabaciones de ojos abiertos de ds004902 están a 5000 Hz y no a 500 Hz (`sub-39`, `sub-43` y `sub-44`, todas `ses-2`; la de `sub-44` es una de las tres que no se pueden leer). Con el valor por defecto de MNE, Welch usaba segmentos de 2048 muestras, que a 500 Hz son 4 s (0.25 Hz) pero a 5000 Hz son 0.41 s: el espectro de esas dos grabaciones tenía 2.44 Hz de resolución y solo 16 frecuencias entre 1 y 40 Hz, y su theta estaba inflado (μθ medio de `sub-39` SD: 0.35 antes, 0.26 ahora). Welch se define ahora en segundos (`tools/eeg_ica.welch`), igual para todas las grabaciones; las ventanas de 1 s de `build_quality.py` y `build_secondary.py` también.

Verificación: las 137 grabaciones a 500 Hz dan exactamente los mismos valores (diferencia 0.0); solo cambian las dos a 5000 Hz. Todos los datos se regeneraron otra vez. Las cifras de las tablas de arriba son las de la corrección de sesiones; con esta segunda corrección cambian poco. Las cifras finales están en `RefinedDraftReport.md`:

| | Después de la corrección de sesiones | Final (también con Welch en segundos) |
|---|---|---|
| Δσθ frontal | t = 5.82, d_z = 0.71 | t = 5.88, d_z = 0.71 |
| Δσθ centrotemporal | t = 6.16, d_z = 0.75 | t = 6.30, d_z = 0.76 |
| Δμθ frontal | t = 3.29, d_z = 0.40 | t = 2.98, d_z = 0.36 |
| Electrodos con q < 0.05, σθ / μθ | 61 / 52 | 61 / 45 |
| ρ(Δσθ, ΔPVT), frontal / centrotemporal | +0.16 / +0.37 | +0.16 / +0.37 |
| Multiverso, solo σθ: r mediana | +0.030 (p = 0.34) | +0.030 (p = 0.34) |
