# BATIMIX: Una noche sin dormir no le pasa igual a todos

Proyecto del curso **DS5343 Data Visualization** (UTEC, 2026-2, Prof. Germain García-Zanabria).
Explorador interactivo en **D3.js** sobre la vulnerabilidad individual a la privación de sueño en EEG de reposo
(OpenNeuro ds004902, 71 participantes, 68 con EEG en ambas condiciones).

- **Aplicación (Semana 12):** https://andrea-coa.github.io/data-visualization-project/deliveries/week12/app/
- **Página del proyecto:** https://andrea-coa.github.io/data-visualization-project/deliveries/week12/project/
- **Entrega actual:** [`deliveries/week12/`](deliveries/week12/README.md)

## Equipo y responsabilidades

| Integrante | Responsabilidad principal |
|---|---|
| Jimena Gurbillon | Matriz de topomapas (Q1, Q2), datos y métodos |
| Andrea Coa | Dinámica intra-registro y moderadores (Q6, Q7), videos |
| Paolo Medrano | Vulnerabilidad, convergencia y multiverso (Q3 a Q5), resultados |

## Estructura

```
data-visualization-project/
  index.html            redirige a la aplicación de la última entrega (GitHub Pages)
  .nojekyll             GitHub Pages sirve los archivos tal cual, sin Jekyll
  requirements.txt      dependencias de Python para el preprocesamiento
  deliveries/
    week04/             dataset, diccionario y adquisición
    week05/             propuesta
    week06/             análisis de datos, notebooks, datos procesados, bocetos, papers
    week10/             prototipo funcional
    week12/             borrador refinado: app, datos finales, informe, crítica, paper, presentación, página
```

La aplicación tiene tema oscuro (instrumento) y claro (clásico): botón ◐ del header, o `?tema=claro` en la URL.

## Ejecutar en local

```bash
cd deliveries/week12/app
python -m http.server 8000
```

Abrir `http://localhost:8000`. También funciona abriendo `deliveries/week12/app/index.html` con doble clic.

## Publicar en GitHub Pages

1. Subir el repositorio a la rama `main`.
2. En GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, rama `main`, carpeta `/ (root)`.
3. Esperar a que termine el despliegue (pestaña Actions) y abrir `https://andrea-coa.github.io/data-visualization-project/`, que redirige a la aplicación.

Todas las rutas son relativas y los datos son CC0, así que no hace falta ningún paso de build.

## Datos y licencia

OpenNeuro ds004902 (Xiang, Fan, Bai, Lv y Lei, 2024, *Scientific Data*), CC0. Los datos crudos (~8.3 GB) no se versionan: ver `deliveries/week06/README.md` para descargarlos y reproducir el procesamiento.
