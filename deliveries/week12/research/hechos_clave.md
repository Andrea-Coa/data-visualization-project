# BATIMIX Semana 12: hechos clave (fuente única para app, informe, paper, presentación y página)

Todas las cifras salen de los datos de `app/data/` y de los generadores de `app/tools/`. Desde el 2 de noviembre de 2026 el
pipeline principal es el de referencia promedio con ICA (`tools/eeg_ica.py`, `tools/build_eeg_ica.py`); el de la Semana 6
(referencia FCz, sin ICA) queda como dimensión del multiverso y como comparación. Si una cifra cambia, se cambia aquí primero.

## Proyecto
- Título: "Una noche sin dormir no le pasa igual a todos" (BATIMIX). Curso DS5343 Data Visualization, UTEC 2026-2, Prof. Germain García-Zanabria.
- Equipo y responsabilidades: Jimena Gurbillon (mapa del cuero cabelludo, Q1 y Q2, datos y métodos), Andrea Coa (dinámica y moderadores, Q6 y Q7), Paolo Medrano (vulnerabilidad, convergencia y multiverso, Q3 a Q5).
- Audiencia: investigador en fisiología del sueño que hace screening exploratorio sobre datos públicos. Decisión que apoya: qué canales, regiones y covariables merecen una prueba formal. No es diagnóstica ni predictiva.
- Repositorio: https://github.com/Andrea-Coa/data-visualization-project (rama de trabajo `visuales`).
- Despliegue previsto (GitHub Pages; requiere activarlo y fusionar `visuales` en `main`): https://andrea-coa.github.io/data-visualization-project/deliveries/week12/app/

## Datos
- OpenNeuro ds004902 v1.0.8 (Xiang, Fan, Bai, Lv y Lei, 2024, Scientific Data, CC0). 71 participantes, diseño intra-sujeto sueño normal (NS) frente a privación de sueño (SD, 24 a 30 h), contrabalanceado. 61 electrodos, 500 Hz, referencia de registro FCz. Reposo con ojos abiertos, 5 min. Sin canal EOG.
- n efectivo: 68 de 71 con EEG pareado. Tres registros de ojos abiertos (sub-01, sub-28 y sub-44, sesión 2) están truncados en el bucket de OpenNeuro (verificado el 2 de noviembre de 2026). Entre los 68: PVT 30, KSS 32, SSS 33, PANAS 65.

## Procesamiento (pipeline principal, `tools/eeg_ica.py`)
- Notebook 02 de la Semana 6: notch 50 Hz, pasabanda 1 a 40 Hz, canales malos por z de la log-varianza (|z| > 3) e interpolación esférica.
- FCz reinsertado (posición: punto medio de Fz y Cz sobre la esfera) y referencia promedio.
- ICA Infomax extendido, 30 componentes, semilla 97. Se quitan los oculares (correlación con Fp1 o Fp2 atípica dentro del registro, `find_bads_eog` de MNE con z > 3, o ICLabel «eye blink» p > 0.85) y los musculares (ICLabel «muscle artifact» p > 0.85). Promedio: 5.1 componentes por registro (2.5 oculares, 2.6 musculares).
- Tras el ICA se interpolan los canales que superan 200 µV pico a pico en más de la mitad de las épocas. 75 épocas de 4 s; se rechazan las que superan 200 µV (se conservan 71 de 75 en promedio; en la app quedan como huecos).
- Theta relativa = potencia 4 a 8 Hz / potencia 1 a 40 Hz (Welch, sin unidades). σθ = desviación estándar entre épocas; μθ = media. Δ = SD menos NS. ROI frontal (16) y centro-temporal (28) según Cui et al. (2026).
- Por qué: todos los estudios recientes de privación de sueño con EEG multicanal usan ICA (Snipes et al., 2022; Lian et al., 2023; Ma et al., 2023; Liu, Xie y Ma, 2024; Cui et al., 2026); ver `literatura_verificada.md`, grupo E.
- Semana 6 (comparación): mismo notebook sin re-referencia, sin ICA y sin rechazo de épocas (`deliveries/week06/data/processed/`).

