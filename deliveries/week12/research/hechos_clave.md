# BATIMIX Semana 12: hechos clave (fuente única para app, informe, paper, presentación y página)

Todas las cifras salen de los datos de `app/data/` (procesados en la Semana 6) y de `app/tools/build_multiverse.py`.
Si una cifra cambia, se cambia aquí primero.

## Proyecto
- Título: "Una noche sin dormir no le pasa igual a todos" (BATIMIX). Curso DS5343 Data Visualization, UTEC 2026-2, Prof. Germain García-Zanabria.
- Equipo y responsabilidades: Jimena Gurbillon (mapa del cuero cabelludo, Q1 y Q2), Andrea Coa (dinámica y moderadores, Q6 y Q7), Paolo Medrano (vulnerabilidad, convergencia y multiverso, Q3 a Q5).
- Audiencia: investigador en fisiología del sueño que hace screening exploratorio sobre datos públicos. Decisión que apoya: qué canales, regiones y covariables merecen una prueba formal. No es diagnóstica ni predictiva.
- Repositorio: https://github.com/Andrea-Coa/data-visualization-project
- Despliegue previsto (GitHub Pages, verificar tras el push): https://andrea-coa.github.io/data-visualization-project/deliveries/week12/app/

## Datos
- OpenNeuro ds004902 v1.0.8 (Xiang, Fan, Bai, Lv y Lei, 2024, Scientific Data, CC0). 71 participantes, diseño intra-sujeto sueño normal (NS) frente a privación de sueño (SD, 24 a 30 h), contrabalanceado. 61 electrodos, 500 Hz, referencia FCz. Reposo con ojos abiertos, 5 min.
- Procesamiento (Semana 6): notch 50 Hz, pasabanda 1 a 40 Hz, canales malos por z de log-varianza e interpolación esférica, sin ICA, sin re-referenciar. 75 épocas de 4 s. Potencia theta relativa = potencia 4 a 8 Hz / potencia 1 a 40 Hz (Welch, sin unidades). σθ = desviación estándar entre épocas; μθ = media. Δ = SD menos NS. ROI frontal (16 electrodos) y centro-temporal (28) según Cui et al. (2026).
- n efectivo: 68 de 71 con EEG pareado (5 registros corruptos en origen). Entre los 68: PVT 30, KSS 32, SSS 33, PANAS 65.

## Hallazgos (todos visibles en la app)
1. Individuos, no promedio: Δσθ frontal medio +0.00431 (DE entre personas 0.0231); 39 personas se vuelven más inestables y 29 más estables. Centro-temporal: media +0.00266.
2. Dónde: σθ, 4 de 61 electrodos con p < 0.05 sin corregir (AF8, Fp2, O2, Oz) y 0 tras FDR. μθ: 8 de 61 sin corregir (C6, F8, FC2, O2, Oz, P8, T7, T8) y 0 tras FDR. Cambio difuso, sin foco frontal.
3. Cuándo: theta frontal SD sobre NS en 52 de 75 épocas; diferencia media +0.00513; tendencia SD −0.00208 por minuto (sin aumento a lo largo del registro).
4. Conducta: Spearman ρ = −0.10 [−0.44, 0.27], n = 30 (Δσθ frontal frente a Δ mediana del TR del PVT). No replica el ρ = 0.544 (frontal) y 0.558 (centro-temporal) de Cui et al. (2026, n = 28). 6 personas en el cuadrante vulnerable (sobre la mediana en ambos ejes). Con PVT lapsos: ρ = −0.01 [−0.37, 0.35], n = 30.
5. Multiverso (diferencial): 448 especificaciones = 4 regiones (frontal, centro-temporal, posterior, global) × 2 métricas (σθ, μθ) × 2 formas de cambio (absoluto, relativo) × 7 marcadores (PVT mediana TR, PVT lapsos, PVT DE del TR, KSS, SSS, PANAS+ invertido, PANAS−) × 2 correlaciones (Spearman, Pearson) × 2 reglas de atípicos (todos, excluir |z| > 2.5). Todo orientado a deterioro (r > 0 = la hipótesis de Cui).
   - Prueba principal, solo σθ (224 análisis): mediana r = +0.035 (p = 0.32); 0 significativos; Z de Stouffer = +4.57 (p = 0.22).
   - Multiverso completo (448): mediana r = +0.012 (p = 0.42); 26 significativos con r > 0 (el 95 % del azar llega hasta 56; p = 0.15); Z de Stouffer = +3.13 (p = 0.33). r va de −0.43 a +0.41.
   - Los 26 significativos son todos PANAS+ (invertido) con μθ: más aumento de potencia theta, mayor caída del afecto positivo. Pista exploratoria, no hallazgo.
   - Inferencia conjunta: 2000 permutaciones de las filas conductuales entre los 68 sujetos (adaptación de Simonsohn, Simmons y Nelson, 2020, para datos observacionales sin covariables). Control de consistencia: Δσθ frontal recalculado = merged_summary.csv de la Semana 6 (diferencia máx. 2.8e−17). El análisis inicial (frontal, σθ, absoluto, PVT mediana, Spearman, todos) reproduce ρ = −0.099.
