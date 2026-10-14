# BATIMIX — Reporte del prototipo funcional (Semana 10)

**Curso:** DS5343 Data Visualization, UTEC, semestre 2026-2
**Equipo:** Jimena Gurbillon, Andrea Coa, Paolo Medrano
**Dataset:** OpenNeuro ds004902, EEG de reposo y privación de sueño, 71 participantes (68 con EEG pareado)
**Fecha:** 14 de octubre de 2026

## Problema y audiencia

La vulnerabilidad a la privación de sueño es un rasgo individual: ante la misma falta de sueño, algunas personas se deterioran mucho y otras casi nada, y el promedio grupal diluye esa diferencia (Van Dongen et al., 2004).

La audiencia es el investigador en fisiología del sueño que hace screening exploratorio sobre datos públicos. Busca correlatos fisiológicos candidatos de la vulnerabilidad antes de comprometerse con un modelo formal. La decisión que apoya la herramienta es cuáles canales, regiones y covariables merecen una prueba estadística formal. No es diagnóstica ni predictiva.

## Estado actual del prototipo

La página abre en **Explorar**, con el dashboard y sus controles. La navegación superior contiene **Explorar** y **Método**. Debajo del dashboard se encuentran el acordeón de método y límites y el pie de página.

En escritorio, el scatterplot ocupa la columna izquierda; el topomap y la serie temporal se apilan a la derecha. El diseño se ajusta a la altura de la ventana. Se comprobó que las tres tarjetas completas caben en **1365 × 768** con la tabla de datos cerrada. Método y límites sigue accesible mediante desplazamiento vertical.

![Dashboard actual, capturado en localhost a 1365 × 768](dashboard-preview.png)

## Funcionalidades implementadas

Todas las vistas usan datos reales procesados por el equipo en la Semana 6: EEG de ojos abiertos, 75 épocas de 4 s por registro, potencia theta. Las estadísticas de la interfaz se calculan en el navegador a partir de los JSON.

### 1. Explorador enlazado (flujo analítico principal)

- **Vulnerabilidad (conduce).** Dispersión del cambio NS→SD.
  - Eje X: Δσθ de la región activa.
  - Eje Y: marcador seleccionable (PVT, KSS, SSS, PANAS+, PANAS−).
  - Color: moderador seleccionable (perfil vulnerable, edad, PSQI, sexo, orden de sesión).
  - Cuadrante vulnerable sombreado, medianas punteadas y ρ de Spearman con IC 95 % y n.
  - **Lazo libre** para seleccionar un grupo: el cursor dibuja un contorno de forma arbitraria y, al soltar, este se cierra. Se seleccionan los puntos dentro del polígono, no los de su rectángulo envolvente.
  - Las franjas regionales y la dinámica se actualizan durante el trazo y al completar la selección. El clic fija un participante sin perder el grupo seleccionado.
  - La leyenda indica cuántas personas carecen del marcador elegido y no se dibujan; con PVT se muestran 30 puntos y se informa de las 38 personas sin dato.
  - El hover usa la vecindad de Delaunay (radio de 16 px), así que no hace falta acertar al punto exacto.
  - Tabla equivalente con los mismos datos, operable con teclado.
- **Cuero cabelludo (responde).**
  - Campo interpolado por distancia inversa ponderada con isolíneas.
  - Alterna métrica (σ / μ) y condición (NS / SD / Δ). NS y SD comparten escala; Δ usa escala divergente centrada en cero.
  - En escritorio, los controles están al costado del mapa y la escala de color es vertical. En pantallas estrechas, los controles pasan arriba y la escala es horizontal.
  - Cada electrodo es enfocable y muestra NS, SD, Δ, Δ %, p y q-FDR.
  - Debajo se mantienen las franjas frontal y centro-temporal con sus promedios. El triángulo oscuro representa la media de los 68 y el naranja la del grupo seleccionado.
  - Una nota explica que el mapa por electrodo permanece agregado sobre los 68 y que las franjas regionales sí responden a la selección.
