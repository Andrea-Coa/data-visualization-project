/* About sheet. Built here (English and Spanish) instead of living as static HTML so that it can be a designed page:
   a short hero, a section nav, key findings as figure cards, the data as chips, the method as numbered steps, robustness
   as a figure strip, limitations, a glossary and the scatter data table (collapsible). renderAbout(lang) is called at
   start-up and by i18n.js when the language changes. */
const renderAbout = (() => {
  const T = {
    en:{
      title:"About BATIMIX", close:"Close", eyebrow:"DS5343 Data Visualization · UTEC 2026-2",
      lead:"Does the night-to-night change in resting theta show who deteriorates after sleep deprivation? Cui et al. (2026) reported that a rise in theta variability tracks PVT slowing (ρ ≈ 0.55, n = 28) on this dataset. BATIMIX re-examines it person by person. <b>Exploratory screening, not diagnosis.</b>",
      nav:[["ab-findings", "Findings"], ["ab-data", "Data"], ["h-method", "Method"], ["h-robust", "Robustness"], ["ab-limits", "Limits"], ["ab-gloss", "Glossary"], ["h-table", "Data table"]],
      findings:"Key findings",
      cards:[["40 / 28", "Heterogeneous", "Δσθ frontal rises in 40 people and falls in 28; group t = 1.12, p = 0.27."],
        ["0 / 61", "Diffuse", "electrodes survive FDR, for σθ and for μθ."],
        ["ρ = −0.04", "Not linked to vigilance", "Δσθ frontal vs ΔPVT median RT: [−0.40, 0.32], n = 30. With Cui's exact pipeline, ρ = −0.06."],
        ["ρ = 0.82", "Oscillatory, not 1/f", "Δσθ tracks periodic theta. The aperiodic offset change seen without ICA (p = 0.034) disappears with ICA."],
        ["ρ = 0.95", "Not blinks", "Removing the blink windows leaves Δσθ unchanged."]],
      data:"Data",
      chips:[["71", "people"], ["68", "with EEG in both nights"], ["61", "electrodes"], ["500 Hz", "sampling"], ["5 min", "eyes-open rest"], ["CC0", "OpenNeuro ds004902"]],
      dataText:cov => `Xiang et al. (2024): 71 people after a normal night and after 24–30 h awake, counterbalanced. No EOG channel. <span data-k="covLong">${cov.EEG} have EEG in both conditions; of these, PVT ${cov.pvt}, KSS ${cov.kss}, SSS ${cov.sss} and PANAS ${cov.panas}.</span>`,
      method:"Method",
      steps:[["Preprocessing", "<code>tools/eeg_ica.py</code>: 50 Hz notch, 1–40 Hz; bad channels interpolated; FCz re-inserted, average reference; extended Infomax ICA (30 components) with ocular (Fp1/Fp2 correlation or ICLabel) and muscle (ICLabel p &gt; 0.85) components removed (5.1 per recording); 75 × 4-s epochs, &gt; 200 µV rejected (71 kept on average)."],
        ["Metric", "Relative θ = 4–8 / 1–40 Hz (Welch) per epoch and electrode. σθ = SD across epochs, μθ = mean; Δ = deprivation − normal. Frontal (16) and centrotemporal (28) regions as in Cui et al."],
        ["Statistics", "Paired t per electrode with Benjamini–Hochberg FDR (61 tests), d<sub>z</sub> and 95% CI; Spearman ρ with 95% CI. Maps: v4 interpolation (EEGLAB, FieldTrip) on the real electrode positions."]],
      robust:"Robustness",
      strip:[["896", "analyses in the multiverse"], ["2000", "permutations for joint inference"], ["p = 0.11", "best joint statistic (σθ only, median r = +0.089)"], ["PANAS+", "the only consistent hint: mood, not vigilance"]],
      robustText:`2 pipelines (with and without ICA) × 4 regions × 2 metrics × 2 change forms × 7 markers × 2 correlations × 2 outlier rules, with joint inference (Simonsohn et al., 2020): no joint statistic exceeds chance. All results: <a href="../data/multiverse_specs.csv">multiverse_specs.csv</a>.`,
      limits:"Limitations",
      limitList:["PVT for only 30 people (power ≈ 0.35 for ρ = 0.3).", "Public PVT summary columns, whereas Cui et al. likely recomputed median RT from the trials.", "ICA components selected by rule, without visual review.", "No task EEG or event markers (no ERP)."],
      gloss:"Glossary",
      glossList:[["PVT, KSS, SSS, PANAS", "Psychomotor vigilance (median RT, lapses, RT SD); Karolinska and Stanford sleepiness; positive and negative affect."],
        ["Vulnerable quadrant", "Δθ and the behavioral change both above their medians."], ["C(e)", "Group consistency at electrode e: share with Δ > 0 minus share with Δ < 0 (−1 to +1)."],
        ["σθ · μθ", "How erratic theta is across epochs · its average level."], ["NS · SD", "Normal sleep · sleep deprivation."]],
      table:"Scatter data", credits:"Jimena Gurbillon, Andrea Coa and Paolo Medrano · DS5343 Data Visualization, UTEC 2026-2. D3.js 7.8.5; Roboto (OFL). Developed with AI assistance (Claude) and reviewed by the team. Method and tasks: README and RefinedDraftReport."},
    es:{
      title:"Acerca de BATIMIX", close:"Cerrar", eyebrow:"DS5343 Visualización de Datos · UTEC 2026-2",
      lead:"¿El cambio de theta en reposo entre una noche y otra muestra quién se deteriora tras la privación de sueño? Cui et al. (2026) informaron que un aumento de la variabilidad theta acompaña al enlentecimiento en el PVT (ρ ≈ 0,55; n = 28) en este conjunto de datos. BATIMIX lo revisa persona por persona. <b>Cribado exploratorio, no diagnóstico.</b>",
      nav:[["ab-findings", "Hallazgos"], ["ab-data", "Datos"], ["h-method", "Método"], ["h-robust", "Robustez"], ["ab-limits", "Límites"], ["ab-gloss", "Glosario"], ["h-table", "Tabla"]],
      findings:"Hallazgos clave",
      cards:[["40 / 28", "Heterogéneo", "Δσθ frontal sube en 40 personas y baja en 28; t de grupo = 1,12; p = 0,27."],
        ["0 / 61", "Difuso", "electrodos sobreviven a FDR, tanto en σθ como en μθ."],
        ["ρ = −0,04", "Sin relación con la vigilancia", "Δσθ frontal frente a ΔTR mediano del PVT: [−0,40; 0,32]; n = 30. Con el pipeline exacto de Cui, ρ = −0,06."],
        ["ρ = 0,82", "Oscilatorio, no 1/f", "Δσθ sigue a la theta periódica. El cambio del desplazamiento aperiódico visto sin ICA (p = 0,034) desaparece con ICA."],
        ["ρ = 0,95", "No son los parpadeos", "Quitar las ventanas con parpadeos deja Δσθ igual."]],
      data:"Datos",
      chips:[["71", "personas"], ["68", "con EEG en las dos noches"], ["61", "electrodos"], ["500 Hz", "muestreo"], ["5 min", "reposo con ojos abiertos"], ["CC0", "OpenNeuro ds004902"]],
      dataText:cov => `Xiang et al. (2024): 71 personas tras una noche normal y tras 24–30 h despiertas, con contrabalanceo. Sin canal EOG. <span data-k="covLong">${cov.EEG} tienen EEG en ambas condiciones; de ellas, PVT ${cov.pvt}, KSS ${cov.kss}, SSS ${cov.sss} y PANAS ${cov.panas}.</span>`,
      method:"Método",
      steps:[["Preprocesamiento", "<code>tools/eeg_ica.py</code>: notch de 50 Hz, 1–40 Hz; canales malos interpolados; FCz reinsertado, referencia promedio; ICA Infomax extendido (30 componentes) con eliminación de componentes oculares (correlación con Fp1/Fp2 o ICLabel) y musculares (ICLabel p &gt; 0,85) (5,1 por registro); 75 épocas de 4 s, se rechazan las de &gt; 200 µV (71 se conservan en promedio)."],
        ["Métrica", "θ relativa = 4–8 / 1–40 Hz (Welch) por época y electrodo. σθ = DE entre épocas, μθ = media; Δ = privación − normal. Regiones frontal (16) y centrotemporal (28) como en Cui et al."],
        ["Estadística", "t pareada por electrodo con FDR de Benjamini–Hochberg (61 pruebas), d<sub>z</sub> e IC 95 %; ρ de Spearman con IC 95 %. Mapas: interpolación v4 (EEGLAB, FieldTrip) sobre las posiciones reales de los electrodos."]],
      robust:"Robustez",
      strip:[["896", "análisis en el multiverso"], ["2000", "permutaciones para la inferencia conjunta"], ["p = 0,11", "mejor estadístico conjunto (solo σθ, r mediana = +0,089)"], ["PANAS+", "el único indicio consistente: ánimo, no vigilancia"]],
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
      <section id="ab-findings"><h3>${t.findings}</h3><div class="ab-cards">${t.cards.map(([n, h, x]) => `<div class="ab-card"><div class="ab-num">${n}</div><h4>${h}</h4><p>${x}</p></div>`).join("")}</div></section>
      <section id="ab-data"><h3>${t.data}</h3><div class="ab-chips">${t.chips.map(([n, l]) => `<div class="ab-chip"><b>${n}</b><span>${l}</span></div>`).join("")}</div>
        <p>${t.dataText({EEG:EEG.length, pvt:cov("d_pvt"), kss:cov("d_kss"), sss:cov("d_sss"), panas:cov("d_panasP")})}</p></section>
      <section id="h-method"><h3>${t.method}</h3><ol class="ab-steps">${t.steps.map(([h, x]) => `<li><div><h4>${h}</h4><p>${x}</p></div></li>`).join("")}</ol></section>
      <section id="h-robust"><h3>${t.robust}</h3><div class="ab-strip">${t.strip.map(([n, l]) => `<div><b>${n}</b><span>${l}</span></div>`).join("")}</div><p>${t.robustText}</p></section>
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
