/* Guided tour ("Guide" button in the header). A step-by-step walkthrough, like a game tutorial: a spotlight glides from
   view to view and a card follows it, with chapters you can jump between. It follows the reading order of the tool
   (topography, vulnerability, individual, time, compare, validation) and then explains every control and interaction.
   The Classifier tab has its own walkthrough (CLS): the Guide button opens the one of the tab in view.
   Next / Back / Skip, arrow keys, Esc to leave. Nothing in the data changes: steps that need a view open (the similarity
   graph, the side panel) only open it. English and Spanish (window.LANG, set by i18n.js). */
const tour = (() => {
  const q = s => document.querySelector(s);
  const fld = id => () => $(id).closest(".fld") || $(id);
  // validación (17 nov 2026): cada verificación se abre en su propia ventana flotante; el paso la abre (o la trae al frente)
  const openSide = () => {};
  // la guía recuerda qué ventanas de validación abrió ella y las cierra al pasar a un paso que no las usa y al terminar;
  // las que abrió quien usa la app quedan como estaban
  const tourWins = new Set();
  const isWinOpen = id => { const s = $(id) && $(id).closest(".sec"); return !!s && s.dataset.open === "true"; };
  const openSec = id => Object.assign(() => { if(typeof openVal !== "function") return; if(!isWinOpen(id)) tourWins.add(id); openVal(id); }, {win:id});
  const closeTourWins = keep => { if(typeof closeVal !== "function") return;
    [...tourWins].forEach(id => { if(id !== keep){ if(isWinOpen(id)) closeVal(id); tourWins.delete(id); } }); };
  const secOf = id => () => ($(id) && $(id).closest(".sec")) || $("vlist");
  const CH = {
    en:{start:"Welcome", views:"The views", ctrl:"Controls", valid:"Validation", tips:"Tips"},
    es:{start:"Bienvenida", views:"Las vistas", ctrl:"Controles", valid:"Validación", tips:"Consejos"},
  };
  const UI = {
    en:{next:"Next", back:"Back", skip:"Skip", done:"Finish", close:"Close", hint:"← → to move · Esc to leave"},
    es:{next:"Siguiente", back:"Atrás", skip:"Saltar", done:"Terminar", close:"Cerrar", hint:"← → para moverte · Esc para salir"},
  };
  // c: chapter; el: target (none = centered card); before: open what the step needs; en / es: [title, text]
  const EXP = [
    {c:"start", en:["Welcome to BATIMIX", "One night without sleep does not affect everyone the same way. This short guide shows how to read the tool and what every control does. Use Next or the arrow keys; Skip leaves at any time."],
      es:["Bienvenida a BATIMIX", "Una noche sin dormir no afecta a todos por igual. Esta guía corta te muestra cómo leer la herramienta y qué hace cada control. Usa Siguiente o las flechas; Saltar sale en cualquier momento."]},
    {c:"start", en:["The reading order", "Read it in six moves:<ol><li><b>Topography</b>: where theta changes.</li><li><b>Vulnerability</b>: who changes most, and does it go with behavior.</li><li><b>Individual</b>: same pattern in everyone, or one each.</li><li><b>Time</b>: when within the five minutes.</li><li><b>Compare</b>: does it depend on who the person is.</li><li><b>Validation</b>: can we trust it.</li></ol>"],
      es:["El orden de lectura", "Léela en seis movimientos:<ol><li><b>Topografía</b>: dónde cambia theta.</li><li><b>Vulnerabilidad</b>: quién cambia más y si eso va con la conducta.</li><li><b>Individual</b>: el mismo patrón en todos, o uno cada uno.</li><li><b>Tiempo</b>: cuándo, dentro de los cinco minutos.</li><li><b>Comparar</b>: si depende de quién es la persona.</li><li><b>Validación</b>: si podemos confiar en el resultado.</li></ol>"]},
    {c:"views", el:() => q(".p-topo"), en:["1 · Topography View", "Each head is the scalp seen from above. Columns: Normal Sleep (NS), Sleep Deprivation (SD) and Δ (SD minus NS). Warm Δ means theta rose, cool that it fell. A ring marks p &lt; 0.05 at that electrode; a filled dot survives the false-discovery correction (FDR). The two rows are σθ (how erratic theta is) and μθ (its average level). Hover a head to read a value; click an electrode to follow it in the other views."],
      es:["1 · Vista de topografía", "Cada cabeza es el cuero cabelludo visto desde arriba. Columnas: Sueño normal (NS), Privación de sueño (SD) y Δ (SD menos NS). Un Δ cálido indica que theta subió; uno frío, que bajó. Un anillo marca p &lt; 0,05 en ese electrodo; un punto relleno sobrevive a la corrección por falsos descubrimientos (FDR). Las dos filas son σθ (qué tan irregular es theta) y μθ (su nivel medio). Pasa el cursor para leer un valor; haz clic en un electrodo para seguirlo en las otras vistas."]},
    {c:"views", el:() => $("playbtn"), en:["Play the five minutes", "By default every map shows the full five minutes. <b>Click</b> a moment in the Time View to see a window of the chosen length (Window: 32, 60 or 100 s); <b>Series</b> shows Δ maps in consecutive blocks aligned with the Time View, with FDR across blocks. The ▶ next to the title plays the whole tool through time with a sliding window of the chosen length. The maps evolve, a dot and a shaded band travel along the Time View, and the scatter, the heatmap and the similarity graph all recompute for that window. <b>Pause</b> to study a window (◀ ▶ move it one epoch, 4 s, at a time); <b>■</b> returns everything to normal."],
      es:["Reproduce los cinco minutos", "Por defecto los mapas muestran los cinco minutos completos. <b>Haz clic</b> en un momento de la Vista de tiempo para ver una ventana de la duración elegida (Ventana: 32, 60 o 100 s); <b>Serie</b> muestra mapas Δ en bloques consecutivos alineados con la Vista de tiempo, con FDR entre bloques. El ▶ junto al título reproduce toda la herramienta en el tiempo con una ventana deslizante de esa duración. Los mapas evolucionan, una bolita y una banda recorren la Vista de tiempo, y el gráfico de dispersión, el mapa de calor y el grafo de similitud se recalculan para esa ventana. <b>Pausa</b> para estudiar una ventana (◀ ▶ la mueven una época, 4 s, cada vez); <b>■</b> devuelve todo a la normalidad."]},
    {c:"views", el:() => q(".p-scatter"), en:["2 · Vulnerability View", "Every dot is a person. Horizontally, the change in frontal theta variability (Δσθ); vertically, the change in the behavior marker chosen in the header. The amber corner holds people above the median on both: the vulnerable quadrant. The box reports Spearman ρ, its 95% interval and n."],
      es:["2 · Vista de vulnerabilidad", "Cada punto es una persona. En horizontal, el cambio en la variabilidad frontal de theta (Δσθ); en vertical, el cambio en el marcador de conducta elegido en la cabecera. La esquina ámbar reúne a quienes superan la mediana en ambos: el cuadrante vulnerable. El recuadro da la ρ de Spearman, su intervalo al 95 % y n."]},
    {c:"views", el:() => q(".p-scatter"), en:["Selecting people", "<b>Click</b> a dot (or a heatmap column) to add or remove a person. <b>Drag a lasso</b> around several dots to select a group. <b>Shift+click</b> pins up to two people as A and B: the topography rows then show those two people side by side. Selected people are ringed in every view. <b>Clear</b> or <b>Esc</b> empties the selection."],
      es:["Seleccionar personas", "<b>Haz clic</b> en un punto (o en una columna del mapa de calor) para sumar o quitar a una persona. <b>Arrastra un lazo</b> alrededor de varios puntos para elegir un grupo. <b>Mayús + clic</b> fija hasta dos personas como A y B: las filas de topografía muestran entonces a esas dos personas lado a lado. Las personas elegidas se marcan con un anillo en todas las vistas. <b>Limpiar</b> o <b>Esc</b> vacía la selección."]},
    {c:"views", el:() => q(".p-heat"), en:["3 · Individual View", "One column per person, one row per electrode (front to back: Frontal, C-T, P). Color is Δ for the metric in the header. People are split by behavior only (More impaired vs Less impaired: worse or better than the median change of the behavioral marker), never by theta, so the comparison is not circular. They are not the vulnerable quadrant of the scatter, which also needs a high Δθ. The thin C(e) strip is the group's consistency: share of people whose Δ rises minus share whose Δ falls. If the more impaired group shared a signature, its columns would look alike. Click a row to put that electrode on the scatter x-axis."],
      es:["3 · Vista individual", "Una columna por persona y una fila por electrodo (de adelante hacia atrás: Frontal, C-T, P). El color es Δ de la métrica de la cabecera. Las personas se separan solo por conducta (Más deterioro frente a Menos deterioro: peor o mejor que la mediana del cambio en el marcador de conducta), nunca por theta, así que la comparación no es circular. No son el cuadrante vulnerable del gráfico de dispersión, que además exige un Δθ alto. La franja C(e) es la consistencia del grupo: proporción de personas cuyo Δ sube menos la de las que baja. Si el grupo con más deterioro compartiera una firma, sus columnas se parecerían. Haz clic en una fila para llevar ese electrodo al eje x del gráfico de dispersión."]},
    {c:"views", el:() => q(".p-dyn"), en:["4 · Time View", "Theta across the five minutes, NS against SD, mean ± standard error; dashed lines are linear trends. With σθ it shows moving σθ in windows of the chosen length (Window, 60 s by default); with μθ, theta per 4-s epoch. Click it to move the maps to that moment. Hover for exact values. Drag the legend box to move it, click it to minimize."],
      es:["4 · Vista de tiempo", "Theta a lo largo de los cinco minutos, NS frente a SD, media ± error estándar; las líneas discontinuas son tendencias lineales. Con σθ muestra σθ móvil en ventanas de la duración elegida (Ventana, 60 s por defecto); con μθ, theta por época de 4 s. Haz clic para llevar los mapas a ese momento. Pasa el cursor para ver valores exactos. Arrastra el cuadro de leyenda para moverlo; haz clic para minimizarlo."]},
    {c:"views", el:() => q(".p-dyn"), en:["Choose any interval", "Drag across the chart to pick your own interval. Not only the scatter: the maps, the heatmap and the similarity graph also show that interval. The chip in the header shows it; click the chip, or Clear, to go back."],
      es:["Elige cualquier intervalo", "Arrastra sobre el gráfico para elegir tu propio intervalo. No solo el gráfico de dispersión: los mapas, el mapa de calor y el grafo de similitud también muestran ese intervalo. La etiqueta de la cabecera lo indica; haz clic en ella, o en Limpiar, para volver."]},
    {c:"ctrl", el:fld("roiseg"), en:["Region", "Frontal (16 electrodes) or Centrotemporal (28): the region whose average feeds the scatter and the time view, as in Cui et al."],
      es:["Región", "Frontal (16 electrodos) o Centrotemporal (28): la región cuyo promedio alimenta el gráfico de dispersión y la vista de tiempo, como en Cui et al."]},
    {c:"ctrl", el:fld("metseg"), en:["Metric", "<b>σθ</b>: variability of theta across epochs. <b>μθ</b>: its mean level. It changes the scatter, heatmap and time view."],
      es:["Métrica", "<b>σθ</b>: variabilidad de theta entre épocas. <b>μθ</b>: su nivel medio. Cambia el gráfico de dispersión, el mapa de calor y la vista de tiempo."]},
    {c:"ctrl", el:fld("elsel"), en:["Electrode", "Use one electrode instead of the whole region on the scatter x-axis and the time view. Set it back to None to return to the region. Clicking an electrode on a map or a heatmap row does the same."],
      es:["Electrodo", "Usa un solo electrodo en lugar de toda la región en el eje x y en la vista de tiempo. Vuelve a Ninguno para regresar a la región. Hacer clic en un electrodo de un mapa o en una fila del mapa de calor hace lo mismo."]},
    {c:"ctrl", el:fld("cmpsel"), en:["5 · Compare", "Splits everyone into two groups (for example women vs men, session order, sleep-quality score, vulnerable vs rest). Every view repaints with two colors, and ρ is computed per group, so any difference shows up everywhere at once."],
      es:["5 · Comparar", "Divide a todos en dos grupos (por ejemplo mujeres frente a hombres, orden de sesión, calidad de sueño, vulnerables frente al resto). Todas las vistas se repintan con dos colores y ρ se calcula por grupo, así que cualquier diferencia aparece en todas partes a la vez."]},
    {c:"ctrl", el:fld("ysel"), en:["Behavior (Y)", "The behavioral marker on the scatter y-axis: reaction-time measures (PVT), sleepiness scales (KSS, SSS) and mood (PANAS). Everything is recomputed for the marker you choose."],
      es:["Conducta (Y)", "El marcador conductual del eje y: medidas de tiempo de reacción (PVT), escalas de somnolencia (KSS, SSS) y estado de ánimo (PANAS). Todo se recalcula para el marcador elegido."]},
    {c:"ctrl", el:() => $("resetbtn"), en:["Clear", "Removes the selection, the time window and the comparison, and returns to the default view. Esc does the same."],
      es:["Limpiar", "Quita la selección, la ventana de tiempo y la comparación, y vuelve a la vista por defecto. Esc hace lo mismo."]},
    {c:"ctrl", el:() => $("reportbtn"), en:["Report", "Downloads a printable report of the current state: each view as a figure with its reading."],
      es:["Informe", "Descarga un informe imprimible del estado actual: cada vista como figura, con su lectura."]},
    {c:"ctrl", el:() => $("aboutbtn"), en:["About", "Dataset, key findings, method, robustness, limitations, a glossary and the scatter data table. The pipeline chip next to the dataset name opens the method section."],
      es:["Acerca de", "Datos, hallazgos clave, método, robustez, limitaciones, un glosario y la tabla de datos del gráfico. La etiqueta de pipeline junto al nombre del conjunto abre la sección de método."]},
    {c:"ctrl", el:() => $("swapbtn"), en:["Layout and theme", "⇄ swaps the two side columns (controls and people). ◐ switches between the light and the dark theme."],
      es:["Diseño y tema", "⇄ intercambia las dos columnas laterales (controles y personas). ◐ alterna entre el tema claro y el oscuro."]},
    {c:"ctrl", el:() => q(".topbar .vtabs"), en:["Explorer and Classifier", "Two tabs at the top. <b>Explorer</b> is this view. <b>Classifier</b> shows which EEG features tell the night without sleep apart, with explainable models. Switching tabs keeps your selection."],
      es:["Explorador y Clasificador", "Dos pestañas arriba. <b>Explorador</b> es esta vista. <b>Clasificador</b> muestra qué rasgos del EEG distinguen la noche sin dormir, con modelos explicables. Cambiar de pestaña conserva tu selección."]},
    {c:"ctrl", el:() => $("linkbtn"), en:["Share this exact view", "The link button copies a URL that stores region, metric, marker, electrode, comparison, time window and selection. Paste it in a slide or a message and it opens exactly what you were looking at."],
      es:["Comparte esta vista exacta", "El botón de enlace copia una URL que guarda región, métrica, marcador, electrodo, comparación, ventana de tiempo y selección. Pégala en una diapositiva o un mensaje y abrirá exactamente lo que estabas viendo."]},
    {c:"valid", el:() => $("vlist").closest(".valsum"), en:["6 · Validation", "Checks that try to break the finding, each with its key figure. Click a row to open its chart in a floating window: move it by its title, resize it from the corner, open several at once; × or Esc closes it."],
      es:["6 · Validación", "Comprobaciones que intentan romper el hallazgo, cada una con su cifra clave. Haz clic en una fila para abrir su gráfico en una ventana flotante: muévela por su título, cámbiale el tamaño desde la esquina, abre varias a la vez; × o Esc la cierra."]},
    {c:"valid", el:secOf("b-aper"), before:openSec("b-aper"), en:["Oscillation or 1/f?", "Is the effect a real rhythm or the spectral background? The top chart is the spectrum with its 1/f fit (click the gray θ band to zoom into 4–8 Hz). Below: maps of the change in exponent and offset, and the scatter of Δσθ against its periodic part."],
      es:["¿Oscilación o 1/f?", "¿El efecto es un ritmo real o el fondo espectral? El gráfico superior es el espectro con su ajuste 1/f (haz clic en la banda gris θ para ampliar 4–8 Hz). Debajo: mapas del cambio en exponente y desplazamiento, y la dispersión de Δσθ frente a su parte periódica."]},
    {c:"valid", el:secOf("b-eye"), before:openSec("b-eye"), en:["Blinks and synchrony", "<b>Blink effects</b>: whether eye blinks left after cleaning could explain Δσθ. <b>θ synchrony</b> (next row of the table): how theta phase locks between brain regions, with the effect and its 95% interval for each pair."],
      es:["Parpadeos y sincronía", "<b>Efecto de parpadeos</b>: si los parpadeos que quedan tras la limpieza podrían explicar Δσθ. <b>Sincronía θ</b> (fila siguiente de la tabla): cómo se acopla la fase de theta entre regiones del cerebro, con el efecto y su intervalo al 95 % para cada par."]},
    {c:"valid", el:secOf("b-graph"), before:openSec("b-graph"), en:["Similarity between people", "Each person is linked to the three whose pattern of change is most alike. <b>On scatter</b> places everyone where they are in the Vulnerability View, so you read the network against that chart; <b>Network</b> arranges them by similarity (drag nodes, scroll to zoom, <b>Group</b> pulls the groups apart). Hover a person to light up their neighbors everywhere. It follows the playback and any interval you choose. If the vulnerable people formed a cluster they would sit together; here they do not."],
      es:["Similitud entre personas", "Cada persona se une a las tres cuyo patrón de cambio es más parecido. <b>Sobre el scatter</b> coloca a todos donde están en la Vista de vulnerabilidad, así que lees la red contra ese gráfico; <b>Red</b> los ordena por similitud (arrastra nodos, rueda para acercar, <b>Agrupar</b> separa los grupos). Pasa el cursor sobre una persona para iluminar a sus vecinos en todas partes. Sigue la reproducción y cualquier intervalo que elijas. Si las personas vulnerables formaran un grupo, estarían juntas; aquí no."]},
    {c:"tips", el:() => q(".p-topo .vx"), en:["Expand any view", "Every view has a ⤢ button to enlarge it to almost full screen. Click it again, the background or Esc to go back."],
      es:["Amplía cualquier vista", "Cada vista tiene un botón ⤢ para ampliarla casi a pantalla completa. Haz clic de nuevo, en el fondo o pulsa Esc para volver."]},
    {c:"tips", el:() => q(".p-topo .vexp"), en:["Save a view as an image", "The ↓ button saves the view as a PNG in the light theme, with its title and current settings. Shift+click saves an SVG, ready for a paper or a slide."],
      es:["Guarda una vista como imagen", "El botón ↓ guarda la vista como PNG en tema claro, con su título y la configuración actual. Mayús + clic guarda un SVG, listo para un artículo o una diapositiva."]},
    {c:"tips", el:() => q(".p-topo .info") || q(".p-topo"), en:["Details on demand", "The small <b>i</b> next to a title shows what the chart is and how to read it. Hover or click it."],
      es:["Detalles a demanda", "La pequeña <b>i</b> junto a un título muestra qué es el gráfico y cómo leerlo. Pasa el cursor o haz clic."]},
    {c:"tips", en:["You are ready", "Start by looking at the maps, then ask who, where and when. You can reopen this guide any time with the <b>Guide</b> button."],
      es:["Todo listo", "Empieza mirando los mapas y pregunta quién, dónde y cuándo. Puedes reabrir esta guía cuando quieras con el botón <b>Guía</b>."]},
  ];

  // pestaña Classifier: su propio recorrido (mismos capítulos). No cambia el estado del modelo; solo señala vistas y controles
  const CLS = [
    {c:"start", en:["The Classifier", "Can the resting EEG tell the night without sleep apart, and which properties, regions and bands carry that? This tab answers it with explainable models trained on the 136 recordings of the 68 people. Every number is <b>out of fold</b>: the model never saw the person it is scoring."],
      es:["El Clasificador", "¿Puede el EEG en reposo distinguir la noche sin dormir, y qué propiedades, regiones y bandas lo hacen? Esta pestaña lo responde con modelos explicables entrenados con las 136 grabaciones de las 68 personas. Cada número es <b>fuera de pliegue</b>: el modelo nunca vio a la persona que está evaluando."]},
    {c:"start", en:["The reading order", "<ol><li><b>Result</b>: does it work at all (AUC, pair accuracy).</li><li><b>Validation</b>: is it deprivation and not the second visit.</li><li><b>Feature groups</b>: which band, region and kind of feature matter.</li><li><b>Features</b>: how single features push the decision.</li><li><b>Records</b> and <b>Person</b>: who is classified well, who is not, and why.</li></ol>"],
      es:["El orden de lectura", "<ol><li><b>Resultado</b>: si funciona (AUC, acierto por pares).</li><li><b>Validación</b>: si es privación y no la segunda visita.</li><li><b>Grupos de rasgos</b>: qué banda, región y tipo de rasgo importan.</li><li><b>Rasgos</b>: cómo empuja la decisión cada rasgo.</li><li><b>Registros</b> y <b>Persona</b>: a quién clasifica bien, a quién no y por qué.</li></ol>"]},
    {c:"views", el:() => $("cards"), en:["Result", "<b>AUC</b>: how well the predicted probability ranks deprivation above normal sleep (0.50 = chance), with its range over 10 repetitions of the cross-validation. <b>Pair accuracy</b>: share of people whose deprivation recording gets the higher probability. When you brush records, a third row shows how many of yours are right."],
      es:["Resultado", "<b>AUC</b>: qué tan bien la probabilidad predicha ordena la privación por encima del sueño normal (0,50 = azar), con su rango en 10 repeticiones de la validación cruzada. <b>Acierto por pares</b>: proporción de personas cuya grabación con privación recibe la probabilidad más alta. Si seleccionas registros con el pincel, una tercera fila dice cuántos de los tuyos acierta."]},
    {c:"views", el:() => q(".ml-rec"), en:["Records View", "Each mark is one recording, placed by a PCA of its features: circle = normal sleep, diamond = deprivation (the true condition). The fill is the predicted probability of deprivation (blue low, pink high); an amber ring means the model got it wrong. A line joins each person's two recordings."],
      es:["Vista de registros", "Cada marca es una grabación, ubicada por un PCA de sus rasgos: círculo = sueño normal, rombo = privación (la condición real). El relleno es la probabilidad predicha de privación (azul baja, rosa alta); un anillo ámbar indica que el modelo se equivocó. Una línea une las dos grabaciones de cada persona."]},
    {c:"views", el:() => q(".ml-rec"), en:["Pick records", "<b>Click</b> a mark or a line to open that person in the Person panel. <b>Drag a rectangle</b> to brush a group: the others fade and the Result counts how many of yours are right. Click an empty spot to clear the brush."],
      es:["Elegir registros", "<b>Haz clic</b> en una marca o una línea para abrir a esa persona en el panel Persona. <b>Arrastra un rectángulo</b> para seleccionar un grupo: el resto se atenúa y el Resultado cuenta cuántos de los tuyos acierta. Haz clic en un lugar vacío para quitar la selección."]},
    {c:"views", el:() => q(".ml-imp"), en:["Feature groups", "Read this first. In each test fold, all features of a group (a band, a region, a kind of feature) are shuffled together and the drop in AUC is measured: the longer the bar, the more the model needs that group. Line = 95% range over folds and repeats. Groups are more stable than single features."],
      es:["Grupos de rasgos", "Léelo primero. En cada pliegue de prueba se barajan juntos todos los rasgos de un grupo (una banda, una región, un tipo de rasgo) y se mide cuánto cae el AUC: cuanto más larga la barra, más necesita el modelo ese grupo. Línea = rango del 95 % entre pliegues y repeticiones. Los grupos son más estables que los rasgos sueltos."]},
    {c:"views", el:() => q(".ml-feat"), en:["Features", "With <b>Logistic</b>: the standardized coefficient of each top feature (dot = mean over 50 fold models, line = 95% range, % = how often the penalty kept it). Pink pushes toward deprivation, blue toward normal sleep. With <b>EBM</b>: one shape curve per feature, showing how it adds to the decision along its values. Click a feature to see it in the Person panel."],
      es:["Rasgos", "Con <b>Logística</b>: el coeficiente estandarizado de cada rasgo principal (punto = media de 50 modelos de pliegue, línea = rango del 95 %, % = cuántas veces lo conservó la penalización). Rosa empuja hacia privación, azul hacia sueño normal. Con <b>EBM</b>: una curva de forma por rasgo, que muestra cómo suma a la decisión a lo largo de sus valores. Haz clic en un rasgo para verlo en el panel Persona."]},
    {c:"views", el:() => q(".ml-met"), en:["Model metrics", "Confusion matrix of the out-of-fold predictions (P(SD) ≥ 0.5 = predicted deprivation), averaged over the 10 repetitions. Rows are the true condition; the gray is the share of the row, with recall at the side. It follows the Order control."],
      es:["Métricas del modelo", "Matriz de confusión de las predicciones fuera de pliegue (P(SD) ≥ 0,5 = privación predicha), promediada en las 10 repeticiones. Las filas son la condición real; el gris es la proporción de la fila, con la sensibilidad al lado. Sigue el control Orden."]},
    {c:"views", el:() => q(".ml-person"), en:["Person", "Details on demand for the person you clicked: a waterfall per recording shows how each feature moved its score from the model's starting point to the final value (pink toward deprivation, blue toward normal sleep), using the model trained without that person. Under the name, the EEG quality of each recording (epochs kept, channels interpolated, blinks): rule out a noisy recording before reading an error as physiology."],
      es:["Persona", "Detalle a demanda de la persona en la que hiciste clic: una cascada por grabación muestra cuánto movió cada rasgo su puntaje desde el punto de partida del modelo hasta el valor final (rosa hacia privación, azul hacia sueño normal), con el modelo entrenado sin esa persona. Bajo el nombre, la calidad del EEG de cada grabación (épocas conservadas, canales interpolados, parpadeos): descarta un mal registro antes de leer un error como fisiología."]},
    {c:"ctrl", el:fld("scseg"), en:["Scenario", "<b>Paired</b>: given both recordings of a person, which one is after deprivation? Each person's two recordings are centered on their own mean, so the model only sees how the nights differ. <b>Strict</b>: a single recording from a person the model never saw; harder, and closer to a real test."],
      es:["Escenario", "<b>Pareado</b>: dadas las dos grabaciones de una persona, ¿cuál es tras la privación? Las dos grabaciones de cada persona se centran en su propia media, así que el modelo solo ve en qué difieren las noches. <b>Estricto</b>: una sola grabación de una persona que el modelo nunca vio; más difícil y más cercano a una prueba real."]},
    {c:"ctrl", el:fld("mdseg"), en:["Model", "<b>Logistic</b>: elastic-net logistic regression, one coefficient per feature. <b>EBM</b>: Explainable Boosting Machine, one curve per feature, so it can capture thresholds. Both are explainable by design; a black-box gradient boosting is kept only as a reference in Validation."],
      es:["Modelo", "<b>Logística</b>: regresión logística elastic-net, un coeficiente por rasgo. <b>EBM</b>: Explainable Boosting Machine, una curva por rasgo, así que puede captar umbrales. Ambos son explicables por diseño; un gradient boosting de caja negra se guarda solo como referencia en Validación."]},
    {c:"ctrl", el:fld("orseg"), en:["Order", "Half of the people slept normally first and half were deprived first. Filter Records and Model metrics by visit order to check that the result holds in both."],
      es:["Orden", "La mitad durmió normal primero y la otra mitad fue privada primero. Filtra Registros y Métricas del modelo por orden de visita para comprobar que el resultado se sostiene en ambos."]},
    {c:"ctrl", el:fld("shseg"), en:["Show", "<b>Errors</b> keeps only the recordings the model got wrong in Records: are they the same people, the same order, the same region of the map?"],
      es:["Mostrar", "<b>Errores</b> deja en Registros solo las grabaciones en las que el modelo se equivocó: ¿son las mismas personas, el mismo orden, la misma zona del mapa?"]},
    {c:"ctrl", el:fld("ffsel"), en:["Features filter", "Highlights one family (a band, the aperiodic 1/f part, or the TSFEL spectral or statistical features) in Feature groups, Features and Person; the rest fade. The model itself does not change."],
      es:["Filtro de rasgos", "Resalta una familia (una banda, la parte aperiódica 1/f, o los rasgos espectrales o estadísticos de TSFEL) en Grupos de rasgos, Rasgos y Persona; el resto se atenúa. El modelo no cambia."]},
    {c:"ctrl", el:() => q(".topbar .vtabs"), en:["Back to the Explorer", "The Explorer tab keeps its own state. Its Guide covers the maps, the scatter and the time view."],
      es:["Volver al Explorador", "La pestaña Explorador conserva su propio estado. Su Guía explica los mapas, el gráfico de dispersión y la vista de tiempo."]},
    {c:"valid", el:() => $("mlvlist"), en:["Validation", "Checks that try to break the classifier, always visible. Filled dot = the model, empty = the comparison, dotted line = chance (0.50). Hover a row for its full reading.<ul><li><b>Not the visit</b>: the same features predicting 2nd vs 1st visit should stay near chance.</li><li><b>Permutation</b>: AUC when NS and SD are swapped within each person (gray band) against the real one.</li><li><b>Visit order</b>: pair accuracy in each order.</li><li><b>Bands + 1/f</b>: band features alone and a black-box model.</li><li><b>Fidelity</b> and <b>Stability</b>: how far single features can be trusted.</li></ul>"],
      es:["Validación", "Comprobaciones que intentan romper el clasificador, siempre visibles. Punto lleno = el modelo, vacío = la comparación, línea punteada = azar (0,50). Pasa el cursor por una fila para leerla completa.<ul><li><b>No es la visita</b>: los mismos rasgos prediciendo 2.ª frente a 1.ª visita deberían quedar cerca del azar.</li><li><b>Permutación</b>: AUC al intercambiar NS y SD dentro de cada persona (banda gris) frente al real.</li><li><b>Orden de visita</b>: acierto por pares en cada orden.</li><li><b>Bandas + 1/f</b>: solo los rasgos de banda y un modelo de caja negra.</li><li><b>Fidelidad</b> y <b>Estabilidad</b>: cuánto se puede confiar en los rasgos sueltos.</li></ul>"]},
    {c:"valid", el:() => !$("warn").hidden && $("warn"), en:["A warning when it matters", "If the visit were predicted almost as well as the condition, a warning appears at the bottom: the model could be learning habituation, not deprivation."],
      es:["Un aviso cuando importa", "Si la visita se predijera casi tan bien como la condición, aparece un aviso abajo: el modelo podría estar aprendiendo la habituación y no la privación."]},
    {c:"tips", el:() => q(".ml-c .info") || q(".ml-rec"), en:["Details on demand", "The small <b>i</b> next to each title explains what the chart is and how to read it. Every mark has a tooltip."],
      es:["Detalles a demanda", "La pequeña <b>i</b> junto a cada título explica qué es el gráfico y cómo leerlo. Cada marca tiene su tooltip."]},
    {c:"tips", en:["Exploratory, not diagnostic", "136 recordings and 147 features: read groups before single features, and the validation before the score. You can reopen this guide any time with the <b>Guide</b> button."],
      es:["Exploratorio, no diagnóstico", "136 grabaciones y 147 rasgos: lee los grupos antes que los rasgos sueltos, y la validación antes que el puntaje. Puedes reabrir esta guía cuando quieras con el botón <b>Guía</b>."]},
  ];
  let STEPS = EXP;

  const lang = () => (window.LANG === "es" ? "es" : "en");
  let i = 0, on = false, shade, card, body, prevFocus = null, token = 0;

  function build(){
    shade = document.createElement("div"); shade.className = "tg-shade";
    card = document.createElement("div"); card.className = "tg-card"; card.setAttribute("role", "dialog"); card.setAttribute("aria-live", "polite"); card.tabIndex = -1;
    card.innerHTML = '<span class="tg-arrow"></span><div class="tg-chs"></div><div class="tg-body"></div><div class="tg-bar"><i></i></div><div class="tg-nav"></div>';
    body = card.querySelector(".tg-body");
    document.body.append(shade, card);
    card.addEventListener("click", e => {
      const a = e.target.closest("[data-a]"); if(a){ if(a.dataset.a === "next") go(i+1); else if(a.dataset.a === "back") go(i-1); else stop(); return; }
      const c = e.target.closest("[data-c]"); if(c) go(STEPS.findIndex(s => s.c === c.dataset.c));
    });
  }
  // La tarjeta nunca debe tapar lo que explica: se prueban posiciones alrededor del objetivo y en los bordes de la pantalla
  // y se elige la que menos lo cubre (si ninguna lo evita del todo, la menos mala y más cercana).
  function place(r){
    const m = 16, cw = card.offsetWidth, ch = card.offsetHeight, W = innerWidth, H = innerHeight, arrow = card.querySelector(".tg-arrow");
    arrow.style.display = "none";
    if(!r){ card.style.left = Math.max(m, (W-cw)/2)+"px"; card.style.top = Math.max(m, (H-ch)/2)+"px"; return; }
    const g = 14, cx = r.left+r.width/2, cy = r.top+r.height/2;
    const clampX = x => Math.max(m, Math.min(W-cw-m, x)), clampY = y => Math.max(m, Math.min(H-ch-m, y));
    const cand = [
      {side:"right", x:r.right+g+8, y:cy-ch/2}, {side:"left", x:r.left-g-8-cw, y:cy-ch/2},
      {side:"below", x:cx-cw/2, y:r.bottom+g+8}, {side:"above", x:cx-cw/2, y:r.top-g-8-ch},
      {side:null, x:W-cw-m, y:H-ch-m}, {side:null, x:m, y:H-ch-m}, {side:null, x:W-cw-m, y:m}, {side:null, x:m, y:m},
      {side:null, x:W-cw-m, y:cy-ch/2}, {side:null, x:m, y:cy-ch/2}, {side:null, x:cx-cw/2, y:H-ch-m}, {side:null, x:cx-cw/2, y:m}];
    const pad = 10, area = c => { const x = clampX(c.x), y = clampY(c.y);
      const ox = Math.max(0, Math.min(x+cw, r.right+pad)-Math.max(x, r.left-pad)), oy = Math.max(0, Math.min(y+ch, r.bottom+pad)-Math.max(y, r.top-pad));
      return {x, y, ov:ox*oy, d:Math.hypot(x+cw/2-cx, y+ch/2-cy)}; };
    const scored = cand.map(c => ({...c, ...area(c)}));
    // un lado con flecha solo vale si no se desplazó al ajustarlo a la pantalla
    scored.forEach(c => { if(c.side && (Math.abs(c.x-(c.side === "right" ? r.right+g+8 : c.side === "left" ? r.left-g-8-cw : c.x)) > 2 || Math.abs(c.y-(c.side === "below" ? r.bottom+g+8 : c.side === "above" ? r.top-g-8-ch : c.y)) > 2 && (c.side === "below" || c.side === "above"))) c.ov += 1e6; });
    scored.sort((p, q) => (p.ov-q.ov) || (p.d-q.d));
    const pick = scored[0];
    card.style.left = pick.x+"px"; card.style.top = pick.y+"px";
    if(pick.side && pick.ov === 0){
      arrow.style.display = "block"; arrow.dataset.side = pick.side;
      if(pick.side === "right" || pick.side === "left"){ arrow.style.top = Math.max(18, Math.min(ch-18, cy-pick.y))+"px"; arrow.style.left = ""; }
      else { arrow.style.left = Math.max(18, Math.min(cw-18, cx-pick.x))+"px"; arrow.style.top = ""; }
    }
  }
  function render(s, r){
    const L = lang(), U = UI[L], [t, x] = s[L];
    const chips = Object.keys(CH[L]).map(k => `<button type="button" class="tg-ch${k === s.c ? " on" : ""}" data-c="${k}">${CH[L][k]}</button>`).join("");
    card.querySelector(".tg-chs").innerHTML = chips;
    body.innerHTML = `<h3>${t}</h3><p>${x}</p>`;
    card.querySelector(".tg-bar i").style.width = ((i+1)/STEPS.length*100)+"%";
    const last = i === STEPS.length-1;
    card.querySelector(".tg-nav").innerHTML = `<button class="btn" data-a="skip" type="button">${last ? U.close : U.skip}</button><span class="tg-count">${i+1} / ${STEPS.length}</span>` +
      `${i ? `<button class="btn" data-a="back" type="button">${U.back}</button>` : ""}<button class="btn primary" data-a="next" type="button">${last ? U.done : U.next}</button>`;
  }
  function go(n){
    if(n < 0) n = 0;
    if(n >= STEPS.length){ stop(); return; }
    i = n; const s = STEPS[i], my = ++token;
    closeTourWins(s.before && s.before.win);   // ventanas de pasos anteriores: fuera, para que no tapen este paso
    // durante la guía solo se ve la ventana del paso actual; las que abrió quien usa la app se ocultan y vuelven al terminar
    document.body.classList.add("touring");
    document.querySelectorAll(".sidebox .sec").forEach(x => x.classList.toggle("tourcur", !!(s.before && s.before.win) && x.contains($(s.before.win))));
    if(s.before) s.before();
    const show = () => {
      if(!on || my !== token) return;
      const el = s.el && s.el(), r = el && el.getBoundingClientRect();
      const ok = r && r.width > 0 && r.height > 0;
      card.classList.add("swap");
      setTimeout(() => {
        if(!on || my !== token) return;
        render(s);
        if(ok){ const p = 7; shade.classList.remove("full"); Object.assign(shade.style, {left:r.left-p+"px", top:r.top-p+"px", width:r.width+2*p+"px", height:r.height+2*p+"px"}); }
        else { shade.classList.add("full"); Object.assign(shade.style, {left:"50%", top:"50%", width:"0px", height:"0px"}); }
        card.classList.add("show"); place(ok ? r : null); card.classList.remove("swap");
        const nb = card.querySelector('[data-a="next"]'); nb && nb.focus({preventScroll:true});
      }, 140);
    };
    setTimeout(show, s.before ? 420 : 0);
  }
  function start(){
    if(on) return; on = true;
    STEPS = document.body.classList.contains("tab-ml") ? CLS : EXP;   // la guía de la pestaña abierta
    prevFocus = document.activeElement; build();
    requestAnimationFrame(() => shade.classList.add("on"));
    go(0); addEventListener("keydown", key, true); addEventListener("resize", refresh);
  }
  function refresh(){ if(on) go(i); }
  function stop(){
    closeTourWins(null);
    document.body.classList.remove("touring"); document.querySelectorAll(".sidebox .sec.tourcur").forEach(x => x.classList.remove("tourcur"));
    on = false; token++; removeEventListener("keydown", key, true); removeEventListener("resize", refresh);
    card.classList.remove("show"); shade.classList.remove("on");
    const s = shade, c = card; setTimeout(() => { s.remove(); c.remove(); }, 260);
    if(prevFocus && prevFocus.focus) prevFocus.focus();
  }
  function key(e){
    if(!on) return;
    if(e.key === "Escape"){ e.preventDefault(); e.stopPropagation(); stop(); }
    else if(e.key === "ArrowRight"){ e.preventDefault(); go(i+1); }
    else if(e.key === "ArrowLeft"){ e.preventDefault(); go(i-1); }
  }
  const b = $("guidebtn"); if(b) b.addEventListener("click", start);
  return {start, stop, refresh, UI};
})();
