# Exposición final (10 min)

Presentación en formato scrollytelling: `index.html` (una diapositiva por pantalla, con la aplicación en vivo en las demostraciones).
Estructura: **2 min** problema, audiencia, motivación y datos · **6 min** tareas y fundamentos de diseño (con "en cristiano") · **2 min** conclusiones, limitaciones y trabajo futuro.

- **Atajos del orador** (no se ve nada de apoyo para el público): ↓ → espacio avanzan, ↑ ← retroceden, `N` notas, `T` cronómetro (aparece solo al pulsarlo), `F` pantalla completa, `Esc` sale de "Probar la herramienta". `?static` desactiva las animaciones de entrada (capturas).
- **Notas del orador:** en el atributo `data-notes` de cada `<section>`, con el tiempo sugerido al final de cada nota. El tiempo previsto es 2 min la parte 1, 6 min la parte 2 y 2 min la parte 3.
- **Imagen de "En cristiano":** guardar el archivo como `img/en-cristiano.jpg` (mientras no exista se ve un recuadro de aviso).
- **Servir:** desde `deliveries/week12/`, `python -m http.server 8000` y abrir `http://localhost:8000/expo/`.
- **PDF para entregar** (`BATIMIX_Expo.pdf`, una diapositiva por página; las demostraciones llevan una captura de `img/`):
  `chrome --headless --no-pdf-header-footer --virtual-time-budget=20000 --print-to-pdf=BATIMIX_Expo.pdf http://localhost:8000/expo/index.html`
- **Capturas de las demostraciones:** se generan con la aplicación y los parámetros `?theme=light&focus=topo|scatter|heat|maps|bar` o `&tab=classifier` (ver `app/js/embed.js`).
- Las cifras son las **corregidas** (corrección de sesiones del 15 de noviembre de 2026: `research/correccion_sesiones.md`).