6. Conclusión preliminar: sin dormir, la theta de cada persona se mueve en direcciones distintas, y ese cambio no predice de forma robusta quién se deteriora. La única pista es con el ánimo (PANAS+), no con la vigilancia (PVT).

## Posibles razones de la no replicación (de literatura_verificada.md)
- Cui et al. usaron referencia promedio, ICA, filtro 1 a 30 Hz, denominador 4 a 30 Hz, rechazo de épocas > 200 µV y limpieza de TR del PVT (< 100 ms y > 2000 ms) con n = 28; nosotros, referencia FCz, sin ICA, denominador 1 a 40 Hz y n = 30.
- Potencia baja: con n = 30, la probabilidad de detectar ρ = 0.3 es ≈ 0.35.
- Basner y Dinges (2011) desaconsejan la mediana del TR como medida principal del PVT: por eso se añadieron lapsos y DE del TR.
- Inconsistencia documental: Xiang et al. (2024, p. 4) parecen asignar los valores t del PVT a indicadores distintos de los del diccionario del dataset; nuestros datos siguen el diccionario (27 de 30 personas más lentas sin dormir).

## Conectividad funcional (informe_conectividad.md)
- Recomendación: descartar para las tres semanas finales; queda como trabajo futuro. Matriz de decisión: sin conectividad 29/40, grafo + topomapa 24, matriz 22, grafo solo 17.
- Motivo principal: Verweij et al. (2014), el estudio más parecido, no halló cambios de conectividad con ojos abiertos; el pipeline actual (FCz, sin ICA, sin EOG) no sirve para conectividad; 1830 aristas con n = 68 exigen d_z ≈ 0.65.
- Si se retoma: wPLI debiased en theta, imcoh como sensibilidad, 3 ROI con permutación pareada y Holm; 6.11 GB solo ojos abiertos.

