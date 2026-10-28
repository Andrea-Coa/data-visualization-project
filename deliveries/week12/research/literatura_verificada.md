# Literatura verificada para BATIMIX (Semana 12)

Proyecto: BATIMIX, DS5343 Visualización de Datos, UTEC 2026-2 (Jimena Gurbillon, Andrea Coa, Paolo Medrano).
Fecha de verificación: 27 de octubre de 2026.

## Cómo se verificó

- **Metadatos** (autores, año, revista o actas, volumen, número, páginas, DOI): consultados para cada DOI en el registro de Crossref (`https://api.crossref.org/works/<DOI>`) y contrastados con OpenAlex (`https://api.openalex.org/works/doi:<DOI>`). Para PubMed se usó Europe PMC (`https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=DOI:...`), porque PubMed devolvió una verificación anti-bot.
- **Contenido**: como mínimo se leyó el resumen oficial. Cuando hubo texto completo accesible de forma legítima (copia de autor, acceso abierto, material suplementario oficial o código de los autores) se leyó la parte relevante; cada ficha indica qué se abrió.
- **Estados**: [Verificado] significa metadatos confirmados en Crossref y contenido confirmado en al menos el resumen. [Verificado con salvedad] significa que algo concreto no se pudo abrir y se explica qué. [No verificado: motivo] significa que no se pudo confirmar.
- Los títulos en inglés se mantienen tal cual. No se inventó ningún DOI ni resultado; los cálculos propios están marcados como tales.
- Ya revisados por el equipo y no repetidos aquí como fichas nuevas (se citan cuando hace falta): Bai et al. 2024 (aperiódico), Cui et al. 2026, Bai et al. 2025 (microestados), ten Caat et al. 2007, music2026, Xiang et al. 2024 y Chua et al. 2019. Cui et al. 2026 y Xiang et al. 2024 se volvieron a abrir para este informe porque las secciones sobre Cui y sobre la conducta dependen de ellos.

## Resumen rápido

| Id | Referencia corta | DOI | Estado | Uso principal |
|---|---|---|---|---|
| A1 | Segel & Heer (2010) | 10.1109/TVCG.2010.179 | Verificado | Estructura martini glass: historia, luego exploración |
| A2 | Hullman & Diakopoulos (2011) | 10.1109/TVCG.2011.255 | Verificado | Encuadre honesto del resultado nulo |
| A3 | Kosara & Mackinlay (2013) | 10.1109/MC.2013.36 | Verificado con salvedad | La presentación como objetivo legítimo |
| A4 | Hullman et al. (2013) | 10.1109/TVCG.2013.119 | Verificado | Orden y transiciones de escenas |
| A5 | Munzner (2009) | 10.1109/TVCG.2009.111 | Verificado | Estructura del informe y validación por niveles |
| A6 | Brehmer & Munzner (2013) | 10.1109/TVCG.2013.124 | Verificado | Tareas T1..Tn por vista |
| A7 | Shneiderman (1996) | 10.1109/VL.1996.545307 | Verificado | Overview, filtro y detalle |
| A8 | Roberts (2007) | 10.1109/CMV.2007.20 | Verificado | Vistas coordinadas |
| A9 | Buja et al. (1991) | 10.1109/VISUAL.1991.175794 | Verificado | Focusing y linking |
| A10 | Becker & Cleveland (1987) | 10.1080/00401706.1987.10488204 | Verificado | Origen del brushing |
| B1 | Hullman (2020) | 10.1109/TVCG.2019.2934287 | Verificado | Por qué mostrar la incertidumbre |
| B2 | Padilla, Kay & Hullman (2021) | 10.1002/9781118445112.stat08296 | Verificado con salvedad | Técnicas de incertidumbre |
| B3 | Kale et al. (2019) | 10.1109/TVCG.2018.2864909 | Verificado | HOPs para curvas nulas |
| C1 | Steegen et al. (2016) | 10.1177/1745691616658637 | Verificado | Concepto de multiverso |
| C2 | Simonsohn, Simmons & Nelson (2020) | 10.1038/s41562-020-0912-z | Verificado con salvedad | Curva de especificación e inferencia conjunta |
| C3 | Dragicevic et al. (2019) | 10.1145/3290605.3300295 | Verificado con salvedad | Multiverso explorable |
| C4 | Liu, Kale, Althoff & Heer (2021) | 10.1109/TVCG.2020.3028985 | Verificado | Diseño de vistas del multiverso (Boba) |
| C5 | Del Giudice & Gangestad (2021) | 10.1177/2515245920954925 | Verificado | Qué decisiones entran al multiverso |
| C6 | Clayson et al. (2021) | 10.1016/j.neuroimage.2021.118712 | Verificado | Multiverso de preprocesamiento EEG |
| C7 | Robbins et al. (2020) | 10.1109/TNSRE.2020.2980223 | Verificado | Sensibilidad espectral al preprocesamiento |
| C8 | Trübutschek et al. (2024) | 10.1162/jocn_a_02087 | Verificado | EEGManyPipelines (muchos analistas) |
| C9 | Hollenbenders et al. (2026) | 10.52294/001c.165175 | Verificado | Multiverso en EEG de reposo |
| C10 | Delorme (2023) | 10.1038/s41598-023-27528-0 | Verificado | Más preprocesamiento no siempre es mejor |
| D1 | Van Dongen et al. (2004) | 10.1093/sleep/27.3.423 | Verificado | Vulnerabilidad tipo rasgo |
| D2 | Basner & Dinges (2011) | 10.1093/sleep/34.5.581 | Verificado | Métricas del PVT |
| D3 | Benjamini & Hochberg (1995) | 10.1111/j.2517-6161.1995.tb02031.x | Verificado | FDR |
| D4 | Benjamini & Yekutieli (2001) | 10.1214/aos/1013699998 | Verificado | FDR con dependencia positiva |
| D5 | Finelli et al. (2000) | 10.1016/S0306-4522(00)00409-7 | Verificado | Theta en vigilia y presión de sueño |
| D6 | Snipes et al. (2022) | 10.1523/JNEUROSCI.1063-22.2022 | Verificado | Theta: presión de sueño frente a control cognitivo |
| D7 | Hudson, Van Dongen & Honn (2020) | 10.1038/s41386-019-0432-6 | Verificado | Revisión: privación, vigilancia y variabilidad |
| D8 | Chua et al. (2014) | 10.5665/sleep.3302 | Verificado | Inestabilidad de theta y vulnerabilidad |
| D9 | Cui et al. (2026) | 10.3389/fnins.2026.1910878 | Verificado (ya revisado) | Métrica y correlación de referencia |
| D10 | Xiang et al. (2024) y dataset ds004902 | 10.1038/s41597-024-03268-2; 10.18112/openneuro.ds004902.v1.0.4; 10.18112/openneuro.ds004902.v1.0.8 | Verificado (ya revisado) | Datos, referencia FCz, PVT |

---

## Grupo A. Visualización narrativa y justificación del diseño

### A1. Segel & Heer (2010)
- **Cita (APA):** Segel, E., & Heer, J. (2010). Narrative visualization: Telling stories with data. *IEEE Transactions on Visualization and Computer Graphics, 16*(6), 1139-1148. https://doi.org/10.1109/TVCG.2010.179
- **Abierto:** registro Crossref del DOI; copia de autor en PDF, https://homes.cs.washington.edu/~jheer/files/narrative.pdf (texto leído).
- **Estado:** [Verificado]
- **Qué dice:** A partir de 58 ejemplos (sobre todo periodísticos) definen siete géneros (magazine style, annotated chart, partitioned poster, flow chart, comic strip, slide show, film/video/animation) y un espectro entre historias guiadas por el autor y exploración guiada por el lector. Describen tres estructuras híbridas frecuentes: martini glass (un tallo narrativo lineal que luego se abre a exploración libre), interactive slideshow y drill-down story.
- **Cómo lo usamos en BATIMIX:** BATIMIX es una martini glass: el scrollytelling de 68 puntos es el tallo guiado y el explorador enlazado es la copa; lo citamos para justificar el paso de historia a exploración.

### A2. Hullman & Diakopoulos (2011)
- **Cita (APA):** Hullman, J., & Diakopoulos, N. (2011). Visualization rhetoric: Framing effects in narrative visualization. *IEEE Transactions on Visualization and Computer Graphics, 17*(12), 2231-2240. https://doi.org/10.1109/TVCG.2011.255
- **Abierto:** registro Crossref; resumen en OpenAlex.
- **Estado:** [Verificado]
- **Qué dice:** Las técnicas de diseño que priorizan una interpretación afectan de forma significativa cómo el lector entiende una visualización narrativa. Proponen un marco de "retórica visual" que examina adiciones u omisiones de información en cuatro niveles: datos, representación visual, anotaciones textuales e interactividad.
- **Cómo lo usamos en BATIMIX:** Lista de control para el encuadre del hallazgo nulo: no omitir n, intervalos ni la no replicación, y evitar que la frase "los promedios ocultan" se lea como prueba de un efecto individual.

### A3. Kosara & Mackinlay (2013)
- **Cita (APA):** Kosara, R., & Mackinlay, J. (2013). Storytelling: The next step for visualization. *Computer, 46*(5), 44-50. https://doi.org/10.1109/MC.2013.36
- **Abierto:** registro Crossref; resumen en OpenAlex. La copia en PDF alojada por Tableau devolvió 403.
- **Estado:** [Verificado con salvedad: solo se leyó el resumen, no el texto completo]
- **Qué dice:** Sostienen que la presentación, y en particular el uso de elementos de storytelling, es el siguiente paso lógico de la investigación en visualización y merece al menos tanta atención como la exploración y el análisis.
- **Cómo lo usamos en BATIMIX:** Respaldo para dedicar una parte de la app a contar (intro) y no solo a explorar; citarlo solo en ese nivel general.

