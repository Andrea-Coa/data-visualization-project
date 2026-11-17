/* Language switch EN / ES. A discreet button in the bottom-right corner (or ?lang=es) switches the interface.
   The app builds its text in many places, so translation works on the text that reaches the page: every text node and
   every title / aria-label is looked up in a dictionary after its variable parts (numbers, electrode names, person ids,
   group names, the σ / μ symbol) are replaced by tokens, and the tokens are put back in the translation. A string with
   no entry stays in English. The About sheet and the guide have their own Spanish text.
   window.LANG is read by tour.js. */
(() => {
  const SAVED = (() => { try{ return localStorage.getItem("batimix-lang"); }catch(e){ return null; } })();
  const URLL = new URLSearchParams(location.search).get("lang");
  window.LANG = (URLL || SAVED) === "es" ? "es" : "en";

  // ---------------------------------------------------------------- dictionary (tokens: # number, {G} group, {S} σ or μ, {E} electrode, {P} person)
  const D = {
    "Loading # recordings":"Cargando # registros",
    "A Visual Analytics System for Individual Vulnerability to Sleep Deprivation":"Un sistema de analítica visual de la vulnerabilidad individual a la privación de sueño",
    "Dataset":"Datos", "ds# · # people":"ds# · # personas", "Pipeline":"Pipeline", "avg. ref. · ICA · # × # s":"ref. prom. · ICA · # × # s",
    "Region":"Región", "Metric":"Métrica", "Electrode":"Electrodo", "None":"Ninguno", "Compare":"Comparar",
    "No comparison (#)":"Sin comparación (#)", "Women vs men (# and #)":"Mujeres vs hombres (# y #)", "Session order (# and #)":"Orden de sesión (# y #)",
    "Habitual sleep (PSQI) (# and #)":"Sueño habitual (PSQI) (# y #)", "Vulnerable vs rest (# and #)":"Vulnerables vs resto (# y #)",
    "Behavior (y)":"Conducta (y)", "PVT · median RT":"PVT · TR mediano", "PVT · lapses":"PVT · lapsos", "PVT · RT variability":"PVT · variabilidad del TR",
    "KSS · sleepiness":"KSS · somnolencia", "SSS · sleepiness":"SSS · somnolencia", "PANAS · positive affect":"PANAS · afecto positivo", "PANAS · negative affect":"PANAS · afecto negativo",
    "Clear":"Limpiar", "Report":"Informe", "Guide":"Guía", "About":"Acerca de",
    "Vulnerability View":"Vista de vulnerabilidad", "Individual View":"Vista individual", "Topography View":"Vista de topografía", "Time View":"Vista de tiempo", "Validation Panel":"Panel de validación",
    "Δθ vs. Δ behavior":"Δθ vs. Δ conducta", "Spearman ρ = # [#, #], n = #":"ρ de Spearman = # [#, #], n = #", "vulnerable":"vulnerable",
    "Δ PVT, median reaction time (ms)":"Δ PVT, tiempo de reacción mediano (ms)", "Δ{S}θ frontal, Deprivation − Normal":"Δ{S}θ frontal, Privación − Normal",
    "Δ{S}θ centrotemporal, Deprivation − Normal":"Δ{S}θ centrotemporal, Privación − Normal", "Δ{S}θ Deprivation − Normal":"Δ{S}θ Privación − Normal",
    "Δ{S}θ at {E}, Deprivation − Normal":"Δ{S}θ en {E}, Privación − Normal", "Δ{S}θ frontal, #–# s, Deprivation − Normal":"Δ{S}θ frontal, #–# s, Privación − Normal",
    "Δ PVT, lapses (count)":"Δ PVT, lapsos (número)", "Δ PVT, SD of reaction time (ms)":"Δ PVT, DE del tiempo de reacción (ms)",
    "Δ KSS, sleepiness (points)":"Δ KSS, somnolencia (puntos)", "Δ SSS, sleepiness (points)":"Δ SSS, somnolencia (puntos)", "Δ PANAS+ (points)":"Δ PANAS+ (puntos)", "Δ PANAS− (points)":"Δ PANAS− (puntos)",
    "Relative θ = #–# Hz power divided by #–# Hz power (unitless); {S}θ is its standard deviation across the # #-s epochs and {S}θ its mean.":"θ relativa = potencia de #–# Hz dividida por la de #–# Hz (sin unidades); σθ es su desviación estándar entre las # épocas de # s y μθ su media.",
    "θ maps · q < #: {S}θ #, {S}θ # of # electrodes":"Mapas θ · q < #: {S}θ #, {S}θ # de # electrodos", "Normal":"Normal", "Deprivation":"Privación",
    "SD across epochs":"DE entre épocas", "Δ SD across epochs":"Δ DE entre épocas", "fraction of #–# Hz":"fracción de #–# Hz", "Δ fraction of #–# Hz":"Δ fracción de #–# Hz",
    "Moving {S}θ, #-s windows · frontal":"{S}θ móvil, ventanas de # s · frontal", "Moving {S}θ, #-s windows · centrotemporal":"{S}θ móvil, ventanas de # s · centrotemporal",
    "Moving {S}θ, #-s windows · electrode {E}":"{S}θ móvil, ventanas de # s · electrodo {E}", "Moving {S}θ, #-s windows · frontal, #–# s":"{S}θ móvil, ventanas de # s · frontal, #–# s",
    "Moving {S}θ, #-s windows · frontal · your selection":"{S}θ móvil, ventanas de # s · frontal · tu selección",
    "Relative θ per epoch · frontal":"θ relativa por época · frontal", "relative":"θ relativa", "θ power":"potencia θ", "moving {S}θ":"{S}θ móvil", "(SD within # s)":"(DE en # s)",
    "Δ moving {S}θ":"Δ {S}θ móvil", "(SD − NS)":"(SD − NS)",
    "Click to minimize · drag to move":"Clic para minimizar · arrastra para mover", "Normal Sleep":"Sueño normal", "Sleep Deprivation":"Privación de sueño", "trend":"tendencia",
    "Oscillatory & aperiodic components":"Componentes oscilatorios y aperiódicos", "#/f fit":"ajuste #/f", "Zoom into θ (#–# Hz)":"Ampliar θ (#–# Hz)", "log₁₀ power":"potencia log₁₀",
    "Δ exponent":"Δ exponente", "# to #":"# a #", "Δ offset":"Δ desplazamiento", "Δ{S}θ frontal (relative θ)":"Δ{S}θ frontal (θ relativa)", "Δ{S}θ centrotemporal (relative θ)":"Δ{S}θ centrotemporal (θ relativa)", "Δ{S}θ periodic":"Δ{S}θ periódica",
    "Blink effects on θ variability":"Efecto de los parpadeos en la variabilidad θ", "θ synchrony between regions":"Sincronía θ entre regiones", "Similarity between people":"Similitud entre personas",
    // attributes
    "What everything was computed from: theta band #–# Hz as a fraction of #–# Hz power (Welch); average reference; ICA (ocular and muscle components removed); # #-s epochs per recording, those above # µV rejected; eyes open. Click: full method in About.":"De qué se calculó todo: banda theta #–# Hz como fracción de la potencia de #–# Hz (Welch); referencia promedio; ICA (componentes oculares y musculares eliminados); # épocas de # s por registro, rechazadas las que superan # µV; ojos abiertos. Clic: método completo en Acerca de.",
    "Controls":"Controles", "EEG region":"Región del EEG", "Theta metric":"Métrica theta", "Electrode on the x-axis instead of the region":"Electrodo en el eje x en lugar de la región",
    "Remove the time window from the x-axis":"Quitar la ventana de tiempo del eje x", "Compare two groups":"Comparar dos grupos", "Behavioral marker on the Y-axis":"Marcador conductual en el eje Y",
    "Step-by-step guide to the tool":"Guía paso a paso de la herramienta", "Swap columns":"Intercambiar columnas", "Copy a link to this exact view":"Copiar un enlace a esta vista exacta",
    "Dark theme":"Tema oscuro", "Light theme":"Tema claro", "Switch to dark theme":"Cambiar a tema oscuro", "Switch to light theme":"Cambiar a tema claro", "Chart details":"Detalles del gráfico",
    "Save this view as PNG (Shift+click: SVG)":"Guardar esta vista como PNG (Mayús + clic: SVG)", "Save view as image":"Guardar la vista como imagen", "Expand (Esc to close)":"Ampliar (Esc para cerrar)",
    "Expand view":"Ampliar vista", "Restore view":"Restaurar vista", "Restore (Esc)":"Restaurar (Esc)",
    "Scatter of the theta change against the behavioral marker; the data are listed in About":"Dispersión del cambio de theta frente al marcador conductual; los datos están en Acerca de",
    "Heatmap of # electrodes by # people with their {S}θ change":"Mapa de calor de # electrodos por # personas con su cambio en {S}θ",
    "#–# s · #-epoch window":"#–# s · ventana de # épocas", "Play the five minutes: the maps evolve and the dot follows in the Time View":"Reproducir los cinco minutos: los mapas evolucionan y la bolita lo sigue en la Vista de tiempo", "Pause":"Pausar", "Resume":"Reanudar", "Previous epoch (# s)":"Época anterior (# s)", "Next epoch (# s)":"Época siguiente (# s)", "Stop and return to the normal view":"Detener y volver a la vista normal",
    "Play the five minutes with a sliding #-s window: every view follows":"Reproducir los cinco minutos con una ventana deslizante de # s: todas las vistas lo siguen",
    // vista temporal: ventana, duración y serie (noviembre 2026)
    "Window":"Ventana", "Cluster channels":"Canales del clúster", "no test for single people":"sin prueba para personas sueltas", "no test for a selection":"sin prueba para una selección", "no test: groups defined by Δθ":"sin prueba: grupos definidos por Δθ", "in a cluster":"en un clúster", "cluster test p < #":"prueba de clústeres p < #", "cluster test p #":"prueba de clústeres p #", "cluster test p ≤ #":"prueba de clústeres p ≤ #", "cluster test n.s.":"prueba de clústeres n.s.", "q < #":"q < #", "uncorrected":"sin corregir", "Marks on the Δ maps":"Marcas en los mapas Δ", "Window length":"Duración de la ventana", "# s":"# s", "Series":"Serie",
    "#-s window (# epochs; {S}θ only)":"Ventana de # s (# épocas; solo {S}θ)", "#-s window (# epochs)":"Ventana de # s (# épocas)",
    "Show the full series: Δ maps in non-overlapping blocks aligned with the Time View":"Ver la serie completa: mapas Δ en bloques sin solapamiento alineados con la Vista de tiempo",
    "Close the series":"Cerrar la serie", "Close the series to play":"Cierra la serie para reproducir", "Back to the full recording":"Volver al registro completo",
    "Window #–# s · # s · exploratory, not corrected across time · ":"Ventana #–# s · # s · exploratorio, sin corrección entre ventanas · ",
    "Playing · window #–# s · # s · ":"Reproduciendo · ventana #–# s · # s · ",
    "Series · # blocks of # s · FDR across blocks × electrodes · ":"Serie · # bloques de # s · FDR entre bloques × electrodos · ",
    "Series · # blocks of # s · ":"Serie · # bloques de # s · ",
    "θ series · # blocks of # s":"Serie θ · # bloques de # s", "θ maps · window #–# s":"Mapas θ · ventana #–# s", "# epochs":"# épocas",
    "#–# s · click to open this block as a window":"#–# s · clic para abrir este bloque como ventana",
    "Click the chart to show a window of the chosen length (Window: #, # or # s) on the maps; drag to set your own interval. Shorter windows follow faster changes but are noisier; {S}θ needs at least # s (# epochs). Clear returns to the full five minutes.":"Haz clic en el gráfico para ver en los mapas una ventana de la duración elegida (Ventana: #, # o # s); arrastra para fijar tu propio intervalo. Las ventanas cortas siguen cambios más rápidos pero son más ruidosas; {S}θ necesita al menos # s (# épocas). Limpiar vuelve a los cinco minutos completos.",
    "On scatter":"Sobre el scatter", "Network":"Red", "Layout":"Disposición",
    "On scatter: each person sits where they are in the Vulnerability View. Network: layout by similarity (drag nodes, wheel to zoom). Click a person to select it (Shift+click for A/B). Not functional connectivity: it compares people, not electrodes.":"Sobre el scatter: cada persona está donde está en la Vista de vulnerabilidad. Red: disposición por similitud (arrastra los nodos, la rueda acerca). Haz clic en una persona para elegirla (Mayús + clic para A/B). No es conectividad funcional: compara personas, no electrodos.",
    "Play through the recording":"Reproducir el registro", "Play the five minutes (follow it in the Time View)":"Reproducir los cinco minutos (síguelo en la Vista de tiempo)", "Play the five minutes":"Reproducir los cinco minutos", "Stop":"Detener",
    "Topomap matrix: columns NS, SD and Δ; rows {S}θ and {S}θ":"Matriz de topomapas: columnas NS, SD y Δ; filas {S}θ y {S}θ",
    "Topomap matrix: columns NS, SD and Δ; rows {G} (#) and {G} (#)":"Matriz de topomapas: columnas NS, SD y Δ; filas {G} (#) y {G} (#)",
    "Topomap matrix: columns NS, SD and Δ; rows {P} and {P}":"Matriz de topomapas: columnas NS, SD y Δ; filas {P} y {P}",
    "Moving {S}θ in #-s windows, NS and SD, mean and standard error of the active group":"σθ móvil en ventanas de # s, NS y SD, media y error estándar del grupo activo",
    "Theta power per epoch, NS and SD, mean and standard error of the active group":"Potencia theta por época, NS y SD, media y error estándar del grupo activo",
    "Legend: Normal Sleep, n = #; Sleep Deprivation, n = #; trend. Enter minimizes it; arrow keys move it":"Leyenda: Sueño normal, n = #; Privación de sueño, n = #; tendencia. Intro la minimiza; las flechas la mueven",
    "Legend: {G}, n = #; {G}, n = #; trend. Enter minimizes it; arrow keys move it":"Leyenda: {G}, n = #; {G}, n = #; tendencia. Intro la minimiza; las flechas la mueven",
    "Legend: {G}; {G}. Enter minimizes it; arrow keys move it":"Leyenda: {G}; {G}. Intro la minimiza; las flechas la mueven",
    "Legend: your selection. Enter minimizes it; arrow keys move it":"Leyenda: tu selección. Intro la minimiza; las flechas la mueven",
    "Legend: ρ #; R² #; n #. Enter minimizes it; arrow keys move it":"Leyenda: ρ #; R² #; n #. Intro la minimiza; las flechas la mueven",
    "Secondary views":"Vistas secundarias", "Collapse secondary views":"Plegar las vistas secundarias", "Show secondary views":"Mostrar las vistas secundarias",
    "Spectrum with aperiodic fit, change in exponent and offset per electrode, and theta variability against its periodic part":"Espectro con ajuste aperiódico, cambio de exponente y desplazamiento por electrodo, y variabilidad theta frente a su parte periódica",
    "Blink rate per person in NS and SD, and theta variability with and without blink-contaminated windows":"Tasa de parpadeos por persona en NS y SD, y variabilidad theta con y sin ventanas contaminadas por parpadeos",
    "Change in theta synchrony between # scalp regions":"Cambio en la sincronía theta entre # regiones del cuero cabelludo",
    "Similarity graph of # people: each one joined to the # with the most alike pattern of change":"Grafo de similitud de # personas: cada una unida a las # con el patrón de cambio más parecido",
    // panel notes (info tooltips)
    "One point per person: Δθ (deprivation − normal) vs. Δ of the behavioral marker. Shaded: vulnerable quadrant (both above the median).":"Un punto por persona: Δθ (privación − normal) frente al Δ del marcador conductual. Sombreado: cuadrante vulnerable (ambos por encima de la mediana).",
    "Legend box: comparison groups and your selection (drag to move, click to minimize). Click: select a person; drag: lasso.":"Cuadro de leyenda: grupos de comparación y tu selección (arrastra para mover, clic para minimizar). Clic: elegir una persona; arrastrar: lazo.",
    "Δ{S}θ (deprivation − normal) per person (columns) and electrode (rows, front to back). Groups are defined by behavior only, not by theta.":"Δ{S}θ (privación − normal) por persona (columnas) y electrodo (filas, de adelante hacia atrás). Los grupos se definen solo por conducta, no por theta.",
    "C(e): share of the group whose Δ rises minus share whose Δ falls (# to #). Click a column to select a person; click a row to put that electrode on the scatter x-axis.":"C(e): proporción del grupo cuyo Δ sube menos la de quienes bajan (# a #). Haz clic en una columna para elegir a una persona; en una fila, para llevar ese electrodo al eje x del gráfico de dispersión.",
    "{S}θ: SD of relative θ (#–# / #–# Hz) across #-s epochs; {S}θ: its mean. Δ = deprivation − normal. v# interpolation (EEGLAB, FieldTrip).":"σθ: DE de la θ relativa (#–# / #–# Hz) entre épocas de # s; μθ: su media. Δ = privación − normal. Interpolación v# (EEGLAB, FieldTrip).",
    "Paired t-test per electrode (n = #). Ring: p < # ({S}θ #, {S}θ #); dot: FDR q < # (#).":"Prueba t pareada por electrodo (n = #). Anillo: p < # (σθ #, μθ #); punto: FDR q < # (#).",
    "SD of regional relative θ in #-s windows (# epochs), mean ± SE across people. Deprivation > normal in # of # windows.":"DE de la θ relativa regional en ventanas de # s (# épocas), media ± EE entre personas. Privación > normal en # de # ventanas.",
    "SD of regional relative θ in #-s windows (# epochs), mean ± SE across people. Deprivation > normal in # of # windows; mean Δ #.":"DE de la θ relativa regional en ventanas de # s (# épocas), media ± EE entre personas. Privación > normal en # de # ventanas; Δ medio #.",
    "Regional relative θ per #-s epoch, mean ± SE across people. Deprivation > normal in # of # epochs.":"θ relativa regional por época de # s, media ± EE entre personas. Privación > normal en # de # épocas.",
    "Shaded band: ± SE; dashed line: linear trend. Legend box: drag to move it, click to minimize it.":"Banda sombreada: ± EE; línea discontinua: tendencia lineal. Cuadro de leyenda: arrástralo para moverlo, haz clic para minimizarlo.",
    "Choose an electrode in the header (or click one on a map or a heatmap row) to see its own series. Rejected epochs (> # µV) are gaps; drag to set a time window for the scatter.":"Elige un electrodo en la cabecera (o haz clic en uno de un mapa o de una fila del mapa de calor) para ver su propia serie. Las épocas rechazadas (> # µV) son huecos; arrastra para fijar una ventana de tiempo para el gráfico de dispersión.",
    "Series of electrode {E}: noisier than a region and on a larger scale (a region averages #–# electrodes). Set the Electrode selector in the header back to None to return to the region. Rejected epochs (> # µV) are gaps; drag to set a time window for the scatter.":"Serie del electrodo {E}: más ruidosa que una región y en una escala mayor (una región promedia #–# electrodos). Vuelve el selector Electrodo de la cabecera a Ninguno para regresar a la región. Las épocas rechazadas (> # µV) son huecos; arrastra para fijar una ventana de tiempo para el gráfico de dispersión.",
    "specparam (Bai et al., # settings). Aperiodic change: exponent d_z = # (p = #), offset d_z = # (p = #); #% of electrodes have a #–# Hz peak.":"specparam (Bai et al., # ajustes). Cambio aperiódico: exponente d_z = # (p = #), desplazamiento d_z = # (p = #); el #% de los electrodos tiene un pico de #–# Hz.",
    "Bottom: each person's Δ{S}θ (relative θ) vs. Δ{S}θ of the periodic component (#/f removed), frontal. n = #: people with at least # well-fitted epochs (R² ≥ #) in each session.":"Abajo: Δσθ de cada persona (θ relativa) frente al Δσθ del componente periódico (sin #/f), frontal. n = #: personas con al menos # épocas bien ajustadas (R² ≥ #) en cada sesión.",
    "Bottom: each person's Δ{S}θ (relative θ) vs. Δ{S}θ of the periodic component (#/f removed), centrotemporal. n = #: people with at least # well-fitted epochs (R² ≥ #) in each session.":"Abajo: Δσθ de cada persona (θ relativa) frente al Δσθ del componente periódico (sin #/f), centrotemporal. n = #: personas con al menos # épocas bien ajustadas (R² ≥ #) en cada sesión.",
    "Spearman ρ = #: both rank people alike, so the {S}θ change is mostly oscillatory. R² = #: share of the Δ{S}θ variance explained (linearly) by the change in epoch-to-epoch variability of the aperiodic exponent.":"ρ de Spearman = #: ambos ordenan igual a las personas, así que el cambio en σθ es sobre todo oscilatorio. R² = #: parte de la varianza de Δσθ explicada (linealmente) por el cambio en la variabilidad entre épocas del exponente aperiódico.",
    "Blinks do not drive {S}θ: ρ = # without them":"Los parpadeos no explican {S}θ: ρ = # sin ellos", "frontal; n = #":"frontal; n = #", "centrotemporal; n = #":"centrotemporal; n = #",
    "Blinks per minute ({E}/{E})":"Parpadeos por minuto ({E}/{E})", "median # → #":"mediana # → #", "Δ{S}θ frontal: with vs without blinks":"Δ{S}θ frontal: con vs sin parpadeos", "Δ{S}θ centrotemporal: with vs without blinks":"Δ{S}θ centrotemporal: con vs sin parpadeos",
    "Δ{S}θ, all #-s windows":"Δ{S}θ, todas las ventanas de # s", "Δ{S}θ, blink windows removed":"Δ{S}θ, sin ventanas con parpadeos", "ρ = # · n = # · dashed: identity":"ρ = # · n = # · discontinua: identidad",
    "Blinks detected on {E}/{E} of the raw EEG; rate # → #/min (p = #). Δblinks vs Δ{S}θ: ρ = #.":"Parpadeos detectados en {E}/{E} del EEG crudo; tasa # → #/min (p = #). Δparpadeos frente a Δ{S}θ: ρ = #.",
    "Bottom: Δ{S}θ from #-s windows, all (x) vs. without those within # s of a blink (y). On the identity line: blinks left after ICA do not change {S}θ.":"Abajo: Δσθ de ventanas de # s, todas (x) frente a sin las que están a menos de # s de un parpadeo (y). Sobre la línea de identidad: los parpadeos que quedan tras el ICA no cambian σθ.",
    "θ synchrony: lower in # of # pairs":"Sincronía θ: menor en # de # pares", "none survives FDR; n = #":"ninguno sobrevive a FDR; n = #", "# less":"# menos", "more #":"más #",
    "Δ wPLI² (SD − NS); thick line: uncorrected p < #":"Δ wPLI² (SD − NS); línea gruesa: p sin corregir < #", "Effect per pair: mean Δ ± #% CI":"Efecto por par: Δ medio ± IC del #%", "# region pairs, sorted by Δ":"# pares de regiones, ordenados por Δ",
    "Debiased wPLI², #–# Hz, average reference, # regions (# pairs). Global d_z = #, permutation p = #; no pair survives FDR.":"wPLI² sin sesgo, #–# Hz, referencia promedio, # regiones (# pares). d_z global = #, p por permutación = #; ningún par sobrevive a FDR.",
    "Bottom: mean Δ per pair with #% CI, sorted. Exploratory: resting theta connectivity may partly reflect aperiodic activity.":"Abajo: Δ medio por par con IC del #%, ordenado. Exploratorio: la conectividad theta en reposo puede reflejar en parte actividad aperiódica.",
    "Data: tools/build_secondary.py from the raw EEG (ds#).":"Datos: tools/build_secondary.py a partir del EEG crudo (ds#).",
    // similarity graph
    "{G}: not a group":"{G}: no forman un grupo", "{G}: alike":"{G}: se parecen entre sí", "#/# neighbors in-group, chance ≈ #":"#/# vecinos del mismo grupo, azar ≈ #", "# most alike":"# más parecidos", "Group":"Agrupar", "# people":"# personas",
    "Each person is joined to the # people whose pattern of Δ{S}θ over the # electrodes is most alike (Pearson r). Groups come from behavior only, not from theta.":"Cada persona se une a las # personas cuyo patrón de Δ{S}θ en los # electrodos es más parecido (r de Pearson). Los grupos vienen solo de la conducta, no de theta.",
    "Mean similarity within {G}: r = #; {G} with {G}: r = #.":"Similitud media dentro de {G}: r = #; {G} con {G}: r = #.",
    "Drag nodes; wheel to zoom; click a person to select it (Shift+click for A/B). Not functional connectivity: it compares people, not electrodes.":"Arrastra los nodos; la rueda acerca; haz clic en una persona para elegirla (Mayús + clic para A/B). No es conectividad funcional: compara personas, no electrodos.",
    // composed titles by group
    "Δθ vs. Δ behavior: two groups":"Δθ vs. Δ conducta: dos grupos", "Δθ vs. Δ behavior: your selection":"Δθ vs. Δ conducta: tu selección",
    "{G}: Spearman ρ = # [#, #], n = #; {G}: Spearman ρ = # [#, #], n = #":"{G}: ρ de Spearman = # [#, #], n = #; {G}: ρ de Spearman = # [#, #], n = #",
    "θ topomaps: two groups":"Topomapas θ: dos grupos", "Classifier →":"Clasificador →", "Explorer":"Explorador", "Classifier":"Clasificador", "Open in Explorer →":"Abrir en Explorador →", "θ topomaps: crossover by session order":"Topomapas θ: diseño cruzado por orden de sesión", "c · deprivation, adjusted":"c · privación, ajustada", "π · 2nd − 1st visit":"π · 2.ª − 1.ª visita", "1st visit":"1.ª visita", "2nd visit":"2.ª visita", "Deprivation (c)":"Privación (c)", "Visit (π)":"Visita (π)", "θ topomaps: your selection":"Topomapas θ: tu selección", "θ topomaps: two people":"Topomapas θ: dos personas",
    "mean Δ{S}θ: {G} #, {G} #":"Δ{S}θ medio: {G} #, {G} #", "mean Δ{S}θ: {P} #, {P} #":"Δ{S}θ medio: {P} #, {P} #",
    "Δ moving {S}θ · frontal: two groups":"Δ {S}θ móvil · frontal: dos grupos", "Δ moving {S}θ · centrotemporal: two groups":"Δ {S}θ móvil · centrotemporal: dos grupos", "n = # and #":"n = # y #",
    "Both rows share the same scales. No per-electrode test.":"Ambas filas comparten las mismas escalas. Sin prueba por electrodo.",
    "Δ (deprivation − normal), mean ± SE per group: Δ > # in # ({G}) and # ({G}) of # windows.":"Δ (privación − normal), media ± EE por grupo: Δ > # en # ({G}) y # ({G}) de # ventanas.",
    "Drag over the chart to set a time window for the scatter.":"Arrastra sobre el gráfico para fijar una ventana de tiempo para el gráfico de dispersión.",
    "Δ{S}θ > # at # of # electrodes. No per-electrode test in subgroups.":"Δ{S}θ > # en # de # electrodos. Sin prueba por electrodo en subgrupos.",
    "Spectrum and maps: mean of your selection (#). The scatter always shows all #, with your selection ringed.":"Espectro y mapas: media de tu selección (#). El gráfico de dispersión muestra siempre a las #, con tu selección marcada.",
    "{G} (#)":"{G} (#)", "C̄ {G} # · {G} #":"C̄ {G} # · {G} #", "Your selection (#)":"Tu selección (#)", "your selection":"tu selección",
    // tooltips of marks
    "Deprivation − Normal":"Privación − Normal", "Normal sleep":"Sueño normal", "first (#)":"primero (#)", "woman":"mujer", "man":"hombre", "no data":"sin datos", "n/a":"n/d", "Participant":"Participante", "Sex":"Sexo", "Age":"Edad", "Profile":"Perfil",
    "95% CI of Δ":"IC 95 % de Δ", "95% CI":"IC 95 %", "Normal · Deprivation":"Normal · Privación", "Normal → Deprivation":"Normal → Privación", "blinks/min Normal → Deprivation":"parpadeos/min Normal → Privación",
    "wPLI² Normal → Deprivation":"wPLI² Normal → Privación", "Δ Deprivation − Normal":"Δ Privación − Normal", "Δ{S}θ (relative θ)":"Δ{S}θ (θ relativa)", "Δ{S}θ periodic":"Δ{S}θ periódica", "Δ{S}θ, all windows":"Δ{S}θ, todas las ventanas", "Δ{S}θ, without blinks":"Δ{S}θ, sin parpadeos",
    "d_z · p · q":"d_z · p · q", "p · q":"p · q", "mean Δ{S}θ":"Δ{S}θ medio",
  };
  // group names (also lower case) and how they read in Spanish
  const GL = {"Women":"Mujeres", "Men":"Hombres", "women":"mujeres", "men":"hombres", "Normal sleep first":"Sueño normal primero", "normal sleep first":"sueño normal primero",
    "Deprivation first":"Privación primero", "deprivation first":"privación primero", "Vulnerable":"Vulnerables", "vulnerable":"vulnerables", "Resilient":"Resilientes", "resilient":"resilientes",
    "Rest":"Resto", "rest":"resto", "Your selection":"Tu selección", "your selection":"tu selección"};
  const elecRe = () => (typeof ELEC !== "undefined" && ELEC.length ? ELEC.slice().sort((a, b) => b.length-a.length).join("|") : "Fp1");
  let RE = null;
  const rebuild = () => { RE = new RegExp(`(sub-\\d+)|(\\b(?:${elecRe()})\\b)|(\\b[Pp][Ss][Qq][Ii] [>≤] \\d+|\\b(?:Normal sleep first|normal sleep first|Deprivation first|deprivation first|Women|women|Men|men|Vulnerable|vulnerable|Resilient|resilient|Rest|rest|Your selection|your selection)\\b)|([σμ])(?=θ)|([−+-]?\\d+(?:[.,]\\d+)?)`, "g"); };

  const GRE = /\b[Pp][Ss][Qq][Ii] [>≤] #|\b(?:Normal sleep first|normal sleep first|Deprivation first|deprivation first|Women|women|Men|men|Vulnerable|vulnerable|Resilient|resilient|Rest|rest|Your selection|your selection)\b/g;
  const DD = {};
  Object.keys(D).forEach(k => { const kk = k.replace(GRE, "{G}"); if(kk !== "{G}") DD[kk] = D[k]; });   // a lone group name is translated by GL, not by the dictionary
  let RE0 = null;
  const rebuild0 = () => { RE0 = new RegExp(`(sub-\\d+)|(\\b(?:${elecRe()})\\b)|([σμ])(?=θ)|([−+-]?\\d+(?:[.,]\\d+)?)`, "g"); };
  const cache = new Map();
  function tr(raw){
    if(cache.has(raw)) return cache.get(raw);
    if(!RE) rebuild();
    const lead = raw.match(/^\s*/)[0], trail = raw.match(/\s*$/)[0], core = raw.trim();
    if(!core || !/[A-Za-zΔσθμρ]{2}/.test(core)){ cache.set(raw, raw); return raw; }
    const tok = {P:[], E:[], G:[], S:[], N:[]};
    const key = core.replace(/\s+/g, " ").replace(RE, (m, p, e, g, s, n) => {
      if(p){ tok.P.push(p); return "{P}"; } if(e){ tok.E.push(e); return "{E}"; } if(g){ tok.G.push(g); return "{G}"; }
      if(s){ tok.S.push(s); return "{S}"; } tok.N.push(n); return "#"; });
    // exact strings that differ only by a group name ("Women vs men (# and #)" / "Vulnerable vs rest (# and #)") are looked up first, group words intact
    if(!RE0) rebuild0();
    const t0 = {P:[], E:[], S:[], N:[]};
    const key0 = core.replace(/\s+/g, " ").replace(RE0, (m, p, e, sg, n) => { if(p){ t0.P.push(p); return "{P}"; } if(e){ t0.E.push(e); return "{E}"; } if(sg){ t0.S.push(sg); return "{S}"; } t0.N.push(n); return "#"; });
    if(D[key0] !== undefined){
      const ix = {P:0, E:0, S:0, N:0};
      const res0 = lead + D[key0].replace(/\{([PES])\}|#/g, (m, k) => { const kk = m === "#" ? "N" : k, v = t0[kk][ix[kk]++]; return v === undefined ? m : v; }) + trail;
      cache.set(raw, res0); return res0;
    }
    let out = DD[key];
    const used = out !== undefined;
    if(!used) out = key;
    const gi = {i:0}, take = k => { const v = tok[k][gi[k] = (gi[k] || 0)]; gi[k]++; return v; };
    // when a group token's original includes a number ("PSQI > 5") it is kept as written
    out = out.replace(/\{([PEGS])\}|#/g, (m, k) => {
      if(m === "#") return take("N");
      const v = take(k); if(v === undefined) return m;
      return k === "G" ? (GL[v] || v) : v;
    });
    if(!used && !tok.G.length){ cache.set(raw, raw); return raw; }   // nothing known: leave as is
    const res = lead + out + trail; cache.set(raw, res); return res;
  }

  // ---------------------------------------------------------------- DOM walk and observer
  const orig = new WeakMap(), wrote = new WeakMap(), origAttr = new WeakMap();
  const SKIP = n => { const p = n.parentNode; return !p || /^(SCRIPT|STYLE|TEXTAREA)$/.test(p.nodeName) || (p.closest && p.closest("[data-i18n-skip]")); };
  function doText(n){
    if(SKIP(n)) return;
    const cur = n.nodeValue;
    if(wrote.get(n) === cur) return;
    orig.set(n, cur);
    // idioma y luego banda (bandText en core.js); lo marcado data-theta-only conserva theta
    let t = window.LANG === "es" ? tr(cur) : cur;
    if(typeof bandText === "function" && !(n.parentNode.closest && n.parentNode.closest("[data-theta-only]"))) t = bandText(t);
    if(t !== cur){ wrote.set(n, t); n.nodeValue = t; }
  }
  const ATTRS = ["title", "aria-label"];
  function doAttrs(el){
    ATTRS.forEach(a => {
      const v = el.getAttribute && el.getAttribute(a); if(!v) return;
      const m = origAttr.get(el) || {}, last = m["w"+a];
      if(last === v) return;
      m[a] = v; origAttr.set(el, m);
      let t = window.LANG === "es" ? tr(v) : v;
      if(typeof bandText === "function" && !(el.closest && el.closest("[data-theta-only]"))) t = bandText(t);
      if(t !== v){ m["w"+a] = t; el.setAttribute(a, t); }
    });
  }
  function walk(root){
    if(root.nodeType === 3){ doText(root); return; }
    if(root.nodeType !== 1) return;
    doAttrs(root);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let n; while((n = w.nextNode())){ if(n.nodeType === 3) doText(n); else doAttrs(n); }
  }
  const mo = new MutationObserver(ms => {
    mo.disconnect();
    ms.forEach(m => {
      if(m.type === "childList") m.addedNodes.forEach(walk);
      else if(m.type === "characterData") doText(m.target);
      else if(m.type === "attributes") doAttrs(m.target);
    });
    watch();
  });
  const watch = () => mo.observe(document.body, {childList:true, subtree:true, characterData:true, attributes:true, attributeFilter:ATTRS});

  function restoreEN(){
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let n; while((n = w.nextNode())){
      if(n.nodeType === 3){ if(wrote.get(n) === n.nodeValue && orig.has(n)) n.nodeValue = orig.get(n); }
      else { const m = origAttr.get(n); if(m) ATTRS.forEach(a => { if(m["w"+a] && n.getAttribute(a) === m["w"+a]) n.setAttribute(a, m[a]); }); }
    }
  }

  // ---------------------------------------------------------------- About sheet (about.js builds both languages)
  function swapAbout(){ if(typeof renderAbout === "function") renderAbout(window.LANG); }

  // ---------------------------------------------------------------- the discreet switch
  function apply(redraw){
    document.documentElement.lang = window.LANG;
    mo.disconnect();
    restoreEN(); walk(document.body);   // vuelve al texto original y aplica idioma y banda
    swapAbout();
    watch();
    const b = $("langbtn"); if(b) b.innerHTML = window.LANG === "es" ? 'EN · <b>ES</b>' : '<b>EN</b> · ES';
    if(redraw && typeof drawAll === "function"){ cache.clear(); drawAll(); }
    if(typeof tour !== "undefined" && tour.refresh) tour.refresh();
  }
  function set(l){
    window.LANG = l; try{ localStorage.setItem("batimix-lang", l); }catch(e){}
    const u = new URLSearchParams(location.search); if(u.has("lang")){ u.delete("lang"); const s = u.toString(); try{ history.replaceState(null, "", location.pathname + (s ? "?"+s : "") + location.hash); }catch(e){} }
    apply(true);
  }
  const btn = document.createElement("button"); btn.id = "langbtn"; btn.type = "button"; btn.title = "Idioma / Language";
  btn.setAttribute("aria-label", "Language: English / Español"); document.body.appendChild(btn);
  btn.addEventListener("click", () => set(window.LANG === "es" ? "en" : "es"));
  const boot = setInterval(() => {
    if(!$("boot").classList.contains("done") || typeof P === "undefined" || !P.length) return;
    clearInterval(boot); rebuild(); rebuild0(); apply(window.LANG === "es");
  }, 150);
  btn.innerHTML = window.LANG === "es" ? 'EN · <b>ES</b>' : '<b>EN</b> · ES';
  window.i18n = {tr, set, refresh:() => apply(false)};
})();