- **Cinco minutos (responde).**
  - Media ± error estándar por época, recalculada sujeto a sujeto para el grupo seleccionado.
  - El participante fijado aparece como serie punteada.
  - Reproducir recorre las 75 épocas; también se puede inspeccionar cada época con el cursor.
  - Los controles permiten mostrar ambas condiciones, solo NS o solo SD. El gráfico aprovecha la altura disponible y ajusta las marcas del eje Y en las vistas compactas.
- **Estado global.**
  - Región EEG, n activo y botón para limpiar; <kbd>Esc</kbd> limpia el grupo y la persona fijada, y puede interrumpir un lazo en curso.
  - Chips de cobertura: verde n ≥ 60, ámbar 30–59, rojo < 30.

### 2. Método y límites

Acordeón con datos, codificaciones, estadística y limitaciones, dentro de la misma página.


## Decisiones de diseño y alternativas consideradas

**Acceso directo a la exploración.** La apertura se concentra en el dashboard para que se pueda comparar, seleccionar e inspeccionar desde la primera pantalla. La contextualización metodológica se encuentra debajo del explorador.

**Distribución asimétrica y altura de pantalla.** Una primera disposición en tres columnas iguales dejó espacios vacíos en la serie temporal y contenido cortado en otras tarjetas. Se preparó un [mockup PNG](layout-mockup.png) y se pasó a una columna para la dispersión y otra con mapa y dinámica apilados. Los controles laterales y la escala vertical del topomap liberan altura para la serie temporal. La barra global queda arriba; el título introductorio «Explora tú» se oculta en escritorio. Hasta 1100 px de ancho, las tarjetas se apilan y la página permite desplazamiento vertical.

**Selección por la forma del grupo.** El lazo libre reemplaza la selección rectangular para rodear conjuntos de puntos con contornos irregulares. El contorno visible comunica qué área se está seleccionando. El clic conserva su función de fijar una persona y <kbd>Esc</kbd> permite limpiar la selección.

**Faltantes explícitos.** El scatterplot solo dibuja personas con ambos valores necesarios para sus ejes. La leyenda y los indicadores de cobertura informan de los datos faltantes.

**Contexto estadístico dentro del dashboard.** El mapa muestra p sin corregir y FDR a la vez. Las franjas explican su relación con el grupo seleccionado, y la nota bajo ellas aclara por qué el mapa no cambia al seleccionar personas. Método y límites conserva las advertencias sobre exploración y grupos pequeños.

**Color con significado.** Morado = NS y naranja rosado = SD en la serie temporal. Las escalas son divergentes donde hay cero natural (Δ); NS y SD comparten la escala secuencial del topomap para facilitar la comparación. En el scatterplot, la leyenda cambia con la variable elegida para el color.

**Estética claro editorial y minimalista.** Papel cálido, tinta carbón y bordes de 1 px, sin sombras pesadas. Newsreader para titulares, Schibsted Grotesk para el texto e IBM Plex Mono para cifras. El color queda reservado para los datos.

**Controles y movimiento.**

- El indicador de los controles segmentados anima el fondo mediante `clip-path`. Cada botón tiene una sola etiqueta: se retiró la copia superpuesta que se desalineaba al compactar los controles del topomap.
- Se mantiene espacio suficiente para las etiquetas numéricas de la escala vertical, que antes quedaban recortadas.
- Las transiciones principales del explorador se mantienen por debajo de 300 ms, con ajustes para `prefers-reduced-motion`.

**Accesibilidad.**

- La tabla del scatterplot permite consultar los datos y fijar participantes con teclado. Los electrodos son enfocables y anuncian sus valores; los controles conservan nombres y estados accesibles.
- Foco visible en todos los controles.
- La selección de grupos con el lazo requiere un dispositivo apuntador; la tabla no ofrece todavía una selección múltiple equivalente con teclado.