### A4. Hullman et al. (2013)
- **Cita (APA):** Hullman, J., Drucker, S., Henry Riche, N., Lee, B., Fisher, D., & Adar, E. (2013). A deeper understanding of sequence in narrative visualization. *IEEE Transactions on Visualization and Computer Graphics, 19*(12), 2406-2415. https://doi.org/10.1109/TVCG.2013.119
- **Abierto:** registro Crossref; resumen en OpenAlex.
- **Estado:** [Verificado]
- **Qué dice:** Analizan cualitativamente 42 visualizaciones narrativas profesionales de tipo presentación lineal y proponen un enfoque basado en grafos que ordena las visualizaciones minimizando el costo de transición percibido por la audiencia. En dos estudios encuentran beneficios en memoria y valoración subjetiva cuando la secuencia usa paralelismo como recurso estructural.
- **Cómo lo usamos en BATIMIX:** Justifica que el scrollytelling conserve las mismas 68 marcas entre escenas (transiciones de bajo costo) y que las escenas sean paralelas (NS frente a SD, grupo frente a persona).

### A5. Munzner (2009)
- **Cita (APA):** Munzner, T. (2009). A nested model for visualization design and validation. *IEEE Transactions on Visualization and Computer Graphics, 15*(6), 921-928. https://doi.org/10.1109/TVCG.2009.111
- **Abierto:** registro Crossref; resumen en OpenAlex.
- **Estado:** [Verificado]
- **Qué dice:** Modelo de cuatro niveles anidados: caracterizar el dominio, abstraer en operaciones sobre tipos de datos, diseñar codificación e interacción, e implementar algoritmos. Un error en un nivel superior se propaga a los inferiores, y cada nivel tiene amenazas de validez y métodos de evaluación propios.
- **Cómo lo usamos en BATIMIX:** Estructura del informe de la Semana 12: dominio (investigador de sueño que hace screening), abstracción (tareas, ver A6), codificación (vistas) y algoritmo (permutaciones), declarando que la validación con la audiencia real sigue pendiente.