## Hallazgos (todos visibles en la app)
1. Individuos, no promedio: Δσθ frontal medio +0.0030 (DE entre personas 0.022); 40 personas se vuelven más inestables y 28 más estables. Centro-temporal: media +0.0027. Grupo frontal t = 1.12 (p = 0.27; Semana 6: t = 1.54, p = 0.13).
2. Dónde: σθ, 5 de 61 electrodos con p < 0.05 sin corregir (CPz, O2, Oz, PO3, PO4) y 0 tras FDR. μθ: 4 de 61 (C6, F4, O2, P6) y 0 tras FDR. Cambio difuso, sin foco frontal.
3. Cuándo: theta frontal SD sobre NS en 60 de 75 épocas (diferencia media +0.0081, tendencia SD +0.0013 por minuto); σθ móvil (ventanas de 40 s) SD sobre NS en 60 de 66 ventanas (frontal).
4. Conducta: Spearman ρ = −0.04 [−0.40, 0.32], n = 30 (Δσθ frontal frente a Δ mediana del TR del PVT). No replica el ρ = 0.544 (frontal) y 0.558 (centro-temporal) de Cui et al. (2026, n = 28). 6 personas en el cuadrante vulnerable. Con PVT lapsos: ρ = 0.07 [−0.30, 0.42], n = 30. (Semana 6: ρ = −0.10 [−0.44, 0.27].)
5. Multiverso: 896 especificaciones = 2 pipelines (promedio + ICA; FCz sin ICA) × 4 regiones × 2 métricas × 2 formas de cambio × 7 marcadores × 2 correlaciones × 2 reglas de atípicos. Todo orientado a deterioro (r > 0 = la hipótesis de Cui).
   - Prueba principal, solo σθ (448): mediana r = +0.089 (p = 0.11); 11 significativos con r > 0 (el azar llega hasta 63; p = 0.31); Z de Stouffer = +11.09 (p = 0.09).
   - Completo (896): mediana r = +0.053 (p = 0.19); 58 significativos (azar hasta 106; p = 0.13); Z de Stouffer = +10.80 (p = 0.16). r va de −0.43 a +0.43.
   - 48 de los 58 significativos son PANAS+ (26 sin ICA, 22 con ICA; casi todos con μθ). Con ICA, además, 10 de σθ con SSS. Ninguno con el PVT. Pistas exploratorias.
   - Inferencia conjunta: 2000 permutaciones de las filas conductuales entre los 68 sujetos (Simonsohn, Simmons y Nelson, 2020). Control: Δσθ frontal recalculado = merged_summary.csv de cada pipeline (diferencia máx. 4e−17). El análisis inicial reproduce ρ = −0.099 (Semana 6) y −0.045 (ICA).
6. Oscilatorio, no 1/f: Δσθ sigue a la Δσθ periódica (specparam, ajustes de Bai et al., 2024): ρ = 0.82 frontal, 0.89 centro-temporal. El aumento del offset aperiódico que se ve sin ICA (d_z = +0.26, p = 0.034) desaparece con ICA (d_z = +0.01, p = 0.97).
7. Parpadeos: tasa NS 19.6 → SD 19.9 por minuto (p = 0.60). Quitar las ventanas de 1 s que tocan un parpadeo apenas cambia Δσθ (ρ = 0.95 frontal, 0.96 centro-temporal, n = 48). Quien más aumenta sus parpadeos aumenta más su σθ (ρ = 0.34, p = 0.005): más probable causa común (somnolencia) que contaminación.
8. Sincronía theta (exploratoria; wPLI² debiased, referencia promedio e ICA, 10 regiones, 45 pares): baja en 44 de 45 pares; ninguno sobrevive a FDR; prueba conjunta por permutación p = 0.14.
9. Conclusión preliminar: sin dormir, la theta de cada persona se mueve en direcciones distintas, y ese cambio no predice de forma robusta quién se deteriora, con o sin ICA. La única pista consistente es con el ánimo (PANAS+), no con la vigilancia (PVT).

