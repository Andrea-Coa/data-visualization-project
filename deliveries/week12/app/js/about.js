/* About sheet. Built here (English and Spanish) instead of living as static HTML so that it can be a designed page:
   a short hero, a section nav, key findings as figure cards, the data as chips, the method as numbered steps, robustness
   as a figure strip, limitations, a glossary and the scatter data table (collapsible). renderAbout(lang) is called at
   start-up and by i18n.js when the language changes. */
const renderAbout = (() => {
  const T = {
    en:{
      title:"About BATIMIX", close:"Close", eyebrow:"A Visual Analytics System for Individual Vulnerability to Sleep Deprivation · DS5343 Data Visualization · UTEC 2026-2",
      lead:"Does the night-to-night change in resting theta show who deteriorates after sleep deprivation? Cui et al. (2026) reported that a rise in theta variability tracks PVT slowing (ρ ≈ 0.55, n = 28) on this dataset. BATIMIX re-examines it person by person. <b>Exploratory screening, not diagnosis.</b>",
      nav:[["ab-findings", "Findings"], ["ab-data", "Data"], ["h-method", "Method"], ["h-robust", "Robustness"], ["ab-limits", "Limits"], ["ab-gloss", "Glossary"], ["h-table", "Data table"]],
      findings:"Key findings",
      cards:[["46 / 22", "Theta becomes more unstable", "Δσθ frontal rises in 46 people and falls in 22; group t = 6.07, p &lt; 0.001, d<sub>z</sub> = 0.74. Not everyone: 22 people go the other way."],
        ["61 / 61", "Widespread", "electrodes survive FDR for σθ (d<sub>z</sub> 0.28 to 0.75); 42 of 61 for μθ."],
        ["ρ = +0.30", "Not clearly linked to vigilance", "Δσθ centrotemporal vs ΔPVT median RT: [−0.07, +0.59], n = 30, p = 0.11 (frontal +0.18). Same direction as Cui et al., weaker and not significant; with Cui's exact pipeline ρ = +0.33 (p = 0.08)."],
        ["ρ = 0.81", "Mostly oscillatory", "Δσθ tracks periodic theta. The aperiodic offset also rises after deprivation (d<sub>z</sub> = 0.47, p &lt; 0.001), as Bai et al. (2024) reported."],
        ["ρ = 0.94", "Not blinks", "Removing the blink windows leaves Δσθ unchanged."],
        ["AUC 0.89", "A classifier finds the deprivation night", "Given both recordings of a person, explainable models pick the deprivation one in 80% of people (out of fold); θ matters most and the visit is not predictable (AUC 0.52). See the Classifier tab."]],
      data:"Data",
      chips:[["71", "people"], ["68", "with EEG in both nights"], ["61", "electrodes"], ["500 Hz", "sampling"], ["5 min", "eyes-open rest"], ["CC0", "OpenNeuro ds004902"]],
      dataText:cov => `Xiang et al. (2024): 71 people after a normal night and after 24–30 h awake, counterbalanced. No EOG channel. <span data-k="covLong">${cov.EEG} have EEG in both conditions; of these, PVT ${cov.pvt}, KSS ${cov.kss}, SSS ${cov.sss} and PANAS ${cov.panas}.</span>`,
      method:"Method",
      steps:[["Preprocessing", "<code>tools/eeg_ica.py</code>: 50 Hz notch, 1–40 Hz; bad channels interpolated; FCz re-inserted, average reference; extended Infomax ICA (30 components) with ocular (Fp1/Fp2 correlation or ICLabel) and muscle (ICLabel p &gt; 0.85) components removed (7.2 per recording); 75 × 4-s epochs, &gt; 200 µV rejected (72 kept on average). Electrode positions are given to MNE in its own axes (x right, y nose): until 17 Nov 2026 they were rotated by 90°, which misled ICLabel."],
        ["Metric", "Relative θ = 4–8 / 1–40 Hz (Welch) per epoch and electrode. σθ = SD across epochs, μθ = mean; Δ = deprivation − normal. Frontal (16) and centrotemporal (28) regions as in Cui et al."],
        ["Statistics", "Paired t per electrode with Benjamini–Hochberg FDR (61 tests), d<sub>z</sub> and 95% CI; cluster-based permutation test as a global test of each Δ map (Maris and Oostenveld, 2007; 1000 sign-flip permutations, neighbors by Delaunay; checked against MNE; it does not say where, Sassenhagen and Draschkow, 2019); Spearman ρ with 95% CI. Maps: v4 interpolation (EEGLAB, FieldTrip) on the real electrode positions."],
        ["Time and visit order", "Time View: σθ in moving windows (32, 60 or 100 s) or θ per 4-s epoch; a window picked on the chart is tested with FDR within that window only (exploratory). Series: Δ maps in consecutive blocks, FDR over all blocks × 61 electrodes. Crossover: deprivation effect c (each order weighted equally) and visit effect π = 2nd − 1st visit, Welch t per electrode, FDR per row; carryover is descriptive only (Grizzle, 1965; Hills and Armitage, 1979; Freeman, 1989; Senn, 2002; Jones and Kenward, 2014)."],
        ["Checks", "Periodic part: specparam per 4-s epoch (Welch of 1-s windows; Bai et al., 2024 settings), people with ≥ 50 epochs fitted with R² ≥ 0.8. Blinks: detected on Fp1/Fp2 of the raw EEG (no EOG channel); σθ recomputed without the 1-s windows within 0.25 s of a blink. θ synchrony: debiased wPLI², 4–8 Hz, 10 regions (45 pairs), global permutation test and FDR per pair. Similarity: Pearson r between people's Δ maps, 3 nearest neighbors."],
        ["Classifier", "136 recordings (68 people × 2 nights), 147 features: band power, aperiodic 1/f and TSFEL per region. Elastic-net logistic regression and EBM; gradient boosting with SHAP only as a reference. StratifiedGroupKFold by person, 5 folds × 10 repetitions, hyperparameters in a nested CV: every number is out of fold. Permutation test swapping NS and SD within each person; visit control (2nd vs 1st visit with the same features)."]],
      robust:"Robustness",
      strip:[["896", "analyses in the multiverse"], ["2000", "permutations for joint inference"], ["p = 0.28", "best joint statistic (median r = +0.037)"], ["PVT RT", "the most consistent marker (median r = +0.20 over its 128 analyses)"]],
      robustText:`2 pipelines (with and without ICA) × 4 regions × 2 metrics × 2 change forms × 7 markers × 2 correlations × 2 outlier rules, with joint inference (Simonsohn et al., 2020): no joint statistic exceeds chance. All results: <a href="../data/multiverse_specs.csv">multiverse_specs.csv</a>.`,
      limits:"Limitations",
      limitList:["PVT for only 30 people (power ≈ 0.35 for ρ = 0.3).", "Public PVT summary columns, whereas Cui et al. likely recomputed median RT from the trials.", "ICA components selected by rule, without visual review.", "No task EEG or event markers (no ERP)."],
      gloss:"Glossary",
      glossList:[["PVT, KSS, SSS, PANAS", "Psychomotor vigilance (median RT, lapses, RT SD); Karolinska and Stanford sleepiness; positive and negative affect."],
        ["Vulnerable quadrant", "Δθ and the behavioral change both above their medians."], ["C(e)", "Group consistency at electrode e: share with Δ > 0 minus share with Δ < 0 (−1 to +1)."],
        ["σθ · μθ", "How erratic theta is across epochs · its average level."], ["NS · SD", "Normal sleep · sleep deprivation."]],
      table:"Scatter data", credits:"Jimena Gurbillon, Andrea Coa and Paolo Medrano · DS5343 Data Visualization, UTEC 2026-2. D3.js 7.8.5; Roboto (OFL). Developed with AI assistance (Claude) and reviewed by the team. Method and tasks: README and RefinedDraftReport."},
    es:{
      title:"Acerca de BATIMIX", close:"Cerrar", eyebrow:"Un sistema de analítica visual de la vulnerabilidad individual a la privación de sueño · DS5343 Visualización de Datos · UTEC 2026-2",
      lead:"¿El cambio de theta en reposo entre una noche y otra muestra quién se deteriora tras la privación de sueño? Cui et al. (2026) informaron que un aumento de la variabilidad theta acompaña al enlentecimiento en el PVT (ρ ≈ 0,55; n = 28) en este conjunto de datos. BATIMIX lo revisa persona por persona. <b>Cribado exploratorio, no diagnóstico.</b>",
      nav:[["ab-findings", "Hallazgos"], ["ab-data", "Datos"], ["h-method", "Método"], ["h-robust", "Robustez"], ["ab-limits", "Límites"], ["ab-gloss", "Glosario"], ["h-table", "Tabla"]],
      findings:"Hallazgos clave",
      cards:[["46 / 22", "Theta se vuelve más inestable", "Δσθ frontal sube en 46 personas y baja en 22; t de grupo = 6,07; p &lt; 0,001; d<sub>z</sub> = 0,74. No en todos: 22 personas van al revés."],
        ["61 / 61", "Generalizado", "electrodos sobreviven a FDR en σθ (d<sub>z</sub> de 0,28 a 0,75); 42 de 61 en μθ."],
        ["ρ = +0,30", "Sin relación clara con la vigilancia", "Δσθ centrotemporal frente a ΔTR mediano del PVT: [−0,07; +0,59]; n = 30; p = 0,11 (frontal +0,18). Misma dirección que Cui et al., más débil y no significativa; con el pipeline exacto de Cui, ρ = +0,33 (p = 0,08)."],
        ["ρ = 0,81", "Sobre todo oscilatorio", "Δσθ sigue a la theta periódica. El desplazamiento aperiódico también sube tras la privación (d<sub>z</sub> = 0,47; p &lt; 0,001), como informaron Bai et al. (2024)."],
        ["ρ = 0,94", "No son los parpadeos", "Quitar las ventanas con parpadeos deja Δσθ igual."],
        ["AUC 0,89", "Un clasificador encuentra la noche sin dormir", "Con los dos registros de una persona, modelos explicables eligen el de privación en el 80 % de las personas (fuera de fold); θ es lo que más pesa y la visita no se puede predecir (AUC 0,52). Ver la pestaña Clasificador."]],
      data:"Datos",
      chips:[["71", "personas"], ["68", "con EEG en las dos noches"], ["61", "electrodos"], ["500 Hz", "muestreo"], ["5 min", "reposo con ojos abiertos"], ["CC0", "OpenNeuro ds004902"]],
      dataText:cov => `Xiang et al. (2024): 71 personas tras una noche normal y tras 24–30 h despiertas, con contrabalanceo. Sin canal EOG. <span data-k="covLong">${cov.EEG} tienen EEG en ambas condiciones; de ellas, PVT ${cov.pvt}, KSS ${cov.kss}, SSS ${cov.sss} y PANAS ${cov.panas}.</span>`,
      method:"Método",
      steps:[["Preprocesamiento", "<code>tools/eeg_ica.py</code>: notch de 50 Hz, 1–40 Hz; canales malos interpolados; FCz reinsertado, referencia promedio; ICA Infomax extendido (30 componentes) con eliminación de componentes oculares (correlación con Fp1/Fp2 o ICLabel) y musculares (ICLabel p &gt; 0,85) (7,2 por registro); 75 épocas de 4 s, se rechazan las de &gt; 200 µV (72 se conservan en promedio). Las posiciones de los electrodos se le dan a MNE en sus propios ejes (x a la derecha, y hacia la nariz): hasta el 17 nov 2026 iban giradas 90°, lo que confundía a ICLabel."],
        ["Métrica", "θ relativa = 4–8 / 1–40 Hz (Welch) por época y electrodo. σθ = DE entre épocas, μθ = media; Δ = privación − normal. Regiones frontal (16) y centrotemporal (28) como en Cui et al."],
        ["Estadística", "t pareada por electrodo con FDR de Benjamini–Hochberg (61 pruebas), d<sub>z</sub> e IC 95 %; prueba de permutación por clusters como prueba global de cada mapa Δ (Maris y Oostenveld, 2007; 1000 permutaciones de signo, vecinos por Delaunay; verificada contra MNE; no dice dónde, Sassenhagen y Draschkow, 2019); ρ de Spearman con IC 95 %. Mapas: interpolación v4 (EEGLAB, FieldTrip) sobre las posiciones reales de los electrodos."],
        ["Tiempo y orden de visita", "Vista de tiempo: σθ en ventanas móviles (32, 60 o 100 s) o θ por época de 4 s; una ventana elegida en el gráfico se prueba con FDR solo dentro de esa ventana (exploratorio). Serie: mapas Δ en bloques consecutivos, FDR sobre todos los bloques × 61 electrodos. Cruzado: efecto de privación c (cada orden con el mismo peso) y efecto de visita π = 2.ª − 1.ª visita, t de Welch por electrodo, FDR por fila; el arrastre es solo descriptivo (Grizzle, 1965; Hills y Armitage, 1979; Freeman, 1989; Senn, 2002; Jones y Kenward, 2014)."],
        ["Comprobaciones", "Parte periódica: specparam por época de 4 s (Welch de ventanas de 1 s; ajustes de Bai et al., 2024), personas con ≥ 50 épocas ajustadas con R² ≥ 0,8. Parpadeos: detectados en Fp1/Fp2 del EEG crudo (no hay canal EOG); σθ recalculada sin las ventanas de 1 s a menos de 0,25 s de un parpadeo. Sincronía θ: wPLI² sin sesgo, 4–8 Hz, 10 regiones (45 pares), prueba de permutación global y FDR por par. Similitud: r de Pearson entre los mapas Δ de las personas, 3 vecinos más cercanos."],
        ["Clasificador", "136 grabaciones (68 personas × 2 noches), 147 rasgos: potencia por banda, 1/f aperiódico y TSFEL por región. Regresión logística elastic-net y EBM; gradient boosting con SHAP solo como referencia. StratifiedGroupKFold por persona, 5 pliegues × 10 repeticiones, hiperparámetros en una CV anidada: todo número es fuera de pliegue. Prueba de permutación intercambiando NS y SD dentro de cada persona; control de visita (2.ª frente a 1.ª visita con los mismos rasgos)."]],
      robust:"Robustez",
      strip:[["896", "análisis en el multiverso"], ["2000", "permutaciones para la inferencia conjunta"], ["p = 0,28", "mejor estadístico conjunto (r mediana = +0,037)"], ["TR del PVT", "el marcador más consistente (r mediana = +0,20 en sus 128 análisis)"]],
      robustText:`2 pipelines (con y sin ICA) × 4 regiones × 2 métricas × 2 formas de cambio × 7 marcadores × 2 correlaciones × 2 reglas de atípicos, con inferencia conjunta (Simonsohn et al., 2020): ningún estadístico conjunto supera el azar. Todos los resultados: <a href="../data/multiverse_specs.csv">multiverse_specs.csv</a>.`,
      limits:"Limitaciones",
      limitList:["PVT solo en 30 personas (potencia ≈ 0,35 para ρ = 0,3).", "Columnas de resumen públicas del PVT, mientras que Cui et al. probablemente recalcularon el TR mediano desde los ensayos.", "Componentes ICA elegidos por regla, sin revisión visual.", "Sin EEG de tarea ni marcadores de eventos (sin ERP)."],
      gloss:"Glosario",
      glossList:[["PVT, KSS, SSS, PANAS", "Vigilancia psicomotora (TR mediano, lapsos, DE del TR); somnolencia de Karolinska y de Stanford; afecto positivo y negativo."],
        ["Cuadrante vulnerable", "Δθ y cambio conductual ambos por encima de sus medianas."], ["C(e)", "Consistencia del grupo en el electrodo e: proporción con Δ > 0 menos proporción con Δ < 0 (−1 a +1)."],
        ["σθ · μθ", "Qué tan irregular es theta entre épocas · su nivel medio."], ["NS · SD", "Sueño normal · privación de sueño."]],
      table:"Datos del gráfico de dispersión", credits:"Jimena Gurbillon, Andrea Coa y Paolo Medrano · DS5343 Visualización de Datos, UTEC 2026-2. D3.js 7.8.5; Roboto (OFL). Desarrollado con asistencia de IA (Claude) y revisado por el equipo. Método y tareas: README y RefinedDraftReport."},
  };
  return function render(lang){
    const t = T[lang === "es" ? "es" : "en"], dlg = $("about"); if(!dlg) return;
    const cov = k => EEG.filter(d => d[k] != null).length;
    const body = dlg.querySelector(".sheet-body"), head = $("h-about"), btn = dlg.querySelector("[data-close]");
    head.textContent = t.title; btn.textContent = t.close;
    body.innerHTML = `
      <div class="ab-hero"><div class="ab-eyebrow">${t.eyebrow}</div><p class="ab-lead">${t.lead}</p></div>
      <nav class="ab-nav" aria-label="${t.title}">${t.nav.map(([id, l]) => `<a href="#${id}" data-ab="${id}">${l}</a>`).join("")}</nav>
      <section id="ab-findings" data-theta-only><h3>${t.findings}</h3><div class="ab-cards">${t.cards.map(([n, h, x]) => `<div class="ab-card"><div class="ab-num">${n}</div><h4>${h}</h4><p>${x}</p></div>`).join("")}</div></section>
      <section id="ab-data"><h3>${t.data}</h3><div class="ab-chips">${t.chips.map(([n, l]) => `<div class="ab-chip"><b>${n}</b><span>${l}</span></div>`).join("")}</div>
        <p>${t.dataText({EEG:EEG.length, pvt:cov("d_pvt"), kss:cov("d_kss"), sss:cov("d_sss"), panas:cov("d_panasP")})}</p></section>
      <section id="h-method"><h3>${t.method}</h3><ol class="ab-steps">${t.steps.map(([h, x]) => `<li><div><h4>${h}</h4><p>${x}</p></div></li>`).join("")}</ol></section>
      <section id="h-robust" data-theta-only><h3>${t.robust}</h3><div class="ab-strip">${t.strip.map(([n, l]) => `<div><b>${n}</b><span>${l}</span></div>`).join("")}</div><p>${t.robustText}</p></section>
      <section id="ab-limits"><h3>${t.limits}</h3><ul class="ab-limits">${t.limitList.map(x => `<li>${x}</li>`).join("")}</ul></section>
      <section id="ab-gloss"><h3>${t.gloss}</h3><dl class="ab-gloss">${t.glossList.map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join("")}</dl></section>
      <section id="h-table"><details><summary>${t.table}</summary><div class="tscroll"><table id="dtable"></table></div></details></section>
      <p class="ab-credits">${t.credits}</p>`;
    // the nav scrolls inside the sheet (the sticky bar would otherwise hide the target)
    body.querySelectorAll(".ab-nav a").forEach(a => a.addEventListener("click", e => {
      e.preventDefault(); const el = $(a.dataset.ab); if(!el) return;
      if(el.querySelector("details")) el.querySelector("details").open = true;
      body.scrollTo({top:el.offsetTop-52, behavior:matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"});
    }));
    // scroll-spy for the nav
    const links = [...body.querySelectorAll(".ab-nav a")];
    body.onscroll = () => { let cur = links[0]; links.forEach(a => { const el = $(a.dataset.ab); if(el && el.offsetTop-80 <= body.scrollTop) cur = a; }); links.forEach(a => a.classList.toggle("on", a === cur)); };
    body.onscroll();
    if(typeof scatter !== "undefined") scatter.render();   // refills the scatter data table
  };
})();
