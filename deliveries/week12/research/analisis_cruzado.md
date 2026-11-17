# Análisis cruzado por orden de sesiones (16 de noviembre de 2026)

Fase B de `PLAN.md`. Requiere la corrección de sesiones (`correccion_sesiones.md`). Código: `app/tools/crossover.py` (validación y datos) y `crossoverSpec` en `app/js/topomap.js` (la vista). Datos: `app/data/crossover.json`.

## Diseño

Cada persona tiene sueño normal (NS) y privación (SD) en dos visitas. El orden es la secuencia: NS→SD (AB, 40 personas con EEG pareado) o SD→NS (BA, 28). Es un diseño cruzado de dos períodos (Grizzle, 1965; Hills y Armitage, 1979; Senn, 2002; Jones y Kenward, 2014). Para cada persona *i*, por electrodo o región y métrica:

- d_i = SD_i − NS_i (por condición; positivo = más alto tras la privación)
- p_i = V2_i − V1_i (segunda visita menos primera): p_i = d_i en AB y −d_i en BA
- s_i = (NS_i + SD_i) / 2

| Pregunta | Estimador | Prueba |
|---|---|---|
| Efecto de la privación ajustado por visita | c = (media d_AB + media d_BA) / 2 | Welch t de p entre secuencias |
| Efecto de visita (2.ª − 1.ª) | π = (media d_AB − media d_BA) / 2 | Welch t de d entre secuencias |
| Arrastre o secuencia | media s_AB − media s_BA | Welch t de s; solo descriptiva (Freeman, 1989) |

La diferencia entre los mapas Δ de «Normal sleep first» y «Deprivation first» es 2π: en un cruzado de dos períodos la interacción condición × orden es el efecto de visita, no «el orden modula la privación». Con 40 contra 28 personas, la media simple de d vale c + (40 − 28)/68 · π = c + 0.18 π.

## Paso 1. Validación con datos sintéticos

`python3 tools/crossover.py --validate`. Modelo: y = μ_i + (c/2)·(±1 por condición) + π·(visita − 1.5) + ruido, con μ_i desplazado en la secuencia AB por el arrastre; 40 y 28 personas; c, π y arrastre en {−0.5, 0, +0.5} y {−1, 0, +1} (27 escenarios), 2000 réplicas cada uno.

| c | π | arrastre | c estimado | π estimado | arrastre estimado | media simple (sesgo) | rechazo c | rechazo π |
|---|---|---|---|---|---|---|---|---|
| 0 | 0 | 0 | −0.000 | −0.003 | −0.006 | −0.001 | 0.050 | 0.060 |
| +0.5 | 0 | 0 | +0.499 | +0.003 | −0.002 | +0.499 (−0.001) | 1.000 | 0.048 |
| 0 | +0.5 | 0 | +0.002 | +0.500 | +0.001 | +0.090 (+0.090) | 0.058 | 1.000 |
| +0.5 | +0.5 | −1 | +0.500 | +0.501 | −1.008 | +0.589 (+0.089) | 1.000 | 1.000 |
| +0.5 | +0.5 | +1 | +0.498 | +0.501 | +1.006 | +0.586 (+0.086) | 1.000 | 1.000 |

En los 27 escenarios c, π y el arrastre se recuperan con su signo (dentro de 4 errores estándar), y cuando el valor verdadero es 0 la tasa de rechazo queda entre 3 % y 7 %: ninguno contamina a los otros. La media simple tiene el sesgo teórico (+0.088 con π = 0.5). La primera versión de la simulación puso el arrastre en la secuencia contraria a la del estimador y dio el signo invertido; se corrigió la simulación, no el estimador.

Comprobaciones adicionales (`tools/check_app.py`, prueba 13): c y π de `crossover.json` coinciden con los coeficientes de una regresión de mínimos cuadrados con efecto fijo por persona + condición + visita (20 electrodos × métricas, diferencia 4.9e-7), y la vista de la app reproduce c, π, p y q de Python en los 61 electrodos (diferencia 5e-7).

## Paso 2. Coherencia con la conducta

Conducta de `participants.tsv`, columnas por condición; n por secuencia entre paréntesis.

| Marcador | c (p) | π (p) | arrastre p | media simple |
|---|---|---|---|---|
| KSS (23 + 10) | +2.25 (p = 4.6e-6) | −0.55 (p = 0.14) | 0.48 | +2.03 |
| SSS (18 + 17) | +1.65 (p = 9.6e-5) | +0.18 (p = 0.62) | 0.71 | +1.66 |
| PVT tiempo de reacción mediano, ms (12 + 18) | +42.7 (p = 1e-8) | +7.5 (p = 0.17) | 0.30 | +41.2 |

