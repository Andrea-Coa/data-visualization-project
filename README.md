# BATIMIX: One sleepless night does not affect everyone the same way

Course project for **DS5343 Data Visualization** (UTEC, 2026-2, Prof. Germain García-Zanabria).
An interactive **D3.js** explorer of individual vulnerability to sleep deprivation in resting-state EEG
(OpenNeuro ds004902, 71 participants, 68 with EEG in both conditions).

- **Application (Week 12):** https://andrea-coa.github.io/data-visualization-project/deliveries/week12/app/
- **Project page:** https://andrea-coa.github.io/data-visualization-project/deliveries/week12/project/
- **Current delivery:** [`deliveries/week12/`](deliveries/week12/README.md)

## Team and responsibilities

| Member | Main responsibility |
|---|---|
| Jimena Gurbillon | Topomap matrix (Q1, Q2), data and methods |
| Andrea Coa | Within-recording dynamics and moderators (Q6, Q7), videos |
| Paolo Medrano | Vulnerability, convergence and multiverse (Q3 to Q5), results |

## Structure

```
data-visualization-project/
  index.html            redirects to the application of the latest delivery (GitHub Pages)
  .nojekyll             GitHub Pages serves the files as they are, without Jekyll
  requirements.txt      Python dependencies for preprocessing, secondary views and tests
  deliveries/
    week04/             dataset, data dictionary and acquisition
    week05/             proposal
    week06/             data analysis, notebooks, processed data, sketches, papers
    week10/             working prototype
    week12/             refined draft: app, final data, report, critique response, paper, presentation, page
```

The application has a light theme (classic, default) and a dark theme (instrument): ◐ button in the header, or `?theme=dark` in the URL. The interface is in English.

## Run locally

```bash
cd deliveries/week12/app
python -m http.server 8000
```

Open `http://localhost:8000`. Opening `deliveries/week12/app/index.html` by double-click also works.

## Publish on GitHub Pages

1. Push the repository to the `main` branch.
2. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, branch `main`, folder `/ (root)`.
3. Wait for the deployment to finish (Actions tab) and open `https://andrea-coa.github.io/data-visualization-project/`, which redirects to the application.

All paths are relative and the data are CC0, so no build step is needed.

## Data and license

OpenNeuro ds004902 (Xiang, Fan, Bai, Lv and Lei, 2024, *Scientific Data*), CC0. The raw data (~8.3 GB) are not versioned: see `deliveries/week06/README.md` to download them and reproduce the processing.