## Revisión en localhost

Se revisó la página renderizada y se ejercitaron sus interacciones en un navegador con los datos cargados:

| Comprobación | Resultado observado |
|---|---|
| Escritorio, 1365 × 768 | Las tres tarjetas completas y las etiquetas de la escala caben en el viewport, con la tabla cerrada. |
| Cambio de altura a 900 px, manteniendo el ancho | La serie temporal se redimensiona; las tarjetas no desbordan su contenido. |
| Pantalla estrecha, 390 px de ancho | Las tarjetas se apilan, los selectores caben y la escala del mapa pasa a horizontal. |
| Controles σ, μ, NS, SD y Δ | Cambian el estado del mapa y muestran las etiquetas activas sin superponer texto. |
| Lazo triangular sobre el scatterplot | Seleccionó las 14 personas dentro del contorno; el rectángulo envolvente habría incluido 30. Las franjas regionales y la dinámica mostraron n = 14. |
| Clic en un punto después de seleccionar | Fija a la persona y conserva el grupo seleccionado. |
| Escape después de seleccionar y durante un trazo | Limpia la selección y la persona fijada; interrumpe el trazo en curso. |

La [captura del navegador](dashboard-preview.png) documenta el resultado visual. También se revisó la sintaxis de los scripts modificados y el formato de los cambios. Estas comprobaciones funcionales no sustituyen una evaluación de usabilidad con la audiencia objetivo ni una auditoría completa de accesibilidad.

## Limitaciones conocidas y elementos incompletos

1. El mapa por electrodo usa el promedio de los 68: los datos por electrodo no están desagregados por sujeto, así que no se recalcula con la selección. Como sustituto, las franjas por región sí siguen la selección. Conectar el mapa a la selección requiere exportar potencia por electrodo y sujeto en la Semana 6.
2. Las pruebas por electrodo son t pareadas exploratorias. Con FDR de Benjamini–Hochberg ninguna sobrevive para σ ni para μ.
3. Los grupos pequeños (como los seis vulnerables del marcador PVT inicial) pueden dar medias por época ruidosas. El gráfico temporal conserva la banda de error y el n activo; las comparaciones siguen siendo exploratorias.
4. EEG pareado = 68 de 71: tres archivos estaban corruptos en origen (documentado en la Semana 6). PVT existe solo para 30, KSS para 32 y SSS para 33 de los 68.
5. La selección múltiple con teclado está pendiente. La alternativa tabular permite consultar y fijar personas, pero no reproducir todas las operaciones del lazo.
6. La vista compacta se comprobó en los tamaños indicados. Ventanas más bajas, zoom elevado o la apertura de la tabla pueden requerir desplazamiento. La tabla usa desplazamiento interno en su tarjeta; el método permanece debajo del dashboard.
7. D3 y las fuentes se cargan desde servicios externos. Se necesita conexión para cargarlos; el servidor local sirve los datos y archivos de la entrega. Las instrucciones están en el [README](README.md).
8. La publicación y la URL pública siguen pendientes dentro del alcance de esta revisión; el procedimiento de GitHub Pages está documentado en el README.

## Preguntas para los revisores

1. ¿La apertura directa en el dashboard aporta contexto suficiente para interpretar los cambios, o hace falta una introducción breve?
2. ¿El lazo libre facilita elegir los grupos deseados? ¿Sería útil ofrecer también una opción rectangular o selección múltiple desde la tabla?
3. ¿Se entiende que el topomap permanece agregado sobre los 68 mientras las franjas regionales y la serie temporal responden al grupo seleccionado?
4. ¿La distribución compacta mantiene legibles los controles, la escala vertical y la serie temporal en una pantalla de portátil?
5. ¿La leyenda de personas sin dato y los indicadores de cobertura comunican suficientemente los faltantes?
6. Con el efecto por electrodo tan difuso, ¿conviene conservar el campo interpolado o acompañarlo con un mapa de puntos discretos y su significancia?