## Diseño (Semana 12, versión final tras la crítica)
- Tema oscuro tipo instrumento científico (fondo #0B0D12), elegido por el equipo. Un único header con el título y todos los controles: región (frontal / centro-temporal), métrica (σθ / μθ), grupo, marcador del eje Y, Limpiar y Acerca de. Sin scrollytelling, sin animaciones y sin textos de instrucciones: el título de cada panel es su hallazgo.
- Cuatro paneles sin espacio entre ellos (solo líneas de 1 px), que llenan 1365 × 768 sin desplazamiento: (1) matriz 2 × 3 de topomapas, columnas NS, SD y Δ (SD menos NS), filas σθ y μθ del grupo activo, que pasan a ser las personas A y B cuando se eligen dos puntos en la dispersión (con la métrica del header y escalas compartidas); (2) dispersión de vulnerabilidad con franja inferior de las 68 personas y el conteo 39 / 29; (3) cinco minutos, media ± EE por época; (4) multiverso: curva de 448 análisis sobre la franja del azar y mediana de r por decisión.
- Intro, datos, glosario, tareas, método, limitaciones, tabla de datos y créditos: panel "Acerca de".
- Comparar (header): mujeres vs hombres, orden de sesión, sueño habitual (PSQI > 5 vs ≤ 5) o vulnerables vs resto. Cada grupo tiene su color (lavanda #B79CFF y oro #F6C945) en las cuatro vistas: filas de la matriz de mapas con escalas compartidas, ρ por grupo en la leyenda de la dispersión y Δ (SD − NS) por época de cada grupo en cinco minutos. Ejemplo: mujeres Δσθ medio +0.0078 frente a hombres −0.0003; ρ con PVT TR 0.08 (n = 12) y −0.04 (n = 18); SD > NS en 64 y 35 de 75 épocas.
- Enlaces entre vistas: clic en un electrodo de cualquier mapa = eje x de la dispersión con el Δ de ese electrodo (anillo ámbar en los seis mapas, tooltip con su ρ con el marcador); arrastrar una ventana en cinco minutos = eje x con el Δ de esa ventana; el chip del header dice qué manda en el eje x y lo quita.
- Reporte (header): descarga un HTML autocontenido con el estado de la vista, los cuatro gráficos tal como están, qué muestra cada uno y cómo leerlo, la conclusión, la tabla de personas activas y su CSV; se imprime o guarda en PDF.
- Títulos: etiqueta de tarea (T1 a T8) + titular breve calculado con los datos ("Sin foco: el cambio es difuso", "Más inestable ≠ más lento", "Theta sube poco y sin tendencia", "Ningún análisis rescata el efecto") + cifras de respaldo en tono apagado.
- Tareas (Brehmer y Munzner, 2013): T1 Localizar (Q1) columna Δ con marcas de p y FDR; T2 Comparar métricas (Q2) filas σθ y μθ; T3 Identificar vulnerables (Q3) dispersión con cuadrante, lazo y franja; T4 Comparar (Q4) matriz por grupo y filas A / B; T5 Correlacionar (Q5) eje Y y ρ con n, recalculado por grupo; T6 Describir tendencia (Q6) cinco minutos; T7 Filtrar por moderador (Q7) selector de grupo; T8 Verificar robustez: multiverso.
- Interacciones: lazo libre (grupo), clic en dos puntos (A y B; un tercero reemplaza al más antiguo), Esc y Limpiar, selector de grupo, región y métrica globales, filtro por decisión en el multiverso, clic (o flechas + Enter) en un análisis lo carga en la dispersión.
- Codificación: NS cian (#3DD6F5), SD magenta (#FF5C8A); NS y SD con escala secuencial inferno compartida por fila; Δ divergente cian, oscuro, magenta con cero neutro; cuadrante vulnerable ámbar; multiverso: significativos con r > 0 en verde menta, con r < 0 en lavanda, el resto gris; tipografía Geist y Geist Mono.

## Plan de las tres semanas finales
- Semana 13 (29 oct a 4 nov): Jimena re-ejecuta el pipeline con referencia promedio e ICA (estilo Cui) y añade esa dimensión al multiverso; Andrea resume moderadores y escribe el guion del teaser; Paolo añade el criterio de vulnerabilidad por lapsos (Chua et al., 2019) y redacta Resultados. Todos: despliegue en GitHub Pages y prueba informal con 3 a 5 usuarios (tareas T1 a T8, pensamiento en voz alta).
- Semana 14 (5 a 11 nov): paper completo en plantilla IEEE VIS (LaTeX en Overleaf), póster con QR, video de presentación (5 min) y teaser (1 min); incorporar hallazgos de usabilidad.
- Semana 15 (12 a 18 nov): pulido final, README final, declaración de contribuciones y reflexión, prueba de todos los enlaces, exhibición y presentación oral de 10 min.