### A6. Brehmer & Munzner (2013)
- **Cita (APA):** Brehmer, M., & Munzner, T. (2013). A multi-level typology of abstract visualization tasks. *IEEE Transactions on Visualization and Computer Graphics, 19*(12), 2376-2385. https://doi.org/10.1109/TVCG.2013.124
- **Abierto:** registro Crossref; página del proyecto en UBC y preprint en PDF (https://www.cs.ubc.ca/labs/imager/tr/2013/MultiLevelTaskTypology/brehmer_infovis13.pdf), texto leído.
- **Estado:** [Verificado]
- **Qué dice:** Tipología que distingue por qué se hace una tarea, cómo se hace y qué entra y sale de ella; las tareas complejas se expresan como secuencias de tareas simples. Vocabulario confirmado en el PDF: **WHY**: consume (present, discover, enjoy), produce, search (lookup, locate, browse, explore), query (identify, compare, summarize). **HOW**: encode; manipulate (select, navigate, arrange, change, filter, aggregate); introduce (annotate, import, derive, record). **WHAT**: input y output.
- **Cómo lo usamos en BATIMIX:** Definir T1..Tn por vista con este vocabulario exacto. Ejemplos: lazo en el scatter = select; topomap NS/SD/Δ = compare; curva de especificación = discover, luego explore y summarize, con derive (estadísticos nulos) y arrange (orden por efecto).

### A7. Shneiderman (1996)
- **Cita (APA):** Shneiderman, B. (1996). The eyes have it: A task by data type taxonomy for information visualizations. En *Proceedings 1996 IEEE Symposium on Visual Languages* (pp. 336-343). IEEE Computer Society Press. https://doi.org/10.1109/VL.1996.545307
- **Abierto:** registro Crossref; resumen en OpenAlex.
- **Estado:** [Verificado] (Crossref no registra fecha; el año corresponde al simposio de 1996 que da nombre a las actas).
- **Qué dice:** Propone el mantra "overview first, zoom and filter, then details on demand" y una taxonomía de siete tipos de datos y siete tareas (overview, zoom, filter, details-on-demand, relate, history, extract).
- **Cómo lo usamos en BATIMIX:** Ordenar el explorador y el multiverso: vista general de todas las especificaciones, luego filtro por decisión y detalle de una especificación en el scatter.

### A8. Roberts (2007)
- **Cita (APA):** Roberts, J. C. (2007). State of the art: Coordinated & multiple views in exploratory visualization. En *Fifth International Conference on Coordinated and Multiple Views in Exploratory Visualization (CMV 2007)* (pp. 61-71). IEEE. https://doi.org/10.1109/CMV.2007.20
- **Abierto:** registro Crossref; resumen en OpenAlex.
- **Estado:** [Verificado]
- **Qué dice:** Revisión del estado del arte de las vistas coordinadas y múltiples tras unos quince años de desarrollo: de modelos y técnicas a aplicaciones en dominios concretos, con temas abiertos hacia la analítica visual.
- **Cómo lo usamos en BATIMIX:** Referencia general para describir el explorador (scatter, topomap, franjas, dinámica y ahora multiverso) como un sistema de vistas coordinadas.

### A9. Buja et al. (1991)
- **Cita (APA):** Buja, A., McDonald, J. A., Michalak, J., & Stuetzle, W. (1991). Interactive data visualization using focusing and linking. En *Proceedings of Visualization '91* (pp. 156-163). IEEE Computer Society Press. https://doi.org/10.1109/VISUAL.1991.175794
- **Abierto:** registro Crossref; resumen en OpenAlex.
- **Estado:** [Verificado]
- **Qué dice:** Dos principios para datos multidimensionales: focusing (seleccionar subconjuntos, reducir dimensiones) y linking. Como cada vista enfocada muestra información parcial, las vistas deben enlazarse para integrar una imagen coherente del conjunto.
- **Cómo lo usamos en BATIMIX:** Justifica que la selección por lazo en el scatter actualice las franjas, la dinámica y el resaltado en la curva de especificación.

### A10. Becker & Cleveland (1987)
- **Cita (APA):** Becker, R. A., & Cleveland, W. S. (1987). Brushing scatterplots. *Technometrics, 29*(2), 127-142. https://doi.org/10.1080/00401706.1987.10488204
- **Abierto:** registro Crossref; resumen en OpenAlex.
- **Estado:** [Verificado]
- **Qué dice:** Define el brushing: con un pincel controlado por el ratón se aplican operaciones (highlight, shadow highlight, delete, label) cuyo efecto aparece a la vez en todos los gráficos, con modos transient, lasting y undo.
- **Cómo lo usamos en BATIMIX:** Origen del brushing enlazado; respalda distinguir selección persistente (lazo, persona fijada) de resaltado transitorio (hover).

---

## Grupo B. Incertidumbre y reporte honesto de resultados débiles o nulos

### B1. Hullman (2020)
- **Cita (APA):** Hullman, J. (2020). Why authors don't visualize uncertainty. *IEEE Transactions on Visualization and Computer Graphics, 26*(1), 130-139. https://doi.org/10.1109/TVCG.2019.2934287
- **Abierto:** registro Crossref; resumen en OpenAlex (versión abierta indicada: https://arxiv.org/pdf/1908.01697).
- **Estado:** [Verificado]
- **Qué dice:** Con una encuesta a 90 autores y 13 entrevistas muestra una contradicción: los autores valoran la incertidumbre pero suelen omitirla. Propone un modelo retórico de esa omisión y argumenta que comunicar la incertidumbre restringe las inferencias que el lector puede hacer.
- **Cómo lo usamos en BATIMIX:** Justifica mostrar el IC de ρ, el n de cada vista, las bandas ±SE y la banda nula en la curva de especificación, aunque debiliten la historia.

### B2. Padilla, Kay & Hullman (2021)
- **Cita (APA):** Padilla, L., Kay, M., & Hullman, J. (2021). Uncertainty visualization. En *Wiley StatsRef: Statistics Reference Online* (pp. 1-18). Wiley. https://doi.org/10.1002/9781118445112.stat08296
- **Abierto:** registro Crossref (incluye resumen). También existe un preprint en PsyArXiv, https://doi.org/10.31234/osf.io/ebd6r (2020).
- **Estado:** [Verificado con salvedad: la versión registrada es la entrada de Wiley StatsRef de 2021; no encontramos en Crossref una versión como capítulo de manual de 2022, así que no la citamos]
- **Qué dice:** Revisión de técnicas convencionales y recientes de visualización de incertidumbre y de las teorías cognitivas que explican cómo razonamos con ellas, con pros y contras de cada técnica y buenas prácticas.
- **Cómo lo usamos en BATIMIX:** Guía para elegir entre intervalos y conjuntos de resultados (ensembles) en el scatter y en la curva de especificación.

### B3. Kale et al. (2019)
- **Cita (APA):** Kale, A., Nguyen, F., Kay, M., & Hullman, J. (2019). Hypothetical outcome plots help untrained observers judge trends in ambiguous data. *IEEE Transactions on Visualization and Computer Graphics, 25*(1), 892-902. https://doi.org/10.1109/TVCG.2018.2864909
- **Abierto:** registro Crossref; resumen en OpenAlex.
- **Estado:** [Verificado]
- **Qué dice:** Dos experimentos en línea comparan HOPs (animaciones de resultados posibles), barras de error y ensembles de líneas. Con HOPs los observadores identifican la tendencia subyacente correcta con menos evidencia que con visualizaciones estáticas agregadas.
- **Cómo lo usamos en BATIMIX:** Opción de mostrar las curvas nulas por permutación (o líneas de regresión remuestreadas en el scatter) como animación, para que el lector vea cómo luce "sin efecto" con n = 30.

---

## Grupo C. Multiverso y curva de especificación (el diferencial)

### C1. Steegen, Tuerlinckx, Gelman & Vanpaemel (2016)
- **Cita (APA):** Steegen, S., Tuerlinckx, F., Gelman, A., & Vanpaemel, W. (2016). Increasing transparency through a multiverse analysis. *Perspectives on Psychological Science, 11*(5), 702-712. https://doi.org/10.1177/1745691616658637
- **Abierto:** registro Crossref (incluye resumen).
- **Estado:** [Verificado]
- **Qué dice:** Procesar datos crudos implica elegir entre opciones razonables (excluir, transformar, codificar). En lugar de un único análisis, proponen ejecutarlo sobre todos los conjuntos de datos procesados de forma razonable (el multiverso), lo que muestra cuánto cambian las conclusiones por decisiones arbitrarias y qué decisiones pesan más en la fragilidad del resultado. Lo ilustran con el efecto de la fertilidad sobre religiosidad y actitudes políticas.
- **Cómo lo usamos en BATIMIX:** Base conceptual de la vista de multiverso y del argumento "un solo ρ = -0.10 no basta para concluir".

### C2. Simonsohn, Simmons & Nelson (2020)
- **Cita (APA):** Simonsohn, U., Simmons, J. P., & Nelson, L. D. (2020). Specification curve analysis. *Nature Human Behaviour, 4*(11), 1208-1214. https://doi.org/10.1038/s41562-020-0912-z
- **Abierto:** registro Crossref; resumen vía Europe PMC (PMID 32719546); material suplementario oficial alojado por Springer Nature (https://media.springernature.com/original/springer-static/esm/art%3A10.1038%2Fs41562-020-0912-z/MediaObjects/41562_2020_912_MOESM1_ESM.pdf, leído); código de los autores en OSF (https://osf.io/9rvps/: script R del ejemplo Poisson de 2019 y archivos Stata de 2015, leídos); documentación del paquete `specr` (https://masurp.r-universe.dev/specr/doc/inferences.html), que cita la p. 1213 del artículo.
- **Estado:** [Verificado con salvedad: el texto principal está tras paywall y no se leyó directamente; la receta de la sección final se reconstruye del resumen, del suplemento oficial y del código de los autores, y el detalle "p. 1213" se toma de forma secundaria de `specr`]
- **Qué dice:** El análisis tiene tres pasos: (1) identificar el conjunto de especificaciones teóricamente justificadas, estadísticamente válidas y no redundantes; (2) mostrarlas gráficamente para identificar las decisiones con consecuencias; (3) hacer inferencia conjunta sobre todas. El suplemento (pp. 16-19) muestra con simulaciones que el bootstrap mantiene la tasa de falsos positivos cerca del 5 % aunque algunas especificaciones violen supuestos, y que los tres estadísticos conjuntos tienen más potencia que las especificaciones individuales, en especial el de Stouffer.
- **Cómo lo usamos en BATIMIX:** Es el método de la vista nueva: curva ordenada de ρ, panel de decisiones debajo y prueba conjunta por permutación (receta al final).

### C3. Dragicevic, Jansen, Sarma, Kay & Chevalier (2019)
- **Cita (APA):** Dragicevic, P., Jansen, Y., Sarma, A., Kay, M., & Chevalier, F. (2019). Increasing the transparency of research papers with explorable multiverse analyses. En *Proceedings of the 2019 CHI Conference on Human Factors in Computing Systems* (pp. 1-15). ACM. https://doi.org/10.1145/3290605.3300295
- **Abierto:** registro Crossref; resumen en OpenAlex; sitio complementario https://explorablemultiverse.github.io/. El PDF en HAL (hal-01976951) quedó bloqueado por una protección anti-bot.
- **Estado:** [Verificado con salvedad: no se leyó el texto completo]
- **Qué dice:** Proponen informes de multiverso explorables, donde el lector cambia opciones de análisis dentro del propio artículo, uniendo el multiverso con las explicaciones explorables. Según el sitio complementario incluyen cinco ejemplos, entre ellos uno que reproduce parte del multiverso de Steegen et al. con listas de opciones interactivas.
- **Cómo lo usamos en BATIMIX:** Precedente directo de dejar que el investigador cambie ROI, métrica, marcador, correlación y regla de outliers y vea el resultado al instante.

### C4. Liu, Kale, Althoff & Heer (2021)
- **Cita (APA):** Liu, Y., Kale, A., Althoff, T., & Heer, J. (2021). Boba: Authoring and visualizing multiverse analyses. *IEEE Transactions on Visualization and Computer Graphics, 27*(2), 1753-1763. https://doi.org/10.1109/TVCG.2020.3028985
- **Abierto:** registro Crossref; preprint arXiv:2007.05551 (PDF leído).
- **Estado:** [Verificado]
- **Qué dice:** Lenguaje y visualizador para multiversos con seis tareas (decision overview, robustness overview, decision impacts, uncertainty, model fit, inference). Sus vistas: decision view, outcome view, option ratio view (al cepillar un rango de resultados muestra qué opciones dominan), model fit view e inference view. La inference view se abre al final y bloquea las vistas anteriores para evitar comparaciones múltiples; compara los resultados con una distribución nula y marca las estimaciones que caen fuera del rango 2.5-97.5 del nulo.
- **Cómo lo usamos en BATIMIX:** Precedente de diseño para el panel de decisiones, el brushing de la curva y la banda nula, y para separar la exploración de la inferencia conjunta.

### C5. Del Giudice & Gangestad (2021)
- **Cita (APA):** Del Giudice, M., & Gangestad, S. W. (2021). A traveler's guide to the multiverse: Promises, pitfalls, and a framework for the evaluation of analytic decisions. *Advances in Methods and Practices in Psychological Science, 4*(1). https://doi.org/10.1177/2515245920954925
- **Abierto:** registro Crossref (incluye resumen).
- **Estado:** [Verificado]
- **Qué dice:** Si las alternativas no son realmente arbitrarias, un multiverso puede esconder efectos reales entre opciones mal justificadas. Distinguen tres tipos de no equivalencia a priori (de medida, de efecto y de potencia/precisión) y tres escenarios: decisiones tipo E (equivalencia de principio), tipo N (no equivalencia de principio) y tipo U (incertidumbre).
- **Cómo lo usamos en BATIMIX:** Clasificar cada decisión: media frente a variabilidad y el marcador conductual son de tipo N (miden cosas distintas), mientras que Pearson frente a Spearman y la regla de outliers se acercan a E o U. Ver la receta.

### C6. Clayson, Baldwin, Rocha & Larson (2021)
- **Cita (APA):** Clayson, P. E., Baldwin, S. A., Rocha, H. A., & Larson, M. J. (2021). The data-processing multiverse of event-related potentials (ERPs): A roadmap for the optimization and standardization of ERP processing and reduction pipelines. *NeuroImage, 245*, 118712. https://doi.org/10.1016/j.neuroimage.2021.118712
- **Abierto:** registro Crossref; resumen en OpenAlex (acceso abierto en ScienceDirect).
- **Estado:** [Verificado]
- **Qué dice:** Con ERN y Pe de 298 adultos varían filtro pasa altos y pasa bajos, corrección ocular, referencia, línea base, sensores y forma de medida: 3456 puntuaciones ERN y 576 Pe por persona. Las decisiones cambian la calidad de los datos y los efectos; el pipeline óptimo de ERN usa pasa bajos de 15 Hz, corrección ocular por ICA y puntuación por ROI.
- **Cómo lo usamos en BATIMIX:** Evidencia de que corrección ocular y referencia son decisiones con consecuencias en EEG; candidatas para un multiverso de preprocesamiento futuro, distinto del multiverso analítico actual.

### C7. Robbins, Touryan, Mullen, Kothe & Bigdely-Shamlo (2020)
- **Cita (APA):** Robbins, K. A., Touryan, J., Mullen, T., Kothe, C., & Bigdely-Shamlo, N. (2020). How sensitive are EEG results to preprocessing methods: A benchmarking study. *IEEE Transactions on Neural Systems and Rehabilitation Engineering, 28*(5), 1081-1090. https://doi.org/10.1109/TNSRE.2020.2980223
- **Abierto:** registro Crossref; resumen en OpenAlex.
- **Estado:** [Verificado]
- **Qué dice:** En 17 estudios EEG comparan cuatro pipelines automáticos (dos basados en ICA, LARG y MARA, y dos variantes de ASR). La estructura general de los resultados es similar, pero hay diferencias significativas, sobre todo en las características espectrales de baja frecuencia y en los residuos que dejan los parpadeos.
- **Cómo lo usamos en BATIMIX:** Sustento para la explicación principal de la no replicación: sin ICA ni rechazo de épocas, los parpadeos del registro con ojos abiertos pueden alterar theta frontal y su variabilidad.

### C8. Trübutschek et al. (2024)
- **Cita (APA):** Trübutschek, D., Yang, Y.-F., Gianelli, C., Cesnaite, E., Fischer, N. L., Vinding, M. C., Marshall, T. R., Algermissen, J., Pascarella, A., Puoliväli, T., Vitale, A., Busch, N. A., & Nilsonne, G. (2024). EEGManyPipelines: A large-scale, grassroots multi-analyst study of electroencephalography analysis practices in the wild. *Journal of Cognitive Neuroscience, 36*(2), 217-224. https://doi.org/10.1162/jocn_a_02087
- **Abierto:** registro Crossref (incluye resumen).
- **Estado:** [Verificado] (el nombre correcto del proyecto es EEGManyPipelines, no "EEGManyPipes").
- **Qué dice:** 168 equipos con 396 investigadores de 37 países analizaron de forma independiente el mismo conjunto EEG no publicado para probar las mismas hipótesis. Este artículo describe la organización del proyecto; no localizamos todavía un artículo revisado por pares con los resultados finales, así que no les atribuimos ningún resultado.
- **Cómo lo usamos en BATIMIX:** Contexto: la flexibilidad analítica en EEG es una preocupación reconocida a gran escala.

### C9. Hollenbenders, Carrle, Mähler, Maier & Reichenbach (2026)
- **Cita (APA):** Hollenbenders, Y., Carrle, F. P., Mähler, R., Maier, C., & Reichenbach, A. (2026). Reproducibility of electroencephalography biomarkers for diagnosis of major depressive disorder. *Aperture Neuro, 6*. https://doi.org/10.52294/001c.165175
- **Abierto:** registro Crossref (incluye resumen); página del artículo en apertureneuro.org.
- **Estado:** [Verificado]
- **Qué dice:** Multiverso sobre seis pasos (eliminación de artefactos, normalización, longitud de segmento, biomarcador alfa, agregación y clasificador), con 4752 caminos por dataset, en dos datasets públicos de EEG de reposo con ojos cerrados (25/18 pacientes y 23/14 controles). La exactitud va de 81 % a azar según dataset y combinación; la robustez es limitada y la replicación entre datasets es inconsistente.
- **Cómo lo usamos en BATIMIX:** Precedente más cercano de multiverso en EEG de reposo con muestras pequeñas; apoya que una correlación espectral con n ≈ 30 puede depender del pipeline.

### C10. Delorme (2023)
- **Cita (APA):** Delorme, A. (2023). EEG is better left alone. *Scientific Reports, 13*, 2372. https://doi.org/10.1038/s41598-023-27528-0
- **Abierto:** registro Crossref (incluye resumen).
- **Estado:** [Verificado]
- **Qué dice:** Con una métrica basada en ERP (porcentaje de canales significativos) en tres colecciones públicas, salvo el filtrado pasa altos y la interpolación de canales malos, las correcciones automáticas no ayudaron o empeoraron; el rechazo automático de componentes oculares y musculares por ICA no mejoró el resultado de forma consistente.
- **Cómo lo usamos en BATIMIX:** Contrapeso a C7: "ICA sí o no" es una decisión defendible en ambos sentidos y no un error que se corrige; conviene tratarla como una dimensión del multiverso (ojo: la métrica de Delorme es de ERP, no espectral).

---

## Grupo D. Anclas del dominio

### D1. Van Dongen, Baynard, Maislin & Dinges (2004)
- **Cita (APA):** Van Dongen, H. P. A., Baynard, M. D., Maislin, G., & Dinges, D. F. (2004). Systematic interindividual differences in neurobehavioral impairment from sleep loss: Evidence of trait-like differential vulnerability. *Sleep, 27*(3), 423-433. https://doi.org/10.1093/sleep/27.3.423
- **Abierto:** registro Crossref (sin autores ni páginas en Crossref); autores, volumen y páginas confirmados en OpenAlex y Europe PMC (PMID 15164894), con resumen.
- **Estado:** [Verificado]
- **Qué dice:** 21 adultos pasaron tres veces por 36 h de privación total. Las diferencias interindividuales en el deterioro fueron sistemáticas y tipo rasgo, grandes en comparación con el efecto de restringir el sueño previo, y no se explicaron por el desempeño basal. Se agruparon en tres dimensiones: autoevaluación de somnolencia, fatiga y ánimo; capacidad de procesamiento cognitivo; y alerta conductual medida con atención sostenida.
- **Cómo lo usamos en BATIMIX:** Argumento de diseño para las vistas por persona; además, como la vulnerabilidad es multidimensional, la elección del marcador conductual (PVT frente a KSS/SSS) es una decisión sustantiva del multiverso.

### D2. Basner & Dinges (2011)
- **Cita (APA):** Basner, M., & Dinges, D. F. (2011). Maximizing sensitivity of the psychomotor vigilance test (PVT) to sleep loss. *Sleep, 34*(5), 581-591. https://doi.org/10.1093/sleep/34.5.581
- **Abierto:** registro Crossref; resumen en Europe PMC (PMID 21532951, PMCID PMC3079937).
- **Estado:** [Verificado]
- **Qué dice:** En 74 sujetos (privación total y parcial), las métricas de lapsos y de velocidad (media de 1/RT, 10 % más lento de 1/RT) tuvieron los mayores tamaños de efecto, mientras que la media y la mediana de RT tuvieron efectos bajos a moderados. Recomiendan no usar media ni mediana de RT como medidas primarias de alerta.
- **Cómo lo usamos en BATIMIX:** Cui y nosotros usamos la mediana de RT, que estos autores desaconsejan como primaria; justifica incluir lapsos y DE de RT en el multiverso (ds004902 no trae 1/RT).

### D3. Benjamini & Hochberg (1995)
- **Cita (APA):** Benjamini, Y., & Hochberg, Y. (1995). Controlling the false discovery rate: A practical and powerful approach to multiple testing. *Journal of the Royal Statistical Society: Series B (Methodological), 57*(1), 289-300. https://doi.org/10.1111/j.2517-6161.1995.tb02031.x
- **Abierto:** registro Crossref (incluye resumen).
- **Estado:** [Verificado]
- **Qué dice:** Define la tasa de falsos descubrimientos (proporción esperada de hipótesis rechazadas por error) y un procedimiento secuencial tipo Bonferroni que la controla para estadísticos independientes, con más potencia que controlar el error de familia.
- **Cómo lo usamos en BATIMIX:** Marcas FDR del topomap sobre 61 electrodos.

### D4. Benjamini & Yekutieli (2001)
- **Cita (APA):** Benjamini, Y., & Yekutieli, D. (2001). The control of the false discovery rate in multiple testing under dependency. *The Annals of Statistics, 29*(4), 1165-1188. https://doi.org/10.1214/aos/1013699998
- **Abierto:** registro Crossref (incluye resumen).
- **Estado:** [Verificado]
- **Qué dice:** El procedimiento de Benjamini y Hochberg también controla la FDR cuando los estadísticos tienen dependencia de regresión positiva (por ejemplo, normales multivariados con correlaciones positivas); para otras dependencias hay una modificación conservadora.
- **Cómo lo usamos en BATIMIX:** Justifica aplicar BH a electrodos vecinos correlacionados, declarando el supuesto de dependencia positiva.

### D5. Finelli, Baumann, Borbély & Achermann (2000)
- **Cita (APA):** Finelli, L. A., Baumann, H., Borbély, A. A., & Achermann, P. (2000). Dual electroencephalogram markers of human sleep homeostasis: Correlation between theta activity in waking and slow-wave activity in sleep. *Neuroscience, 101*(3), 523-529. https://doi.org/10.1016/S0306-4522(00)00409-7
- **Abierto:** registro Crossref; resumen en Europe PMC (PMID 11113301).
- **Estado:** [Verificado] (es un estudio empírico, no una revisión).
- **Qué dice:** En 8 hombres jóvenes durante 40 h de vigilia, la potencia de 5-8 Hz aumentó con la vigilia prolongada; la tasa de aumento de theta en vigilia se correlacionó con el aumento de actividad de ondas lentas en el primer episodio NREM de recuperación, y ambos efectos fueron máximos en zonas frontales. Proponen que ambos son marcadores de un mismo proceso homeostático.
- **Cómo lo usamos en BATIMIX:** Ancla fisiológica de por qué theta en vigilia indexa presión de sueño y por qué la ROI frontal es razonable.

### D6. Snipes, Krugliakova, Meier & Huber (2022)
- **Cita (APA):** Snipes, S., Krugliakova, E., Meier, E., & Huber, R. (2022). The theta paradox: 4-8 Hz EEG oscillations reflect both sleep pressure and cognitive control. *The Journal of Neuroscience, 42*(45), 8569-8586. https://doi.org/10.1523/JNEUROSCI.1063-22.2022
- **Abierto:** registro Crossref (incluye resumen).
- **Estado:** [Verificado]
- **Qué dice:** EEG de alta densidad en 18 adultos con seis tareas y tres niveles de privación: la carga cognitiva y la privación aumentan theta en corteza prefrontal medial, pero la privación añade theta en muchas otras áreas, sobre todo frontales, y sus fuentes dependen de la tarea.
- **Cómo lo usamos en BATIMIX:** Advertencia interpretativa: theta no es un marcador puro de presión de sueño, y lo observado en reposo no tiene por qué generalizarse a la tarea (el EEG de ds004902 no se registró durante el PVT).

### D7. Hudson, Van Dongen & Honn (2020)
- **Cita (APA):** Hudson, A. N., Van Dongen, H. P. A., & Honn, K. A. (2020). Sleep deprivation, vigilant attention, and brain function: A review. *Neuropsychopharmacology, 45*(1), 21-30. https://doi.org/10.1038/s41386-019-0432-6
- **Abierto:** registro Crossref; resumen en Europe PMC (PMCID PMC6879580); texto completo en PMC consultado para las menciones a EEG.
- **Estado:** [Verificado] (publicado en línea en 2019, número de enero de 2020).
- **Qué dice:** Revisión: la vigilancia depende de procesos homeostático y circadiano (y posiblemente alostático); hay diferencias interindividuales grandes, estables y multidimensionales; el deterioro se caracteriza por una variabilidad creciente de la respuesta, que el sueño local podría explicar. Menciona la potencia theta en vigilia como marcador homeostático.
- **Cómo lo usamos en BATIMIX:** Revisión que conecta variabilidad conductual, variabilidad neural y vulnerabilidad; respalda la lógica de una métrica de variabilidad.

### D8. Chua et al. (2014)
- **Cita (APA):** Chua, E. C.-P., Yeo, S.-C., Lee, I. T.-G., Tan, L.-C., Lau, P., Cai, S., Zhang, X., Puvanendran, K., & Gooley, J. J. (2014). Sustained attention performance during sleep deprivation associates with instability in behavior and physiologic measures at baseline. *Sleep, 37*(1), 27-39. https://doi.org/10.5665/sleep.3302
- **Abierto:** registro Crossref; resumen en OpenAlex (versión abierta en PMC3902867).
- **Estado:** [Verificado]
- **Qué dice:** Comparando 15 sujetos resilientes y 15 vulnerables a 26 h o más de vigilia, los vulnerables mostraron RT del PVT más lentos y variables, frecuencia cardiaca más baja y variable, y potencia theta (6.0-7.5 Hz) más alta y más variable, con independencia del tiempo despierto; la actividad de ondas lentas fue similar.
- **Cómo lo usamos en BATIMIX:** Antecedente de que la inestabilidad de theta se asocia con vulnerabilidad; contrasta con Cui, que no halló asociación en la condición basal.

### D9. Cui et al. (2026), ya revisado
- **Cita (APA):** Cui, Z., Xie, T., Zhou, Y., Gong, P., Zhang, X., & Wang, P. (2026). Exploring the differences in neural oscillation mechanisms before and after sleep deprivation. *Frontiers in Neuroscience, 20*, 1910878. https://doi.org/10.3389/fnins.2026.1910878
- **Abierto:** PDF local `deliveries/week06/reviewed_papers/cui2026.pdf` (texto completo, extraído con pdftotext) y registro Crossref. No se abrió la página web de Frontiers porque el PDF bastó.
- **Estado:** [Verificado]
- **Qué dice / cómo lo usamos:** ver la sección dedicada más abajo.

### D10. Xiang et al. (2024) y el dataset ds004902, ya revisado
- **Cita (APA):** Xiang, C., Fan, X., Bai, D., Lv, K., & Lei, X. (2024). A resting-state EEG dataset for sleep deprivation. *Scientific Data, 11*, 427. https://doi.org/10.1038/s41597-024-03268-2
- **Dataset (APA):** Xiang, C., Fan, X., Bai, D., Lv, K., & Lei, X. (2024). *A resting-state EEG dataset for sleep deprivation* (versión 1.0.4) [Conjunto de datos]. OpenNeuro. https://doi.org/10.18112/openneuro.ds004902.v1.0.4 . La versión 1.0.8 (2025), la que usa BATIMIX, tiene DOI https://doi.org/10.18112/openneuro.ds004902.v1.0.8 .
- **Abierto:** PDF local `deliveries/week06/reviewed_papers/xiang2024.pdf`; registro Crossref del artículo; registros DataCite de ambas versiones; espejo GitHub de OpenNeuro (`OpenNeuroDatasets/ds004902`: CHANGES, participants.json y estructura de carpetas).
- **Estado:** [Verificado]
- **Qué dice que nos importa:** Referencia online en FCz, 500 Hz y 61 electrodos (p. 3). En el PVT reportan t(29) = -7.31 para la DE de RT, t(29) = -4.72 para lapsos y t(29) = 0.04 (p = 0.97) para la mediana de RT (p. 4). Ver en la sección de Cui la inconsistencia de etiquetas que encontramos al recalcular estos t.
- **Cómo lo usamos en BATIMIX:** Fuente de datos; explica que nuestro pipeline queda referenciado a FCz porque no re-referenciamos.

---

## Cui et al. 2026: cómo calcularon la correlación y por qué podríamos no replicarla

Fuente: PDF local de Cui et al. (2026). Las páginas son las del PDF publicado (numeración de pie "Frontiers in Neuroscience 0X").

### Qué hicieron exactamente

| Aspecto | Cui et al. (2026) | Dónde |
|---|---|---|
| Datos | ds004902, versión 1.0.4 | §2.1, p. 2 |
| Condición EEG | Solo ojos abiertos; el EEG no se registró durante el PVT | §2.1, p. 2 |
| Muestra EEG | 64 de 71 con EEG utilizable en NS y SD (33 H / 31 M) | §2.1, p. 2; Tabla 1, p. 3 |
| Muestra EEG-PVT | 28 con PVT válido en ambas condiciones (18 H / 10 M) | §2.1, p. 2; Tabla 1, p. 3 |
| Preprocesamiento | MNE-Python; montaje 10-20; 500 Hz; pasa banda 1-30 Hz; canales malos marcados por inspección visual; re-referencia promedio; ICA Infomax extendido (99 % de varianza); componentes oculares con Fp1/Fp2 como EOG sustituto (umbral 0.85); musculares con ICLabel (probabilidad > 0.85); interpolación; 75 épocas de 4 s sin solapamiento; rechazo de épocas > 200 µV pico a pico | §2.2, pp. 2-3 |
| Control de calidad | Épocas rechazadas: 5.17 ± 9.56 (NS) y 3.98 ± 5.25 (SD) de 75; componentes ICA retirados: 2.64 y 3.11 | §2.2, p. 3 |
| Potencia relativa | Welch por época y canal; theta 4-8 Hz; denominador = potencia total en **4-30 Hz** (Ec. 1) | §2.3, p. 3 |
| Variabilidad | DE entre épocas de la potencia relativa por época (Ec. 3), por canal | §2.3, p. 3; Fig. 1, p. 4 |
| ROI | Promedio de las medidas por canal; frontal (16) y centro-temporal (28), mismas listas que BATIMIX | §2.5, p. 4 |
| Conducta | Mediana de RT del PVT tras excluir RT < 100 ms (falsos inicios) y > 2000 ms; cambio = SD - NS | §2.4, pp. 3-4 |
| Correlación | **Spearman** entre cambios SD - NS de la ROI y cambios SD - NS de la mediana de RT, es decir **Δ contra Δ** (no SD sola); BH-FDR sobre 9 pruebas por familia (3 bandas × 3 ROI) | §2.6, pp. 4-5 |
| Resultado principal | Variabilidad theta: frontal ρ = 0.544 (p = 0.003; FDR 0.012); centro-temporal ρ = 0.558 (p = 0.002; FDR 0.012); parieto-occipital ρ = 0.438 (FDR 0.060). Media theta: frontal 0.504 y centro-temporal 0.451, sin sobrevivir FDR | §3.2, p. 7; Tabla 4, p. 8 |
| Robustez que reportan | Dejando uno fuera: frontal [0.508, 0.594], centro-temporal [0.515, 0.636] (p. 8). Parcial controlando Δ media theta: frontal 0.28 (p = 0.149), centro-temporal 0.39 (p = 0.039) (p. 7). Solo NS (basal): frontal 0.074, centro-temporal 0.114, ambos nulos (p. 8). Tras quitar el componente aperiódico: centro-temporal 0.598 (FDR 0.007), frontal 0.442 (FDR 0.083) (§3.3.1, p. 10; Tabla 6, p. 11). Longitud de época: 2 s 0.515/0.532; 4 s 0.544/0.558; 8 s 0.515/0.542; 10 s 0.413/0.326 sin significancia; la de 4 s fue la más fuerte (§3.3.2, p. 10; Tabla 7, p. 11) | pp. 7-11 |
| Por canal | Siete electrodos sobreviven FDR para variabilidad theta: F5, F8, FC5, FC6, T7, TP7, TP9 | p. 9; Tabla 5, p. 10 |
| Limitaciones que declaran | n conductual = 28; la mediana de RT no captura lapsos ni variabilidad del RT | §4.5, pp. 15-16 |

En resumen: correlación de Spearman, Δ variabilidad (SD - NS) contra Δ mediana de RT (SD - NS), ojos abiertos, n = 28, ROI frontal y centro-temporal, potencia relativa sobre 4-30 Hz, con ICA y rechazo de épocas.

### Qué hace BATIMIX (según `deliveries/week06/code/02_eeg_pipeline.ipynb`, `03_merge_pipeline.ipynb`, `05_findings_plots.ipynb` y `DataAnalysis.md`)

Coincide en: ds004902 con ojos abiertos, épocas de 4 s con tope de 75, theta 4-8 Hz relativa, DE por canal y promedio por ROI, mismas listas de ROI, Δ = SD - NS y Spearman.
Difiere en: versión 1.0.8; notch de 50 Hz y pasa banda 1-40 Hz; canales malos por log-varianza |z| > 3 con interpolación esférica; sin re-referencia (queda en FCz, la referencia online según Xiang et al., p. 3); sin ICA; sin rechazo de épocas (8 registros tienen menos de 75 épocas); PSD de Welch con parámetros por defecto de MNE sobre 1-40 Hz; **denominador de 1-40 Hz**; 68 pares EEG y 30 con PVT; Δ PVT = `PVT_item2` de `participants.tsv`. Resultado: ROI frontal, ρ = -0.10 (p = 0.60), n = 30.

### Hallazgo nuevo sobre la variable conductual (cálculo propio sobre `participants.tsv`)

1. **La mediana de RT de Cui no es la columna pública.** Con `PVT_item2` (mediana de RT según `participants.json`), la mediana del cambio en los 18 hombres con PVT es 47.5 ms; Cui reporta 51.50 ms para sus 18 hombres (§3.4, p. 11). Como solo hay 18 hombres con PVT, deberían ser los mismos. En mujeres, Cui reporta 27.75 ms (n = 10); quitando cualquier par de las 12 mujeres con PVT, la mediana posible va de 31.25 a 48.25 ms, nunca 27.75. Conclusión: la variable conductual de Cui no coincide con la columna pública, lo que encaja con que recalcularon la mediana con exclusiones por ensayo (< 100 ms y > 2000 ms).
2. **No hay datos de PVT ensayo a ensayo en el repositorio público.** En el espejo GitHub de OpenNeuro (v1.0.8), cada `sub-XX/ses-Y` solo contiene `eeg/`, y `participants.json` describe los tres agregados (lapsos, mediana de RT, DE de RT). Por tanto la regla < 100 / > 2000 ms de Cui no se puede reproducir con los datos públicos; no sabemos de dónde obtuvieron los ensayos.
3. **Inconsistencia de etiquetas en Xiang et al. (2024).** Recalculando t pareados con `participants.tsv` (n = 30): `PVT_item2` (mediana de RT) da t(29) = 7.31 (Δ media = 41.2 ms), `PVT_item3` (DE de RT) da t(29) = 4.72 y `PVT_item1` (lapsos) da t(29) = -0.04. El artículo reporta los mismos tres valores absolutos pero asignados a otros indicadores (7.31 a la DE, 4.72 a los lapsos, 0.04 a la mediana; p. 4). Los rangos de valores (cerca de 318 ms, 2.5 y 58 ms en NS) concuerdan con las etiquetas del diccionario, así que lo más probable es que el texto del artículo haya intercambiado etiquetas. Hay que mencionarlo en el informe, porque cambia qué marcador "sí responde" a la privación.

### Razones plausibles de la no replicación (de más a menos probables, según nuestro criterio)

1. **Variable conductual distinta** (evidencia directa arriba). Con n ≈ 30, cambiar los valores de RT de unos pocos sujetos reordena los rangos de Spearman.
2. **Artefactos oculares en ojos abiertos.** Cui elimina componentes oculares por ICA y rechaza épocas de alta amplitud; nosotros no. La ROI frontal incluye Fp1, Fpz, Fp2, AF7 y AF8, los electrodos más cercanos a los ojos. Robbins et al. (2020) muestran que los rasgos espectrales de baja frecuencia y los residuos de parpadeo son lo más sensible al pipeline. La variabilidad entre épocas es justo la métrica más vulnerable a parpadeos esporádicos.
3. **Denominador distinto (1-40 frente a 4-30 Hz).** Nuestra "theta relativa" incluye delta (1-4 Hz), donde está gran parte de la energía de los parpadeos y de la presión de sueño, y 30-40 Hz, banda sensible a actividad muscular. No es la misma cantidad que la de Cui.
4. **Referencia.** FCz online frente a promedio: cambia la topografía y atenúa los canales próximos a FCz (FC1, FC2, Cz, C1, C2 están en la ROI centro-temporal).
5. **Muestra.** Nosotros incluimos 30 personas con PVT y Cui 28; lo más probable es que las 2 restantes estén entre las 7 cuyo EEG Cui consideró no utilizable. Su análisis dejando uno fuera no protege frente a estas 2 incorporaciones.
6. **Versión del dataset.** Según CHANGES, entre la 1.0.4 (Cui) y la 1.0.8 (nosotros) se actualizaron archivos EEG de sub-01, sub-04 y sub-06 (versiones 1.0.6 a 1.0.8). Además, la 1.0.8 actualizó el `.fdt` de ojos abiertos de sub-01 en ses-1, que nuestro DataAnalysis.md lista entre los corruptos: conviene volver a descargarlo.
7. **Incertidumbre muestral y selección.** Cálculo propio (Fisher z con el error estándar de Bonett-Wright para Spearman): IC 95 % de Cui frontal ≈ [0.19, 0.77]; el nuestro ≈ [-0.45, 0.27]. Con n = 30, la potencia para detectar ρ = 0.3 es ≈ 0.35 y para ρ = 0.55 es ≈ 0.85. Además, el ρ de Cui viene de la especificación más fuerte entre cuatro longitudes de época, y su efecto frontal no sobrevive al control por la media ni al ajuste aperiódico, así que es esperable que un valor replicado sea menor.

### Comprobaciones que proponemos (alimentan el multiverso)

- Añadir una especificación "tipo Cui": 1-30 Hz, re-referencia promedio, ICA con los umbrales de Cui, rechazo > 200 µV y denominador 4-30 Hz, y marcarla en la curva.
- Recalcular con los tres marcadores PVT (mediana, lapsos, DE) y reportar la inconsistencia de etiquetas.
- Distribución de ρ dejando dos fuera sobre las 435 parejas posibles de los 30, para ver si alguna exclusión de 2 personas acerca el resultado a lo reportado por Cui.
- Reportar siempre IC y n junto a ρ.

---

## Inferencia conjunta en curvas de especificación: receta

### Lo que establecen las fuentes (verificado)

Fuentes: resumen del artículo (Europe PMC), suplemento oficial (pp. 16-19), código de los autores en OSF (script R del ejemplo Poisson de 2019 y archivos Stata de 2015 para los dos casos del artículo), documentación de `specr` (fuente secundaria que cita la p. 1213) y la descripción del método en Boba (Liu et al., 2021).

1. **Hipótesis nula conjunta:** el efecto es cero en todas las especificaciones a la vez. La pregunta es si la curva observada es más extrema de lo esperable bajo esa nula.
2. **Datos nulos con datos experimentales:** se baraja la variable asignada al azar y se vuelve a estimar toda la curva (Stata, caso de discriminación: barajado de la raza dentro de cada anuncio, iteraciones 1 a 500). Boba describe el método de Simonsohn como una comparación con una distribución nula obtenida al barajar al azar la variable de interés.
3. **Datos nulos con datos observacionales (versión publicada):** en cada especificación k se fuerza la nula restando el efecto estimado, y*_k = y_k - b_k · x_k; luego se remuestrean N filas con reemplazo, **las mismas filas para todas las especificaciones**, y se reestima todo (script R de OSF; `specr`, que cita la p. 1213). En la versión de 2015 del caso huracanes, el código barajaba los nombres conjuntamente dentro de cada periodo.
4. **Número de remuestreos:** 500 en sus ejemplos (bucles 0 a 500 en Stata; `specr` también indica 500).
5. **Tres estadísticos** (código R):
   - T1, **mediana** de las estimaciones: p = proporción de curvas nulas con |mediana| ≥ |mediana observada| (en Stata, tras alinear el signo al dominante, mediana nula ≥ observada).
   - T2, **número de especificaciones significativas** (p < .05) en la dirección predicha (o dominante): p = P(conteo nulo > observado) + 0.5 · P(conteo nulo = observado).
   - T3, **Stouffer**: p unilateral por especificación (p/2 si b > 0; 1 - p/2 si no), Z_k = Φ⁻¹(p unilateral) truncado a [-4, 4], Z = ΣZ_k / √K; p = proporción de curvas nulas con Z nulo ≤ Z observado (Z más negativo = más evidencia).
6. **Banda descriptiva:** se ordena cada curva nula y en cada rango se toman los percentiles 2.5, 50 y 97.5, que se dibujan junto a la curva observada ordenada (Stata, sección 5; Boba hace lo análogo por universo).
7. **Dirección no predicha:** en Stata se invierte el signo si la mayoría de estimaciones es negativa (signo dominante); en R la mediana se compara en valor absoluto.

### Receta para BATIMIX (adaptación nuestra, no del artículo)

Entradas: tabla E (68 sujetos × Δ EEG para cada ROI × {media, variabilidad}) y tabla B (68 × Δ marcadores: mediana RT, lapsos, DE RT, KSS, SSS; NA cuando falta). Una especificación es s = (ROI, métrica, marcador, Pearson/Spearman, regla de outliers).

0. **Fijar antes de mirar:** lista de especificaciones, signo predicho por marcador (positivo para todos los de "más alto = peor"; invertir cualquier marcador de "más alto = mejor"), B ≥ 2000 permutaciones (el artículo usa 500; más permutaciones estabilizan p pequeños) y semilla.
1. **Curva observada:** para cada s, casos completos, aplicar la regla de outliers, calcular r_s y p_s.
2. **Nula por permutación:** para i = 1..B, generar una permutación π de los 68 sujetos y reordenar **todas las filas de B a la vez** (los NA viajan con su fila, así el n de cada marcador se mantiene); recalcular **todas** las especificaciones igual que en el paso 1, **incluida la regla de outliers**, y guardar r_s⁽ⁱ⁾ y p_s⁽ⁱ⁾.
   - Por qué permutar: sin covariables, barajar el emparejamiento conducta-sujeto genera la nula de independencia en todas las especificaciones a la vez, y usar la misma π conserva la dependencia entre especificaciones, igual que el barajado del caso experimental o las mismas filas del bootstrap. La alternativa de forzar la nula (y* = y - b·x) sirve para Pearson/MCO, pero no tiene análogo directo para Spearman.
3. **Estadísticos** en la curva observada y en cada curva nula: T1 (mediana de r con el signo predicho), T2 (número de especificaciones con p < .05 y signo predicho) y T3 (Stouffer como arriba).
4. **Valores p:** p_T = (1 + número de curvas nulas al menos tan extremas) / (1 + B). El +1 es decisión nuestra; `specr` reporta 1/(1 + B) como mínimo.
5. **Vista:** curva observada ordenada con la banda nula 2.5-97.5 por rango, panel de decisiones debajo y T1, T2 y T3 con sus p. Al hacer clic en una especificación, el scatter cambia a esa combinación de x, y y outliers. La prueba conjunta se calcula sobre el multiverso completo predefinido; si el usuario filtra, los p del subconjunto se marcan como exploratorios (criterio inspirado en la inference view de Boba).
6. **Reportar además:** proporción de especificaciones con r > 0, rango de r y la especificación "tipo Cui" resaltada.

**Advertencias**

- **Redundancia:** Pearson y Spearman sobre los mismos datos son casi duplicados y pueden inflar la apariencia de consistencia; el paso 1 de Simonsohn pide especificaciones no redundantes. Si se mantienen, decirlo.
- **No equivalencia (C5):** media y variabilidad, y los distintos marcadores, miden constructos distintos. Recomendación: prueba conjunta principal solo con variabilidad (la hipótesis de Cui) y una curva global como análisis secundario.
- **n distinto por marcador** (PVT 30, KSS 32, SSS 33): Stouffer pondera igual cada especificación; mencionarlo.
- **Costo:** con unas 180 especificaciones y 2000 permutaciones se calculan unas 360 000 correlaciones con n ≤ 68. Es viable en el navegador, pero para que sea reproducible conviene precalcular con semilla en Python y enviar al front solo los percentiles por rango y las distribuciones de T1 a T3.
- La prueba conjunta responde "¿hay evidencia de asociación en el multiverso?", no "¿cuál especificación es la correcta?".

---

## Referencias no verificadas o con salvedades

- **Simonsohn et al. (2020), texto principal:** tras paywall en nature.com y link.springer.com. No usamos copias de terceros. La receta se apoya en el resumen, el suplemento oficial, el código de los autores y `specr`.
- **Dragicevic et al. (2019), texto completo:** HAL respondió con una protección anti-bot; se usaron Crossref, el resumen y el sitio complementario.
- **Kosara & Mackinlay (2013), texto completo:** la copia de Tableau devolvió 403; solo se leyó el resumen.
- **Padilla, Kay & Hullman, "2022 handbook":** no encontramos en Crossref una versión de 2022; citamos la entrada de 2021 en Wiley StatsRef.
- **Resultados finales de EEGManyPipelines:** no localizamos un artículo revisado por pares con resultados; solo se cita el artículo de diseño (2024).

---

## BibTeX (todas las referencias verificadas)

```bibtex
@article{segel2010narrative,
  author  = {Segel, Edward and Heer, Jeffrey},
  title   = {Narrative Visualization: Telling Stories with Data},
  journal = {IEEE Transactions on Visualization and Computer Graphics},
  year    = {2010},
  volume  = {16},
  number  = {6},
  pages   = {1139--1148},
  doi     = {10.1109/TVCG.2010.179}
}

@article{hullman2011rhetoric,
  author  = {Hullman, Jessica and Diakopoulos, Nicholas},
  title   = {Visualization Rhetoric: Framing Effects in Narrative Visualization},
  journal = {IEEE Transactions on Visualization and Computer Graphics},
  year    = {2011},
  volume  = {17},
  number  = {12},
  pages   = {2231--2240},
  doi     = {10.1109/TVCG.2011.255}
}

@article{kosara2013storytelling,
  author  = {Kosara, Robert and Mackinlay, Jock},
  title   = {Storytelling: The Next Step for Visualization},
  journal = {Computer},
  year    = {2013},
  volume  = {46},
  number  = {5},
  pages   = {44--50},
  doi     = {10.1109/MC.2013.36}
}

@article{hullman2013sequence,
  author  = {Hullman, Jessica and Drucker, Steven and Henry Riche, Nathalie and Lee, Bongshin and Fisher, Danyel and Adar, Eytan},
  title   = {A Deeper Understanding of Sequence in Narrative Visualization},
  journal = {IEEE Transactions on Visualization and Computer Graphics},
  year    = {2013},
  volume  = {19},
  number  = {12},
  pages   = {2406--2415},
  doi     = {10.1109/TVCG.2013.119}
}

@article{munzner2009nested,
  author  = {Munzner, Tamara},
  title   = {A Nested Model for Visualization Design and Validation},
  journal = {IEEE Transactions on Visualization and Computer Graphics},
  year    = {2009},
  volume  = {15},
  number  = {6},
  pages   = {921--928},
  doi     = {10.1109/TVCG.2009.111}
}

@article{brehmer2013typology,
  author  = {Brehmer, Matthew and Munzner, Tamara},
  title   = {A Multi-Level Typology of Abstract Visualization Tasks},
  journal = {IEEE Transactions on Visualization and Computer Graphics},
  year    = {2013},
  volume  = {19},
  number  = {12},
  pages   = {2376--2385},
  doi     = {10.1109/TVCG.2013.124}
}

@inproceedings{shneiderman1996eyes,
  author    = {Shneiderman, Ben},
  title     = {The Eyes Have It: A Task by Data Type Taxonomy for Information Visualizations},
  booktitle = {Proceedings 1996 IEEE Symposium on Visual Languages},
  year      = {1996},
  pages     = {336--343},
  publisher = {IEEE Computer Society Press},
  doi       = {10.1109/VL.1996.545307}
}

@inproceedings{roberts2007cmv,
  author    = {Roberts, Jonathan C.},
  title     = {State of the Art: Coordinated \& Multiple Views in Exploratory Visualization},
  booktitle = {Fifth International Conference on Coordinated and Multiple Views in Exploratory Visualization (CMV 2007)},
  year      = {2007},
  pages     = {61--71},
  publisher = {IEEE},
  doi       = {10.1109/CMV.2007.20}
}

@inproceedings{buja1991focusing,
  author    = {Buja, Andreas and McDonald, J. A. and Michalak, J. and Stuetzle, Werner},
  title     = {Interactive Data Visualization Using Focusing and Linking},
  booktitle = {Proceedings of Visualization '91},
  year      = {1991},
  pages     = {156--163},
  publisher = {IEEE Computer Society Press},
  doi       = {10.1109/VISUAL.1991.175794}
}

@article{becker1987brushing,
  author  = {Becker, Richard A. and Cleveland, William S.},
  title   = {Brushing Scatterplots},
  journal = {Technometrics},
  year    = {1987},
  volume  = {29},
  number  = {2},
  pages   = {127--142},
  doi     = {10.1080/00401706.1987.10488204}
}

@article{hullman2020uncertainty,
  author  = {Hullman, Jessica},
  title   = {Why Authors Don't Visualize Uncertainty},
  journal = {IEEE Transactions on Visualization and Computer Graphics},
  year    = {2020},
  volume  = {26},
  number  = {1},
  pages   = {130--139},
  doi     = {10.1109/TVCG.2019.2934287}
}

@incollection{padilla2021uncertainty,
  author    = {Padilla, Lace and Kay, Matthew and Hullman, Jessica},
  title     = {Uncertainty Visualization},
  booktitle = {Wiley StatsRef: Statistics Reference Online},
  year      = {2021},
  pages     = {1--18},
  publisher = {Wiley},
  doi       = {10.1002/9781118445112.stat08296}
}

@article{kale2019hops,
  author  = {Kale, Alex and Nguyen, Francis and Kay, Matthew and Hullman, Jessica},
  title   = {Hypothetical Outcome Plots Help Untrained Observers Judge Trends in Ambiguous Data},
  journal = {IEEE Transactions on Visualization and Computer Graphics},
  year    = {2019},
  volume  = {25},
  number  = {1},
  pages   = {892--902},
  doi     = {10.1109/TVCG.2018.2864909}
}

@article{steegen2016multiverse,
  author  = {Steegen, Sara and Tuerlinckx, Francis and Gelman, Andrew and Vanpaemel, Wolf},
  title   = {Increasing Transparency Through a Multiverse Analysis},
  journal = {Perspectives on Psychological Science},
  year    = {2016},
  volume  = {11},
  number  = {5},
  pages   = {702--712},
  doi     = {10.1177/1745691616658637}
}

@article{simonsohn2020specification,
  author  = {Simonsohn, Uri and Simmons, Joseph P. and Nelson, Leif D.},
  title   = {Specification Curve Analysis},
  journal = {Nature Human Behaviour},
  year    = {2020},
  volume  = {4},
  number  = {11},
  pages   = {1208--1214},
  doi     = {10.1038/s41562-020-0912-z}
}

@inproceedings{dragicevic2019explorable,
  author    = {Dragicevic, Pierre and Jansen, Yvonne and Sarma, Abhraneel and Kay, Matthew and Chevalier, Fanny},
  title     = {Increasing the Transparency of Research Papers with Explorable Multiverse Analyses},
  booktitle = {Proceedings of the 2019 CHI Conference on Human Factors in Computing Systems},
  year      = {2019},
  pages     = {1--15},
  publisher = {ACM},
  doi       = {10.1145/3290605.3300295}
}

@article{liu2021boba,
  author  = {Liu, Yang and Kale, Alex and Althoff, Tim and Heer, Jeffrey},
  title   = {Boba: Authoring and Visualizing Multiverse Analyses},
  journal = {IEEE Transactions on Visualization and Computer Graphics},
  year    = {2021},
  volume  = {27},
  number  = {2},
  pages   = {1753--1763},
  doi     = {10.1109/TVCG.2020.3028985}
}

@article{delgiudice2021traveler,
  author  = {Del Giudice, Marco and Gangestad, Steven W.},
  title   = {A Traveler's Guide to the Multiverse: Promises, Pitfalls, and a Framework for the Evaluation of Analytic Decisions},
  journal = {Advances in Methods and Practices in Psychological Science},
  year    = {2021},
  volume  = {4},
  number  = {1},
  doi     = {10.1177/2515245920954925}
}

@article{clayson2021multiverse,
  author  = {Clayson, Peter E. and Baldwin, Scott A. and Rocha, Harold A. and Larson, Michael J.},
  title   = {The Data-Processing Multiverse of Event-Related Potentials ({ERPs}): A Roadmap for the Optimization and Standardization of {ERP} Processing and Reduction Pipelines},
  journal = {NeuroImage},
  year    = {2021},
  volume  = {245},
  pages   = {118712},
  doi     = {10.1016/j.neuroimage.2021.118712}
}

@article{robbins2020preprocessing,
  author  = {Robbins, Kay A. and Touryan, Jonathan and Mullen, Tim and Kothe, Christian and Bigdely-Shamlo, Nima},
  title   = {How Sensitive Are {EEG} Results to Preprocessing Methods: A Benchmarking Study},
  journal = {IEEE Transactions on Neural Systems and Rehabilitation Engineering},
  year    = {2020},
  volume  = {28},
  number  = {5},
  pages   = {1081--1090},
  doi     = {10.1109/TNSRE.2020.2980223}
}

@article{trubutschek2024eegmanypipelines,
  author  = {Tr{\"u}butschek, Darinka and Yang, Yu-Fang and Gianelli, Claudia and Cesnaite, Elena and Fischer, Nastassja L. and Vinding, Mikkel C. and Marshall, Tom R. and Algermissen, Johannes and Pascarella, Annalisa and Puoliv{\"a}li, Tuomas and Vitale, Andrea and Busch, Niko A. and Nilsonne, Gustav},
  title   = {{EEGManyPipelines}: A Large-scale, Grassroots Multi-analyst Study of Electroencephalography Analysis Practices in the Wild},
  journal = {Journal of Cognitive Neuroscience},
  year    = {2024},
  volume  = {36},
  number  = {2},
  pages   = {217--224},
  doi     = {10.1162/jocn_a_02087}
}

@article{hollenbenders2026reproducibility,
  author  = {Hollenbenders, Yasmin and Carrle, Friedrich Ph. and M{\"a}hler, Roman and Maier, Christoph and Reichenbach, Alexandra},
  title   = {Reproducibility of Electroencephalography Biomarkers for Diagnosis of Major Depressive Disorder},
  journal = {Aperture Neuro},
  year    = {2026},
  volume  = {6},
  doi     = {10.52294/001c.165175}
}

@article{delorme2023eeg,
  author  = {Delorme, Arnaud},
  title   = {{EEG} Is Better Left Alone},
  journal = {Scientific Reports},
  year    = {2023},
  volume  = {13},
  pages   = {2372},
  doi     = {10.1038/s41598-023-27528-0}
}

@article{vandongen2004systematic,
  author  = {Van Dongen, Hans P. A. and Baynard, Maurice D. and Maislin, Greg and Dinges, David F.},
  title   = {Systematic Interindividual Differences in Neurobehavioral Impairment from Sleep Loss: Evidence of Trait-Like Differential Vulnerability},
  journal = {Sleep},
  year    = {2004},
  volume  = {27},
  number  = {3},
  pages   = {423--433},
  doi     = {10.1093/sleep/27.3.423}
}

@article{basner2011pvt,
  author  = {Basner, Mathias and Dinges, David F.},
  title   = {Maximizing Sensitivity of the Psychomotor Vigilance Test ({PVT}) to Sleep Loss},
  journal = {Sleep},
  year    = {2011},
  volume  = {34},
  number  = {5},
  pages   = {581--591},
  doi     = {10.1093/sleep/34.5.581}
}

@article{benjamini1995fdr,
  author  = {Benjamini, Yoav and Hochberg, Yosef},
  title   = {Controlling the False Discovery Rate: A Practical and Powerful Approach to Multiple Testing},
  journal = {Journal of the Royal Statistical Society: Series B (Methodological)},
  year    = {1995},
  volume  = {57},
  number  = {1},
  pages   = {289--300},
  doi     = {10.1111/j.2517-6161.1995.tb02031.x}
}

@article{benjamini2001dependency,
  author  = {Benjamini, Yoav and Yekutieli, Daniel},
  title   = {The Control of the False Discovery Rate in Multiple Testing under Dependency},
  journal = {The Annals of Statistics},
  year    = {2001},
  volume  = {29},
  number  = {4},
  pages   = {1165--1188},
  doi     = {10.1214/aos/1013699998}
}

@article{finelli2000dual,
  author  = {Finelli, Luca A. and Baumann, H. and Borb{\'e}ly, Alexander A. and Achermann, Peter},
  title   = {Dual Electroencephalogram Markers of Human Sleep Homeostasis: Correlation between Theta Activity in Waking and Slow-Wave Activity in Sleep},
  journal = {Neuroscience},
  year    = {2000},
  volume  = {101},
  number  = {3},
  pages   = {523--529},
  doi     = {10.1016/S0306-4522(00)00409-7}
}

@article{snipes2022theta,
  author  = {Snipes, Sophia and Krugliakova, Elena and Meier, Elias and Huber, Reto},
  title   = {The Theta Paradox: 4-8 Hz {EEG} Oscillations Reflect Both Sleep Pressure and Cognitive Control},
  journal = {The Journal of Neuroscience},
  year    = {2022},
  volume  = {42},
  number  = {45},
  pages   = {8569--8586},
  doi     = {10.1523/JNEUROSCI.1063-22.2022}
}

@article{hudson2020review,
  author  = {Hudson, Amanda N. and Van Dongen, Hans P. A. and Honn, Kimberly A.},
  title   = {Sleep Deprivation, Vigilant Attention, and Brain Function: A Review},
  journal = {Neuropsychopharmacology},
  year    = {2020},
  volume  = {45},
  number  = {1},
  pages   = {21--30},
  doi     = {10.1038/s41386-019-0432-6}
}

@article{chua2014instability,
  author  = {Chua, Eric Chern-Pin and Yeo, Sing-Chen and Lee, Ivan Tian-Guang and Tan, Luuan-Chin and Lau, Pauline and Cai, Shiwei and Zhang, Xiaodong and Puvanendran, Kathiravelu and Gooley, Joshua J.},
  title   = {Sustained Attention Performance during Sleep Deprivation Associates with Instability in Behavior and Physiologic Measures at Baseline},
  journal = {Sleep},
  year    = {2014},
  volume  = {37},
  number  = {1},
  pages   = {27--39},
  doi     = {10.5665/sleep.3302}
}

@article{cui2026oscillation,
  author  = {Cui, Zitong and Xie, Tiantian and Zhou, Yueying and Gong, Peiliang and Zhang, Xiaorui and Wang, Pengpai},
  title   = {Exploring the Differences in Neural Oscillation Mechanisms before and after Sleep Deprivation},
  journal = {Frontiers in Neuroscience},
  year    = {2026},
  volume  = {20},
  pages   = {1910878},
  doi     = {10.3389/fnins.2026.1910878}
}

@article{xiang2024dataset,
  author  = {Xiang, Chuqin and Fan, Xinrui and Bai, Duo and Lv, Ke and Lei, Xu},
  title   = {A Resting-State {EEG} Dataset for Sleep Deprivation},
  journal = {Scientific Data},
  year    = {2024},
  volume  = {11},
  pages   = {427},
  doi     = {10.1038/s41597-024-03268-2}
}

@misc{xiang2024ds004902v104,
  author    = {Xiang, Chuqin and Fan, Xinrui and Bai, Duo and Lv, Ke and Lei, Xu},
  title     = {A Resting-state {EEG} Dataset for Sleep Deprivation (version 1.0.4)},
  year      = {2024},
  publisher = {OpenNeuro},
  doi       = {10.18112/openneuro.ds004902.v1.0.4}
}

@misc{xiang2025ds004902v108,
  author    = {Xiang, Chuqin and Fan, Xinrui and Bai, Duo and Lv, Ke and Lei, Xu},
  title     = {A Resting-state {EEG} Dataset for Sleep Deprivation (version 1.0.8)},
  year      = {2025},
  publisher = {OpenNeuro},
  doi       = {10.18112/openneuro.ds004902.v1.0.8}
}
```