## No replicación de Cui et al. (comprobada, `tools/build_cui_variant.py`)
- Pipeline exacto de Cui (1 a 30 Hz, referencia promedio, ICA al 99 % de varianza con |r| > 0.85 en Fp1/Fp2 e ICLabel p > 0.85, rechazo > 200 µV, denominador 4 a 30 Hz): 2.4 componentes por registro (Cui: 2.6 a 3.1), 69 de 75 épocas.
- Grupo frontal t = 2.32 (p = 0.023), sobre todo por el denominador (con 1 a 30 Hz, t = 1.33). Con el PVT: ρ = −0.06 frontal, −0.01 centro-temporal (n = 30); dejando fuera cada par de personas (435 subconjuntos de 28), ρ nunca supera 0.14.
- Lo que queda: Cui probablemente recalculó la mediana del TR desde los ensayos (sin < 100 ms ni > 2000 ms); usamos la columna pública. Potencia baja: con n = 30, la probabilidad de detectar ρ = 0.3 es ≈ 0.35. Los archivos de ensayos del PVT no coinciden con las columnas resumen (`tools/check_pvt_trials.py`).
- Basner y Dinges (2011) desaconsejan la mediana del TR como medida principal del PVT: por eso se añadieron lapsos y DE del TR.
- Inconsistencia documental: Xiang et al. (2024, p. 4) parecen asignar los valores t del PVT a indicadores distintos de los del diccionario; seguimos el diccionario (27 de 30 personas más lentas sin dormir).

## Diseño (estado al 2 de noviembre de 2026)
- Una sola vista, sin desplazamiento a 1365 × 768, al estilo de los sistemas de analítica visual de IEEE VIS (VISTA, Unlearning Comparator). Tema claro por defecto (oscuro opcional).
- Cabecera: logo, "BATIMIX", descripción ("A Visual Analytics System for Individual Vulnerability to Sleep Deprivation"), caja con dataset y pipeline (desde 1500 px), controles con etiqueta: Region, Metric, Compare, Behavior (y); Clear, Report, About, intercambiar columnas, tema.
- Tres columnas de vistas en cajas con nombre en mayúsculas e ícono: izquierda VULNERABILITY VIEW (dispersión cuadrada) e INDIVIDUAL VIEW (mapa de calor persona × electrodo, grupos vulnerable / resistente y C(e)); centro TOPOGRAPHY VIEW (matriz 2 × 3: Normal Sleep, Sleep Deprivation, Δ; filas σθ y μθ; interpolación v4, cúbica de MNE o spline esférico) y TIME VIEW (σθ móvil o θ por época, ± EE); derecha VALIDATION PANEL plegable: robustez ("Oscillatory or 1/f?", "Driven by blinks?") y exploratoria ("θ synchrony between regions").
- Selección: clic añade o quita personas; lazo; con 2 personas, filas de la matriz por persona; con 3 o más, promedio. Shift + clic: A y B. Clic en un electrodo = eje x de la dispersión; arrastrar en la vista temporal = ventana de tiempo.
- Codificación (tema claro): Normal Sleep azul #2166AC, Sleep Deprivation rojo #B2182B; NS y SD con YlGnBu; Δ con RdBu (cero blanco); cuadrante vulnerable ámbar. Tipografía Roboto y Roboto Condensed.
- Acerca de: introducción, datos, glosario, tareas, método, interpolación, robustez (multiverso), vistas secundarias, limitaciones, tabla de datos y créditos. Reporte: HTML autocontenido con la vista, la lectura de cada gráfico y el CSV.
- Tareas (Brehmer y Munzner, 2013): T1 Localizar (topografía, Δ con p y FDR); T2 Comparar métricas (filas σθ y μθ); T3 Identificar vulnerables (dispersión y mapa de calor); T4 Comparar (matriz por grupo o persona); T5 Correlacionar (dispersión, ρ con n); T6 Tendencia (vista temporal); T7 Moderador (Compare); T8 Robustez (panel de validación; multiverso en Acerca de).

## Plan de las semanas finales
- Semana 13 (29 oct a 4 nov): hecho: pipeline con referencia promedio e ICA como principal y como dimensión del multiverso (Jimena); vistas secundarias y rediseño visual. Pendiente: resumen de moderadores y guion del teaser (Andrea); criterio de vulnerabilidad por lapsos (Chua et al., 2019) y Resultados (Paolo); despliegue en GitHub Pages; prueba informal con 3 a 5 usuarios (T1 a T8).
- Semana 14 (5 a 11 nov): paper completo en plantilla IEEE VIS (LaTeX en Overleaf), póster con QR, video de presentación (5 min) y teaser (1 min); incorporar hallazgos de usabilidad.
- Semana 15 (12 a 18 nov): pulido final, README final, declaración de contribuciones y reflexión, prueba de todos los enlaces, exhibición y presentación oral de 10 min.
