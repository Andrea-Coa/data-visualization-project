# BATIMIX — Una noche sin dormir (Semana 10)

Prototipo funcional en D3.js sobre la vulnerabilidad individual a la privación de sueño en EEG de reposo. Dataset OpenNeuro ds004902: 71 participantes, 68 con EEG pareado.

El prototipo tiene dos partes:

1. **Historia** (scrollytelling). Los mismos 68 puntos, uno por persona, viajan por siete escenas: cuadrícula, enjambre sobre Δσθ, dispersión con PVT, electrodos del cuero cabelludo y serie temporal de cinco minutos. Todas las cifras del texto se calculan en vivo con los datos.
2. **Explorar**. Tres vistas enlazadas: dispersión (conduce), cuero cabelludo y dinámica (responden). Se puede seleccionar con brush, fijar participantes, cambiar marcador, moderador, región, métrica y condición, y reproducir los cinco minutos.

![Portada](docs/screenshots/01-portada.png)

## Contenido de la carpeta

```
deliveries/week10/
  index.html              página única: historia, explorador y método
  css/styles.css          estilos y tokens (paleta, tipografía, motion)
  js/core.js              datos, estado, bus de eventos, paleta, formato, estadística
  js/story.js             historia por escenas (escenario SVG fijo + IntersectionObserver)
  js/scatter.js           vista 1 · dispersión con brush, fijado y tabla accesible
  js/topomap.js           vista 2 · cuero cabelludo (IDW + isolíneas + FDR) y franjas por región
  js/dynamics.js          vista 3 · dinámica por época (media ± EE) con reproducción
  js/main.js              carga de datos, controles y arranque
  data/participants.json  71 participantes: cambios NS→SD y moderadores
  data/topo.json          61 electrodos: NS, SD, Δ y p de la t pareada
  data/coords.json        coordenadas 2D de los 61 electrodos
  data/subject_epochs.json potencia theta por época, sujeto, región y condición
  data/data.js            los mismos JSON empaquetados, para abrir con doble clic
  tools/build-data.js     regenera data/data.js desde los JSON
  assets/favicon.svg
  docs/screenshots/       capturas del prototipo
  PrototypeReport.md      funcionalidades, decisiones, limitaciones y preguntas
  README.md               este archivo
```

Los JSON vienen de `deliveries/week06/data/processed/` (merged_summary, eeg_theta_per_electrode, eeg_theta_epochs_roi), reagregados.

## Cómo ejecutarlo

No requiere instalación ni build.

**Opción 1, doble clic.** Abre `index.html`. El navegador bloquea `fetch` en `file://`, así que la página carga `data/data.js` como respaldo. Necesita internet para D3 y las fuentes.

**Opción 2, servidor local (recomendado).** Lee los JSON directamente.

```bash
python -m http.server 8000
```

O con Node:

```bash
npx serve .
```

Luego abre `http://localhost:8000` (o el puerto que indique `serve`).

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

- **Historia:** desplázate; cada bloque de texto activa una escena al cruzar el centro de la pantalla.
- **Explorar:** arrastra sobre la dispersión para seleccionar un grupo, haz clic en un punto para fijarlo y pulsa <kbd>Esc</kbd> para limpiar. La tabla bajo la dispersión ofrece los mismos datos sin depender del color ni del cursor.
- Respeta `prefers-reduced-motion`: los puntos no viajan, se funden en su nuevo lugar.

## Datos y licencia

Dataset ds004902 bajo CC0. Xiang, Fan, Bai, Lv y Lei (2024), *A resting-state EEG dataset for sleep deprivation*, Scientific Data.
