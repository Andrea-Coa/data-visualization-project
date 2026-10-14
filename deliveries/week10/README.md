# BATIMIX — Una noche sin dormir (Semana 10)

Prototipo funcional en D3.js sobre la vulnerabilidad individual a la privación de sueño en EEG de reposo. Dataset OpenNeuro ds004902: 71 participantes, 68 con EEG pareado.

La página abre directamente en el dashboard **Explorar**. Debajo se mantienen **Método y límites** y el pie de página. La navegación superior contiene los enlaces Explorar y Método.

![Dashboard actual, capturado en localhost a 1365 × 768](dashboard-preview.png)

## Distribución e interacciones actuales

En escritorio, a partir de 1101 px de ancho, el dashboard usa dos columnas: **Vulnerabilidad** ocupa la izquierda; **Cuero cabelludo** y **Cinco minutos** se apilan a la derecha. La barra de región EEG, participantes activos, limpieza y cobertura aparece encima de las tarjetas. El título introductorio «Explora tú» se oculta en escritorio para ahorrar altura.

La distribución se ajusta a la altura de la ventana. Se comprobó en localhost que las tres tarjetas completas caben en un viewport de **1365 × 768**, con la tabla de participantes cerrada. El método y el pie siguen disponibles al desplazarse hacia abajo. En pantallas de hasta 1100 px, las tarjetas se apilan y la página permite desplazamiento vertical.

- **Vulnerabilidad:** la selección rectangular se reemplazó por un **lazo libre**. Al arrastrar se dibuja el contorno y se actualizan las vistas enlazadas; al soltar, el contorno se cierra. El clic en un punto fija una persona. Se mantienen los selectores de eje Y y color, las estadísticas y la tabla de datos.
- **Cuero cabelludo:** en escritorio, los controles **σ variabilidad / μ media** y **NS / SD / Δ** están al costado del topomap, con la escala de colores en vertical. En pantallas estrechas, los controles vuelven arriba y la escala pasa a horizontal. Los selectores muestran una sola etiqueta por botón, con un fondo que indica la opción activa.
- **Distribución por región:** debajo del mapa se mantienen las franjas frontal y centro-temporal, sus promedios y la explicación. **El topomap representa a los 68 participantes** porque los datos por electrodo no están desagregados por sujeto. **Las franjas sí se recalculan con la selección**: el triángulo oscuro representa a todos y el naranja al grupo seleccionado.
- **Cinco minutos:** muestra la theta media del grupo activo por época, con bandas de ±1 error estándar, reproducción y controles de condiciones visibles. Su gráfico se adapta al espacio disponible; se ajustaron los márgenes y las marcas del eje para evitar que las etiquetas se superpongan.

La propuesta inicial de distribución está en [layout-mockup.png](layout-mockup.png); [dashboard-preview.png](dashboard-preview.png) muestra la implementación posterior en el navegador.

## Contenido de la carpeta

```
deliveries/week10/
  index.html              dashboard y método
  css/styles.css          estilos y tokens (paleta, tipografía, motion)
  js/core.js              datos, estado, bus de eventos, paleta, formato, estadística
  js/scatter.js           vista 1 · dispersión con lazo libre, fijado y tabla accesible
  js/topomap.js           vista 2 · cuero cabelludo (IDW + isolíneas + FDR) y franjas por región
  js/dynamics.js          vista 3 · dinámica por época (media ± EE) con reproducción
  js/main.js              carga de datos, controles y arranque
  data/participants.json  71 participantes: cambios NS→SD y moderadores
  data/topo.json          61 electrodos: NS, SD, Δ y p de la t pareada
  data/coords.json        coordenadas 2D de los 61 electrodos
  data/subject_epochs.json potencia theta por época, sujeto, región y condición
  data/data.js            los mismos JSON empaquetados, para abrir con doble clic
  tools/build-data.js     regenera data/data.js desde los JSON
  tools/render_layout_mockup.py genera el mockup PNG (utilidad opcional con Pillow y fuentes de Windows)
  assets/favicon.svg
  layout-mockup.png       propuesta de distribución previa a la implementación
  dashboard-preview.png  captura real del dashboard actualizado
  PresentationWeek10.pdf presentación de la entrega
  PrototypeReport.md      funcionalidades, decisiones, limitaciones y preguntas
  README.md               este archivo
```

Los JSON vienen de `deliveries/week06/data/processed/` (merged_summary, eeg_theta_per_electrode, eeg_theta_epochs_roi), reagregados.

## Cómo ejecutarlo

No requiere instalación ni build.

Necesita conexión a internet para cargar D3 desde su CDN y las fuentes de Google Fonts.

**Servidor local (recomendado).** Desde la raíz de `data-visualization-project`, entra en la carpeta de la entrega e inicia el servidor:

```bash
cd deliveries/week10
python -m http.server 8000
```

Abre `http://localhost:8000`. Detén el servidor con **Ctrl+C**. Tras cambiar HTML, CSS o JavaScript, recarga con **Ctrl+F5** para evitar versiones guardadas en caché.

También puedes servir la misma carpeta con Node:

```bash
npx serve .
```

En ese caso, abre la dirección y el puerto que indique `serve`.

**Alternativa, doble clic.** Abre `index.html`. Si el navegador bloquea `fetch` en `file://`, la página carga `data/data.js` como respaldo. D3 y las fuentes siguen requiriendo internet.

Si cambias algún JSON de `data/`, regenera el respaldo:

```bash
node tools/build-data.js
```

## Despliegue (GitHub Pages)

1. En el repositorio: Settings → Pages → Source: *Deploy from a branch*, rama `main`, carpeta `/ (root)`.
2. Espera a que termine el despliegue y abre `https://<usuario>.github.io/<repositorio>/deliveries/week10/`.

Todas las rutas son relativas, así que funciona en cualquier subcarpeta. Los datos son CC0, por lo que la publicación es legalmente posible.

## Dependencias

- D3.js 7.8.5 desde `cdnjs.cloudflare.com` (incluye d3-contour, d3-force y d3-delaunay).
- Fuentes de Google Fonts: Newsreader (titulares), Schibsted Grotesk (texto), IBM Plex Mono (cifras y metadatos).
- Sin paquetes npm ni paso de compilación.

## Uso rápido

- **Elegir un grupo:** rodea puntos del scatterplot arrastrando el cursor. El lazo selecciona las personas dentro de su forma, en lugar de usar su rectángulo envolvente.
- **Fijar una persona:** haz clic en un punto. La selección del grupo se conserva.
- **Limpiar:** pulsa <kbd>Esc</kbd> o usa «Limpiar selección». <kbd>Esc</kbd> también interrumpe un lazo en curso. Un clic en un espacio vacío del área de dibujo limpia el grupo y la persona fijada.
- **Comparar:** cambia la región EEG, el marcador del eje Y o la variable de color. Usa los controles del topomap para elegir métrica y condición, y los de Cinco minutos para alternar las series o reproducir el registro.
- **Consultar los datos:** abre la tabla bajo la dispersión. En escritorio, la tarjeta permite desplazamiento interno cuando el contenido de la tabla supera su altura.
- **Consultar el método:** usa el enlace Método o desplázate debajo del dashboard para leer procesamiento, codificaciones, estadística y limitaciones.

La página respeta `prefers-reduced-motion` para reducir las animaciones.

## Datos y licencia

Dataset ds004902 bajo CC0. Xiang, Fan, Bai, Lv y Lei (2024), *A resting-state EEG dataset for sleep deprivation*, Scientific Data.