c sale positivo y grande en los tres; π es pequeño y no significativo. Cumple lo que pide el plan.

## Paso 3. Resultados en el EEG (68 personas, 40 + 28)

Regiones (σ = variabilidad entre épocas, μ = media):

| | c (t, p) | π (p) | arrastre p | media simple |
|---|---|---|---|---|
| θ σ frontal | +0.0128 (t = 5.40, p = 2.2e-6) | +0.0009 (0.71) | 0.40 | +0.0129 |
| θ σ centrotemporal | +0.0127 (t = 5.97, p = 2e-7) | +0.0006 (0.79) | 0.74 | +0.0129 |
| θ μ frontal | +0.0167 (t = 2.82, p = 0.0067) | +0.0026 (0.66) | 0.58 | +0.0172 |
| θ μ centrotemporal | +0.0230 (t = 3.77, p = 0.00057) | −0.0031 (0.61) | 0.55 | +0.0224 |
| δ σ frontal | +0.0125 (t = 3.15, p = 0.0029) | +0.0021 (0.59) | 0.16 | +0.0129 |
| β σ frontal | +0.0054 (t = 2.93, p = 0.0048) | −0.0023 (0.22) | 0.18 | +0.0050 |

Por electrodo, con FDR de Benjamini–Hochberg dentro de cada familia (pregunta × métrica × banda, 61 electrodos):

| Banda | σ: c / π con q < 0.05 | μ: c / π con q < 0.05 |
|---|---|---|
| Delta | 40 / 0 | 0 / 0 |
| Theta | 61 / 0 | 40 / 0 |
| Alfa | 0 / 0 | 0 / 0 |
| Beta | 1 / 0 | 0 / 0 |

Confirmación por permutación (cuidado 5, opcional en el plan): se permutan las etiquetas de secuencia con p_i fijo (para c) o d_i fijo (para π), 5000 permutaciones, FDR igual que arriba. Theta σ: c 61/61 y π 0/61, la misma decisión que Welch en los 61 electrodos. Theta μ: c 44/61 (Welch 40/61; misma decisión en 57 de 61). Delta σ: c 42/61 (Welch 40/61; 59 de 61). π no pasa FDR en ningún electrodo ni banda con ninguno de los dos métodos.

Lectura: el efecto de la privación sobrevive al ajuste por visita casi sin cambios (c ≈ media simple, porque π ≈ 0). No hay efecto de visita en ningún electrodo ni banda, y el arrastre no es significativo. Theta μ baja de 45 a 40 electrodos con q < 0.05 porque la prueba de dos muestras (Welch) tiene menos potencia que la pareada: con π ≈ 0 la prueba pareada de la Topography View sigue siendo válida y se mantiene como principal; c se informa junto a ella (cuidado 2 del plan).

## Hora del día (cuidado 6, descriptivo)

`EEG_SamplingTime_Open_*` de `participants.tsv` (71 personas): la grabación de ojos abiertos fue a las 11:37 de mediana en NS (8:17–21:13) y a las 10:18 en SD (7:49–18:03). SD − NS: media −42 min, mediana −40 min, 34 personas con más de 1 h de diferencia (Wilcoxon p = 0.003). Por secuencia: −65 min en NS→SD y −9 min en SD→NS. No entra en la prueba; es un posible confusor. Si theta subiera con la hora del día, SD más temprano iría en contra del efecto observado, no a favor; no se probó.

## En la app

Topography View, comparación «Session order»: en lugar de los Δ de cada orden, dos filas. Arriba, la privación ajustada (columnas Normal y Deprivation con igual peso por secuencia, y el mapa c); abajo, la visita (1.ª visita, 2.ª visita y el mapa π). Mismos aros (q < 0.05) y puntos (p < 0.05) que el resto de la vista; sin prueba de clusters en este modo (la implementada es para muestras pareadas). Solo en los cinco minutos completos: en ventana o serie se muestra la comparación anterior por grupo.

## Referencias

- Grizzle, J. E. (1965). The two-period change-over design and its use in clinical trials. *Biometrics*, 21, 467–480.
- Hills, M., y Armitage, P. (1979). The two-period cross-over clinical trial. *British Journal of Clinical Pharmacology*, 8, 7–20.
- Freeman, P. R. (1989). The performance of the two-stage analysis of two-treatment, two-period crossover trials. *Statistics in Medicine*, 8, 1421–1432.
- Senn, S. (2002). *Cross-over Trials in Clinical Research* (2.ª ed.). Wiley.
- Jones, B., y Kenward, M. G. (2014). *Design and Analysis of Cross-Over Trials* (3.ª ed.). CRC Press.

Los DOI no se verificaron (el plan lo pide antes de citarlas en el paper).
