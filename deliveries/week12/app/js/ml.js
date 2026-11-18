/* BATIMIX · pestaña Classifier (antes la página ml.html; fases ML5 y ML6 de PLAN.md). Vive dentro de index.html: se
   carga la primera vez que se abre la pestaña, comparte tema y selección con Explorer, y #classifier en la URL la abre. Datos: data/ml.json (tools/build_ml.py).
   Pregunta: ¿qué propiedades del EEG de reposo, de qué región y banda, distinguen la noche sin dormir, y es eso
   privación o solo la segunda visita? Mantra de Shneiderman: overview (tarjetas, registros, importancia agrupada),
   zoom y filtro (escenario, modelo, orden, errores, familia de features, brush) y details on demand (persona).
   Diseño en tres columnas como las herramientas de análisis visual de modelos: controles, resultado e importancia a la
   izquierda; registros y features al centro; matriz de confusión y persona a la derecha.
   Reutiliza de core.js la paleta (C), formatos, tooltip, setTitle y setupSeg. Interfaz en inglés. */
(() => {
  let M = null;
  const ST = {sc:"paired", md:"lr", order:"all", show:"all", ff:"all", person:null, feat:null, brush:null};
  const BANDN = {theta:"θ", delta:"δ", alpha:"α", beta:"β", aperiodic:"1/f", broadband:"no band"};
  const ROIN = {front:"Frontal", ct:"Centro-temp.", post:"Posterior"};
  const DOMN = {"band power":"Bands", aperiodic:"1/f", spectral:"Spectral", statistical:"Statistical"};
  // nombre completo de cada grupo para el tooltip de la importancia
  const LONG = {broadband:"TSFEL features without a band", ct:"Centrotemporal", "band power":"Band power (σ and μ of each band)", aperiodic:"Aperiodic (1/f exponent and offset)",
    spectral:"Spectral features (TSFEL)", statistical:"Statistical features (TSFEL)"};
  const MDN = {lr:"logistic regression", ebm:"EBM"};
  const fmt3 = L.format(".3f"), fmt2 = L.format(".2f"), pct = L.format(".0%");

  // ---------------------------------------------------------------- acceso a los datos
  const S = () => M.scenarios[ST.sc], R = () => S().models[ST.md];
  const F = c => M.features[c] || {label:c};
  const lab = c => F(c).label;
  const isSD = i => M.records[i].cond === "SD";
  const prob = i => R().prob[i];
  const correct = i => (prob(i) >= .5) === isSD(i);
  const featOk = c => { const d = F(c); if(ST.ff === "all") return true;
    if(["theta", "delta", "alpha", "beta"].includes(ST.ff)) return d.band === ST.ff;
    if(ST.ff === "aperiodic") return d.domain === "aperiodic";
    return d.domain === ST.ff; };
  const groupOk = g => ST.ff === "all" || (g.kind === "band" && (g.group === ST.ff || (ST.ff === "aperiodic" && g.group === "aperiodic"))) ||
    (g.kind === "domain" && (g.group === ST.ff || (ST.ff === "aperiodic" && g.group === "aperiodic") || (["theta", "delta", "alpha", "beta"].includes(ST.ff) && g.group === "band power")));
  const visible = i => (ST.order === "all" || M.records[i].order === ST.order) && (ST.show === "all" || !correct(i));
  const personIdx = id => M.records.map((r, i) => r.id === id ? i : -1).filter(i => i >= 0);
  const ci = m => `[${fmt2(m.lo)}, ${fmt2(m.hi)}]`;

  // ---------------------------------------------------------------- tarjetas
  function drawCards(){
    const r = R(), s = S(), m = r.metrics, ctl = s.controls, x = r.xai;
    const vAuc = ctl.visit_lr.auc.mean, cAuc = m.auc.mean, warn = vAuc > cAuc - .05;
    const w = $("warn"); w.hidden = !warn;
    if(warn) w.textContent = `The visit (1st vs 2nd) is predicted almost as well as the condition (AUC ${fmt2(vAuc)} vs ${fmt2(cAuc)}): the model may be learning the visit, not the deprivation.`;
    // tabla mínima (estilo de figura de revista): rótulo, valor y detalle; sin recuadros
    const pmin = r.perm.p <= 1/(r.perm.n+1) + 5e-4;
    const rows = [
      ["AUC", fmt2(cAuc), `${fmt2(m.auc.lo)}–${fmt2(m.auc.hi)}`, `ROC AUC out of fold (${MDN[ST.md]}), mean and range over 10 repetitions of the cross-validation; chance = 0.50`],
      ["Pair accuracy", pct(m.pairacc.mean), "of 68 people", "Share of people whose deprivation recording gets the higher predicted P(SD)"],
    ];
    if(ST.brush && ST.brush.size){
      const idx = [...ST.brush].flatMap(personIdx), ok = idx.filter(correct).length;
      rows.push(["Your selection", pct(ok/idx.length), `${idx.length} rec.`, `${ok} of ${idx.length} recordings right (${ST.brush.size} people); no test, you chose them`]);
    }
    d3.select("#cards").html(`<table class="mtab">${rows.map(([k, v, d, t]) => `<tr title="${t}"><th>${k}</th><td class="v">${v}</td><td class="d">${d}</td></tr>`).join("")}</table>`);
    setTitle("t-cards", "", "",
      notes(ST.sc === "paired" ? "Question: given both recordings of a person, which one is after sleep deprivation?" : "Question: each recording alone, from a new person: normal sleep or deprivation?",
        `${M.meta.n_records} recordings of ${M.meta.n_persons} people (eyes open). Cross-validation by person: ${N_CV}; hyperparameters chosen in a nested CV, so every number here is out of fold.`,
        ST.sc === "paired" ? "Paired scenario: each person's two recordings are centered on their own mean before the model, so it only sees how the two nights differ (no labels used). It needs both recordings of the person." :
          "Strict scenario: raw features of a single recording from a person the model never saw; features that depend on the absolute signal scale are left out.",
        `Permutation test: NS and SD labels are swapped within each person at random (the null for a paired design). Visit control: the same model predicting 2nd vs 1st visit; if it worked as well, the classifier would be learning habituation, not deprivation.`,
        "Exploratory: 136 recordings, 147 features. Stability and fidelity say how far single features can be trusted; read the grouped importance first."));
  }
  const N_CV = "5 folds × 10 repetitions (StratifiedGroupKFold)";

  // Validation del clasificador: las mismas filas con mini gráfico que en Explorer, solo para ver (sin clic). Escala de
  // AUC 0.3–1 con el azar (0.5) punteado; llena = el modelo, vacía = la comparación
  function drawMlVal(){
    const r = R(), s = S(), m = r.metrics, ctl = s.controls, x = r.xai, cAuc = m.auc.mean, vAuc = ctl.visit_lr.auc.mean;
    const pmin = r.perm.p <= 1/(r.perm.n+1) + 5e-4, A = [0.3, 1], f2 = fmt2, fid = x.fidelity.auc_without_top10.mean, gbm = s.models.gbm.metrics.auc.mean;
    const rows = [
      {id:"visit", k:"Not the visit", v:f2(vAuc), dom:A, ref:.5, refLab:"chance", marks:[{v:cAuc, lab:"AUC, condition"}, {v:vAuc, open:true, lab:"AUC, visit (2nd vs 1st)"}],
        tip:`Filled: AUC predicting the condition (${f2(cAuc)}). Empty: the same features predicting the visit, 2nd vs 1st (${f2(vAuc)}). At chance (0.50) the model is not learning habituation.`},
      {id:"perm", k:"Permutation", v:`p ${pmin ? "≤" : "="} ${fp(r.perm.p).replace("< ", "")}`, dom:A, ref:.5, band:[r.perm.null.lo, r.perm.null.hi], marks:[{v:cAuc, lab:"AUC observed"}],
        tip:`Gray band: 95% of the AUCs when NS and SD are swapped at random within each person (${r.perm.n} times${r.perm.fixed_params ? ", hyperparameters fixed" : ""}). Dot: the observed AUC.${pmin ? " None of the permutations reached it." : ""}`},
      {id:"order", k:"Visit order", v:`${f2(r.byOrder["NS->SD"].pairacc)} · ${f2(r.byOrder["SD->NS"].pairacc)}`, dom:A, ref:.5,
        marks:[{v:r.byOrder["NS->SD"].pairacc, lab:`Pair accuracy, NS→SD (${r.byOrder["NS->SD"].n})`}, {v:r.byOrder["SD->NS"].pairacc, open:true, lab:`Pair accuracy, SD→NS (${r.byOrder["SD->NS"].n})`}],
        tip:`Pair accuracy in each visit order. Filled: normal sleep first (${r.byOrder["NS->SD"].n} people); empty: deprivation first (${r.byOrder["SD->NS"].n}). Close values: the result does not depend on the order.`},
      {id:"base", k:"Bands + 1/f", v:f2(ctl.project_only_lr.auc.mean), dom:A, ref:.5,
        marks:[{v:s.models.lr.metrics.auc.mean, lab:"AUC, all features"}, {v:ctl.project_only_lr.auc.mean, open:true, lab:"AUC, band and 1/f features only"}, {v:gbm, open:true, lab:"AUC, black-box GBM"}],
        tip:`Filled: AUC with all ${s.cols.length} features. Empty: with the ${ctl.project_only_lr.n_features} band and 1/f features only (${f2(ctl.project_only_lr.auc.mean)}), and a black-box gradient boosting (${f2(gbm)}). TSFEL adds little; the explainable model does not lose.`},
      {id:"fid", k:"Fidelity", v:f2(fid), dom:A, ref:.5, marks:[{v:cAuc, lab:"AUC, full model"}, {v:fid, open:true, lab:"AUC, retrained without its top 10"}],
        tip:`Fidelity: AUC retrained without its 10 most important features (${f2(fid)}; with only them: ${f2(x.fidelity.auc_only_top10.mean)}). Similar to the full model: other, correlated features carry the same information.`},
      {id:"stab", k:"Stability", v:`τ ${f2(x.stability.kendall_tau)}`, dom:[0, 1],
        marks:[{v:x.stability.kendall_tau, lab:"Kendall τ of the ranking between folds"}, {v:s.agreement.lr_ebm_spearman, open:true, lab:"Spearman ρ, logistic vs EBM importance"}],
        tip:`Filled: how stable the feature ranking is between folds (Kendall τ; 1 = identical). Empty: agreement between the two models' importance (Spearman ρ). Moderate stability: read groups of features, not single ones.`},
    ];
    miniRows($("mlvlist"), rows);
  }

  // ---------------------------------------------------------------- registros (PCA)
  let brushG = null;
  function drawRec(){
    const el = $("rec"); d3.select(el).selectAll("*").remove();
    const W = el.clientWidth || 400, H = Math.max(150, el.clientHeight || 360), m = {l:40, r:12, t:8, b:34};
    const P = S().pca, pts = M.records.map((r, i) => ({i, id:r.id, x:P.coords[i][0], y:P.coords[i][1]}));
    const sx = d3.scaleLinear().domain(d3.extent(pts, d => d.x)).nice().range([m.l, W-m.r]);
    const sy = d3.scaleLinear().domain(d3.extent(pts, d => d.y)).nice().range([H-m.b, m.t]);
    const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("height", H).attr("role", "img")
      .attr("aria-label", `PCA of ${pts.length} recordings colored by predicted probability of sleep deprivation`);
    svg.append("g").attr("class", "axis").attr("transform", `translate(0,${H-m.b})`).call(d3.axisBottom(sx).ticks(5).tickSizeOuter(0).tickFormat(fTick(L.format("~f"))));
    svg.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(sy).ticks(5).tickSizeOuter(0).tickFormat(fTick(L.format("~f")))).call(a => a.select(".domain").remove());
    svg.append("text").attr("class", "atitle").attr("x", (m.l+W-m.r)/2).attr("y", H-4).attr("text-anchor", "middle").text(`PC1 (${pct(P.var[0])} of variance)`);
    svg.append("text").attr("class", "atitle").attr("transform", "rotate(-90)").attr("x", -(m.t+H-m.b)/2).attr("y", 10).attr("text-anchor", "middle").text(`PC2 (${pct(P.var[1])})`);
    // brush primero (debajo), así los puntos siguen recibiendo el cursor y el clic
    brushG = svg.append("g").attr("class", "brush");
    const br = d3.brush().extent([[m.l, m.t], [W-m.r, H-m.b]]).on("end", ev => {
      if(!ev.selection){ if(ST.brush){ ST.brush = null; drawCards(); paint(); } return; }
      const [[x0, y0], [x1, y1]] = ev.selection;
      ST.brush = new Set(pts.filter(d => visible(d.i) && sx(d.x) >= x0 && sx(d.x) <= x1 && sy(d.y) >= y0 && sy(d.y) <= y1).map(d => d.id));
      drawCards(); paint();
    });
    brushG.call(br);
    // una línea une los dos registros de cada persona
    const byId = d3.group(pts, d => d.id);
    const lines = svg.append("g").selectAll("line").data([...byId.values()].filter(v => v.length === 2)).join("line")
      .attr("x1", d => sx(d[0].x)).attr("y1", d => sy(d[0].y)).attr("x2", d => sx(d[1].x)).attr("y2", d => sy(d[1].y))
      .attr("stroke", C.rule2).attr("stroke-width", 1).style("cursor", "pointer")
      .on("click", (ev, d) => pick(d[0].id));
    const sym = d3.symbol().size(54);
    const dots = svg.append("g").selectAll("path").data(pts).join("path")
      .attr("transform", d => `translate(${sx(d.x)},${sy(d.y)})`)
      .attr("d", d => sym.type(isSD(d.i) ? d3.symbolDiamond : d3.symbolCircle)())
      .style("cursor", "pointer")
      .on("pointerenter", (ev, d) => { const r = M.records[d.i]; showTip(ev, `<div class="h">${r.id}</div>` + trow("Recording", r.cond === "SD" ? "Sleep Deprivation" : "Normal Sleep") +
          trow("Predicted P(SD)", fmt2(prob(d.i))) + trow("Model", correct(d.i) ? "correct" : "wrong") + trow("Order · visit", `${r.order.replace("->", "→")} · ${r.visit === 1 ? "1st" : "2nd"}`)); })
      .on("pointermove", ev => moveTip(ev)).on("pointerleave", hideTip)
      .on("click", (ev, d) => { hideTip(); pick(d.id); });
    function paint(){
      const on = d => visible(d.i) && (!ST.brush || ST.brush.has(d.id));
      dots.attr("fill", d => C.div(prob(d.i))).attr("stroke", d => d.id === ST.person ? C.ink : (correct(d.i) ? C.ink2 : C.vuln))
        .attr("stroke-width", d => d.id === ST.person ? 2.4 : (correct(d.i) ? .7 : 2)).attr("opacity", d => on(d) ? 1 : .12);
      lines.attr("opacity", d => d.some(on) ? (d[0].id === ST.person ? 1 : .55) : .08).attr("stroke", d => d[0].id === ST.person ? C.ink : C.rule2)
        .attr("stroke-width", d => d[0].id === ST.person ? 2 : 1);
      dots.filter(d => d.id === ST.person).raise();
    }
    paint();
    const k = d3.select("#k-rec").html("");
    k.append("span").attr("class", "k").html(`<i class="dot" style="border:1px solid ${C.ink2}"></i>NS`);
    k.append("span").attr("class", "k").html(`<svg width="10" height="10" viewBox="-5 -5 10 10"><path d="${d3.symbol(d3.symbolDiamond, 40)()}" fill="none" stroke="${C.ink2}"/></svg>SD`);
    k.append("span").attr("class", "k").html(`<i style="width:44px;height:8px;border-radius:2px;background:linear-gradient(90deg,${[0, .25, .5, .75, 1].map(t => C.div(t)).join(",")})"></i>P(SD) 0→1`);
    k.append("span").attr("class", "k").html(`<i class="ring" style="border-color:${C.vuln}"></i>wrong`);
    const ld = P.loadings, ldTxt = pc => ld[pc].slice(0, 4).map(([c, w]) => `${lab(c)} (${L.format("+.2f")(w)})`).join(", ");
    setTitle("t-rec", `${M.records.length} recordings`, "out-of-fold predictions",
      notes(`Each mark is one recording: circle = normal sleep, diamond = sleep deprivation (true condition). Fill = probability of deprivation predicted when that person was in the test fold (blue, low; pink, high). Amber ring = the model got it wrong. A line joins each person's two recordings.`,
        `Axes: PCA of the standardized features of this scenario (unsupervised, deterministic). PC1 loads on ${ldTxt("pc1")}; PC2 on ${ldTxt("pc2")}. ${ST.sc === "paired" ? "In the paired scenario the two recordings of a person sit symmetric around 0." : ""}`,
        "Drag to select people (the Result shows how many of their recordings are right; no test, since you chose them). Click a mark or a line to see that person on the right."));
  }

  // ---------------------------------------------------------------- importancia agrupada
  function drawImp(){
    // columna angosta: tres bloques apilados (banda, región, dominio) con la misma escala; el alto de fila se ajusta
    const el = $("imp"); d3.select(el).selectAll("*").remove();
    const G = R().groups, W = el.clientWidth || 260, Hv = Math.max(60, el.clientHeight || 300);
    const blocks = [["band", "By band", g => BANDN[g] || g], ["roi", "By region", g => ROIN[g] || g], ["domain", "By domain", g => DOMN[g] || g]];
    let rows = blocks.map(([k, t, nm]) => ({t, items:Object.values(G).filter(g => g.kind === k).sort((a, b) => b.mean-a.mean).map(g => ({...g, name:nm(g.group)}))}));
    const head = 13, axH = 18, need = rs => d3.sum(rs, r => r.items.length)*9 + rs.length*(head+4) + axH;
    while(rows.length > 1 && need(rows) > Hv) rows = rows.slice(0, -1);   // ventana baja: primero la banda, luego región y dominio
    const hidden = blocks.length - rows.length, nIt = d3.sum(rows, r => r.items.length);
    const rowH = Math.max(9, Math.min(17, (Hv - rows.length*(head+4) - axH)/nIt));
    const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${Hv}`).attr("height", Hv).attr("role", "img").attr("aria-label", "Drop in AUC when each group of features is shuffled");
    const all = Object.values(G), lw = Math.min(84, W*.33);
    const x = d3.scaleLinear().domain([Math.min(0, d3.min(all, g => g.lo)), d3.max(all, g => g.hi)]).nice().range([lw, W-24]);
    let y = 0;
    rows.forEach(r => {
      svg.append("text").attr("class", "sub").attr("x", 0).attr("y", y+10).text(r.t.toUpperCase());
      y += head;
      svg.append("line").attr("x1", x(0)).attr("x2", x(0)).attr("y1", y).attr("y2", y + r.items.length*rowH).attr("stroke", C.rule2);
      r.items.forEach(g => {
        const cy = y + rowH/2, gg = svg.append("g").attr("class", groupOk(g) ? "" : "dim");
        gg.append("text").attr("class", "flab").attr("x", lw-5).attr("y", cy+3.5).attr("text-anchor", "end").text(trunc(g.name, lw+4));
        gg.append("rect").attr("x", Math.min(x(0), x(g.mean))).attr("y", cy-Math.min(4.5, rowH*.32)).attr("width", Math.abs(x(g.mean)-x(0))).attr("height", Math.min(9, rowH*.64)).attr("rx", 2)
          .attr("fill", g.group === "theta" ? C.sd : C.ink2).attr("opacity", .85);
        gg.append("line").attr("x1", x(g.lo)).attr("x2", x(g.hi)).attr("y1", cy).attr("y2", cy).attr("stroke", C.ink).attr("stroke-width", 1);
        gg.append("text").attr("class", "sub").attr("x", W-1).attr("y", cy+3.5).attr("text-anchor", "end").text(g.n);
        gg.append("rect").attr("x", 0).attr("y", cy-rowH/2).attr("width", W).attr("height", rowH).attr("fill", "transparent")
          .on("pointerenter", ev => showTip(ev, `<div class="h">${LONG[g.group] || g.name}</div>` + trow("ΔAUC when shuffled", `${fmt3(g.mean)} [${fmt3(g.lo)}, ${fmt3(g.hi)}]`) + trow("Features in group", g.n)))
          .on("pointermove", ev => moveTip(ev)).on("pointerleave", hideTip);
        y += rowH;
      });
      y += 4;
    });
    svg.append("g").attr("class", "axis").attr("transform", `translate(0,${y})`).call(d3.axisBottom(x).ticks(3).tickSizeOuter(0).tickFormat(fTick(L.format(".1f"))));
    setTitle("t-imp", "ΔAUC when a group is shuffled", "",
      notes(hidden ? `Only ${rows.length === 1 ? "the band block fits" : "the band and region blocks fit"} in this window; enlarge it to see the rest.` : "", `Grouped permutation importance (${MDN[ST.md]}): in each test fold, all features of a group are shuffled together and the drop in AUC is measured (bar = mean, line = 95% range over folds and repeats). The three blocks share the same scale; the number at the right is how many features each group has.`,
        "Groups, not single features: the features are correlated, so shuffling one alone hides what its neighbors carry. The TSFEL features without a band form one large group.",
        "Theta is highlighted. The Features filter in Controls dims the other groups."));
  }

  // ---------------------------------------------------------------- features (coeficientes de LR o curvas de la EBM)
  function drawFeat(){
    const el = $("feat"); d3.select(el).selectAll("*").remove(); d3.select("#k-feat").html("");
    const W = el.clientWidth || 400, Hv = Math.max(150, el.clientHeight || 360);
    if(ST.md === "lr"){
      const nf = Math.max(5, Math.min(15, Math.floor((Hv-48)/14))), Cf = Object.entries(R().coef).slice(0, nf), rowH = Math.max(13, Math.min(20, (Hv-48)/Cf.length)), H = Cf.length*rowH + 30;
      const lw = Math.min(230, W*.36), x = d3.scaleLinear().domain(d3.extent(Cf.flatMap(([, v]) => [v.lo, v.hi, 0]))).nice().range([lw, W-34]);
      const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("height", H).attr("role", "img").attr("aria-label", "Logistic regression coefficients across folds");
      svg.append("line").attr("x1", x(0)).attr("x2", x(0)).attr("y1", 2).attr("y2", H-26).attr("stroke", C.rule2);
      Cf.forEach(([c, v], k) => {
        const cy = 8 + k*rowH, g = svg.append("g").attr("class", featOk(c) ? "" : "dim").style("cursor", "pointer").on("click", () => { ST.feat = c; drawFeat(); drawPerson(); });
        g.append("text").attr("class", `flab ${ST.feat === c ? "on" : ""}`).attr("x", lw-6).attr("y", cy+3.5).attr("text-anchor", "end").text(trunc(lab(c), lw-8));
        g.append("line").attr("x1", x(v.lo)).attr("x2", x(v.hi)).attr("y1", cy).attr("y2", cy).attr("stroke", v.mean > 0 ? C.sd : C.ns).attr("stroke-width", 1.4);
        g.append("circle").attr("cx", x(v.mean)).attr("cy", cy).attr("r", 4).attr("fill", v.mean > 0 ? C.sd : C.ns).attr("fill-opacity", .25 + .75*v.freq).attr("stroke", v.mean > 0 ? C.sd : C.ns);
        g.append("text").attr("class", "sub").attr("x", W-2).attr("y", cy+3.5).attr("text-anchor", "end").text(pct(v.freq));
        g.append("rect").attr("x", 0).attr("y", cy-rowH/2).attr("width", W).attr("height", rowH).attr("fill", "transparent")
          .on("pointerenter", ev => showTip(ev, `<div class="h">${lab(c)}</div>` + trow("Coefficient (standardized)", `${L.format("+.3f")(v.mean)} [${L.format("+.3f")(v.lo)}, ${L.format("+.3f")(v.hi)}]`) +
            trow("Selected in", `${pct(v.freq)} of 50 fold models`) + trow("Unit", F(c).unit) + trow("Aggregate", F(c).agg)))
          .on("pointermove", ev => moveTip(ev)).on("pointerleave", hideTip);
      });
      svg.append("g").attr("class", "axis").attr("transform", `translate(0,${H-24})`).call(d3.axisBottom(x).ticks(4).tickSizeOuter(0).tickFormat(fTick(L.format("+.2f"))));
      d3.select("#k-feat").html(`<span class="k"><i class="dot" style="background:${C.sd}"></i>toward SD</span><span class="k"><i class="dot" style="background:${C.ns}"></i>toward NS</span><span class="k m">% = selected in folds</span>`);
      setTitle("t-feat", "Logistic coefficients", `top ${Cf.length}`,
        notes("Elastic-net logistic regression on standardized features: dot = mean coefficient over the 50 fold models, line = 95% range, fill = how often the penalty kept the feature (% at the right). Pink pushes toward deprivation, blue toward normal sleep.",
          "Single features are unstable here (see Stability and Fidelity in the Result): neighbors can take each other's place. Click a feature to see its values for the selected person."));
    } else {
      const shapes = Object.entries(R().shapes), n = shapes.length, cols = Math.max(1, Math.min(n, Math.floor(W/190))), rowsN = Math.ceil(n/cols), cw = W/cols, ch = Math.max(54, Math.min(170, (Hv-6)/rowsN)), H = rowsN*ch;
      const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("height", H).attr("role", "img").attr("aria-label", "EBM shape curves of the top features");
      const yAll = d3.extent(shapes.flatMap(([, s]) => s.scores)), ym = Math.max(Math.abs(yAll[0]), Math.abs(yAll[1]));
      shapes.forEach(([c, s], k) => {
        const ox = (k % cols)*cw, oy = Math.floor(k/cols)*ch, m = {l:34, r:10, t:18, b:20};
        const ed = s.edges, lo = ed[0] - (ed[1]-ed[0] || 1), hi = ed[ed.length-1] + (ed[ed.length-1]-ed[ed.length-2] || 1);
        const x = d3.scaleLinear().domain([lo, hi]).range([ox+m.l, ox+cw-m.r]), y = d3.scaleLinear().domain([-ym, ym]).range([oy+ch-m.b, oy+m.t]);
        const g = svg.append("g").attr("class", featOk(c) ? "" : "dim").style("cursor", "pointer").on("click", () => { ST.feat = c; drawFeat(); drawPerson(); });
        g.append("text").attr("class", `flab ${ST.feat === c ? "on" : ""}`).attr("x", ox+m.l).attr("y", oy+11).text(trunc(lab(c), cw-m.l-6));
        g.append("line").attr("x1", ox+m.l).attr("x2", ox+cw-m.r).attr("y1", y(0)).attr("y2", y(0)).attr("stroke", C.rule2);
        const xs = [lo, ...ed, hi], pts = s.scores.flatMap((v, j) => [[xs[j], v], [xs[j+1], v]]);
        g.append("path").attr("fill", "none").attr("stroke", C.ink).attr("stroke-width", 1.5).attr("d", d3.line().x(d => x(d[0])).y(d => y(d[1]))(pts));
        g.append("g").attr("class", "axis").attr("transform", `translate(0,${oy+ch-m.b})`).call(d3.axisBottom(x).ticks(3).tickSizeOuter(0).tickFormat(axf(x.domain())));
        g.append("g").attr("class", "axis").attr("transform", `translate(${ox+m.l},0)`).call(d3.axisLeft(y).ticks(3).tickSizeOuter(0).tickFormat(fTick(L.format("+.1f")))).call(a => a.select(".domain").remove());
        g.append("rect").attr("x", ox).attr("y", oy).attr("width", cw).attr("height", ch).attr("fill", "transparent")
          .on("pointerenter", ev => showTip(ev, `<div class="h">${lab(c)}</div>` + trow("Unit", F(c).unit) + trow("Aggregate", F(c).agg) + `<div class="m">Contribution to the log-odds of deprivation across its values.</div>`))
          .on("pointermove", ev => moveTip(ev)).on("pointerleave", hideTip);
      });
      setTitle("t-feat", "EBM shape curves", "top 5",
        notes("Each curve is how one feature adds to the log-odds of deprivation (y > 0: toward SD) along its values (x, in the units of the scenario: centered on each person's mean in the paired scenario). A step means the model changes its mind at that value.",
          "Curves come from an EBM fitted on all 136 recordings, only to draw them; every performance number is out of fold. Click a curve to see where the selected person falls."));
    }
  }
  // ejes con números corrientes (los prefijos SI, "100m", se leerían como mili de la unidad); muy chicos o grandes: científica
  const axf = dom => { const m = d3.max(dom, Math.abs) || 1; return fTick(m < 1e-2 || m >= 1e4 ? L.format(".1e") : m < 1 ? L.format("~r") : L.format("~f")); };
  const trunc = (t, px) => { const n = Math.max(6, Math.floor(px/5.6)); return t.length > n ? t.slice(0, n-1) + "…" : t; };

  // ---------------------------------------------------------------- métricas del modelo: matriz de confusión y aciertos
  function drawMet(){
    // como en las figuras de revista: matriz 2 × 2 pequeña con un solo tono (gris) según la proporción de la fila, y al
    // lado una tabla mínima con los controles de confusión y la calidad de la explicación
    const el = $("met"); d3.select(el).selectAll("*").remove();
    const r = R(), s = S(), x = r.xai, ctl = s.controls;
    const idx = M.records.map((_, i) => i).filter(i => ST.order === "all" || M.records[i].order === ST.order);
    const cnt = (t, p) => idx.filter(i => isSD(i) === t && (prob(i) >= .5) === p).length;
    const cm = [[cnt(false, false), cnt(false, true)], [cnt(true, false), cnt(true, true)]];
    const wrap = d3.select(el).append("div").attr("class", "metwrap");
    const cs = 38, ox = 30, oy = 30, W = ox + 2*cs + 2, H = oy + 2*cs + 4;
    const svg = wrap.append("svg").attr("class", "cmx").attr("viewBox", `0 0 ${W} ${H}`).attr("width", W).attr("height", H).attr("role", "img").attr("aria-label", "Confusion matrix");
    svg.append("text").attr("class", "sub").attr("x", ox + cs).attr("y", 9).attr("text-anchor", "middle").text("predicted");
    ["NS", "SD"].forEach((nm, k) => {
      svg.append("text").attr("class", "flab").attr("x", ox + k*cs + cs/2).attr("y", oy-5).attr("text-anchor", "middle").text(nm);
      svg.append("text").attr("class", "flab").attr("x", ox-5).attr("y", oy + k*cs + cs/2 + 3.5).attr("text-anchor", "end").text(nm);
    });
    svg.append("text").attr("class", "sub").attr("transform", `translate(7,${oy+cs}) rotate(-90)`).attr("text-anchor", "middle").text("true");
    cm.forEach((row, i) => row.forEach((v, j) => {
      const sh = v/((row[0]+row[1]) || 1);
      svg.append("rect").attr("x", ox + j*cs).attr("y", oy + i*cs).attr("width", cs).attr("height", cs).attr("fill", C.ink).attr("fill-opacity", .06 + .6*sh).attr("stroke", C.rule2).attr("stroke-width", .5);
      svg.append("text").attr("class", "cval").attr("x", ox + j*cs + cs/2).attr("y", oy + i*cs + cs/2 + 4).attr("text-anchor", "middle").style("fill", sh > .55 ? C.panel : C.ink).text(v);
      svg.append("rect").attr("x", ox + j*cs).attr("y", oy + i*cs).attr("width", cs).attr("height", cs).attr("fill", "transparent")
        .on("pointerenter", ev => showTip(ev, `<div class="h">True ${i ? "SD" : "NS"} · predicted ${j ? "SD" : "NS"}</div>` + trow("Recordings", v) + trow(`Share of true ${i ? "SD" : "NS"}`, pct(sh))))
        .on("pointermove", ev => moveTip(ev)).on("pointerleave", hideTip);
    }));
    const rec = (a, b) => fmt2(a/((a+b) || 1)), vAuc = ctl.visit_lr.auc.mean, fid = x.fidelity.auc_without_top10.mean;
    const T = [
      ["Recall NS / SD", `${rec(cm[0][0], cm[0][1])} / ${rec(cm[1][1], cm[1][0])}`, "Share of each true class classified correctly (P(SD) ≥ 0.5)"],
    ].filter(t => t[0] !== "");
    wrap.append("table").attr("class", "mtab small").html(T.map(([k, v, t]) => v === null ? `<tr class="grp"><th colspan="2">${k}</th></tr>` : `<tr title="${t}"><th>${k}</th><td class="v">${v}</td></tr>`).join(""));
    const n = idx.length;
    setTitle("t-met", "Out-of-fold predictions", `${n} recordings${ST.order !== "all" ? `, ${ST.order.replace("->", "→")}` : ""}`,
      notes(`Confusion matrix of the ${MDN[ST.md]} (P(SD) ≥ 0.5 = predicted deprivation), out of fold and averaged over the 10 repetitions; rows = true condition, gray = share of the row.`,
        "The checks of this result (visit, permutation, visit order, baseline, fidelity, stability) are in Validation, in the left column. Explanation: stability of the ranking across folds, agreement between the two models, and AUC after removing the top 10 (fidelity).",
        "The Order control filters the matrix."));
  }

  // ---------------------------------------------------------------- persona: contribuciones locales y la feature elegida
  function qualLine(id){
    const q = typeof QUAL !== "undefined" && QUAL && QUAL.persons[id]; if(!q) return "";
    const one = (c, nm) => { const r = q[c]; if(!r) return `<span><b>${nm}</b> excluded</span>`;
      const t = `${r.epochs ?? "?"}/75 epochs · ${r.interpolated.length ? `${r.interpolated.length} interp.` : "no interp."}${r.blinks_per_min != null ? ` · ${r.blinks_per_min} blinks/min` : ""}`;
      return `<span title="${nm === "NS" ? "Normal Sleep" : "Sleep Deprivation"}: ${t}${r.interpolated.length ? ` (${r.interpolated.join(", ")})` : ""}${r.ica_removed != null ? `; ${r.ica_removed} ICA components removed` : ""}"><b>${nm}</b> ${t}</span>`; };
    return `<div class="pqual">${one("NS", "NS")}${one("SD", "SD")}</div>`;
  }
  function drawPerson(){
    const el = $("person"); d3.select(el).selectAll("*").remove(); d3.select("#k-person").html("");
    if(!ST.person){
      d3.select(el).append("div").attr("class", "pempty").text("Click a record or a line in Records to see why the model decided what it did for that person.");
      setTitle("t-person", "", "", notes("Local explanation: the exact contribution of each feature to each of the person's two recordings, from the model of the fold where that person was in the test set."));
      return;
    }
    const idx = personIdx(ST.person).sort((a, b) => isSD(a) - isSD(b)), r0 = M.records[idx[0]], ok = idx.filter(correct).length;
    // título y calidad del EEG primero: ocupan alto, y el gráfico se mide después. La calidad (data/quality.json, la
    // misma del tooltip de Explorer) va aquí porque ante un error lo primero es descartar un mal registro
    d3.select("#k-person").html(qualLine(ST.person));
    setTitle("t-person", ST.person, `${r0.order.replace("->", "→")} · ${ok === 2 ? "both right" : ok === 1 ? "one wrong" : "both wrong"}`,
      notes(`Waterfalls: each bar is how much one feature moved this recording's score (log-odds of deprivation) from the start (${MDN[ST.md]} intercept) to its final value; pink pushes toward deprivation, blue toward normal sleep. The largest ones that fit are shown (up to 8) and the rest summed. Model: the one trained without this person (out of fold, repetition 1).`,
        "Bottom (when there is room): the chosen feature for all 136 recordings, split by condition, with this person's two recordings ringed. Click a bar or a feature to change it.",
        "EEG quality under the name: epochs kept of 75, channels interpolated and blinks per minute in each recording. Many rejected epochs or blinks point to a noisy recording rather than to the physiology."));
    const W = el.clientWidth || 400, Hv = Math.max(150, el.clientHeight || 600);
    const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${Hv}`).attr("height", Hv).attr("role", "img").attr("aria-label", `Contributions for ${ST.person}`);
    // cascada por registro: del intercepto a la puntuación final (log-odds), top 8 y el resto
    const loc = idx.map(i => R().local[i]), all = loc.flatMap(l => { let a = l.intercept; const v = [a]; [...l.top.map(t => t[1]), l.other].forEach(c => { a += c; v.push(a); }); return v; });
    const ext = d3.extent(all.concat([0])), pad = (ext[1]-ext[0])*.08 || 1;
    const strip = Hv > 470 ? 110 : 0, half = Math.min(320, (Hv-strip-12)/2), lw = Math.min(170, W*.42), x = d3.scaleLinear().domain([ext[0]-pad, ext[1]+pad]).range([lw, W-56]);
    const kTop = Math.max(3, Math.min(8, Math.floor((half-46)/13)));   // cuántas features caben por registro
    idx.forEach((i, k) => {
      const l = loc[k], oy = 4 + k*(half+8), items = [...l.top.slice(0, kTop).map(([c, v]) => ({c, v})), {c:null, v:l.other + d3.sum(l.top.slice(kTop), t => t[1])}], rowH = (half-46)/items.length;
      const p = 1/(1+Math.exp(-(l.intercept + d3.sum(items, d => d.v))));
      svg.append("text").attr("class", "ttl").attr("x", 2).attr("y", oy+11).text(`${isSD(i) ? "Sleep Deprivation" : "Normal Sleep"} · ${M.records[i].visit === 1 ? "1st" : "2nd"} visit`);
      svg.append("text").attr("class", "ttl").attr("x", W-2).attr("y", oy+11).attr("text-anchor", "end").style("fill", correct(i) ? C.ink : C.vuln)
        .text(`P(SD) ${fmt2(p)} · ${correct(i) ? "right" : "wrong"}`);
      svg.append("line").attr("x1", x(0)).attr("x2", x(0)).attr("y1", oy+18).attr("y2", oy+half-24).attr("stroke", C.rule2).attr("stroke-dasharray", "2 2");
      let acc = l.intercept;
      items.forEach((d, j) => {
        const cy = oy + 22 + j*rowH + rowH/2, a0 = acc, a1 = acc + d.v; acc = a1;
        const g = svg.append("g").attr("class", `wf-bar ${d.c && !featOk(d.c) ? "dim" : ""}`).on("click", () => { if(d.c){ ST.feat = d.c; drawFeat(); drawPerson(); } });
        g.append("text").attr("class", `flab ${d.c && d.c === ST.feat ? "on" : ""}`).attr("x", lw-6).attr("y", cy+3.5).attr("text-anchor", "end").text(d.c ? trunc(lab(d.c), lw-8) : "all other features");
        g.append("rect").attr("x", x(Math.min(a0, a1))).attr("y", cy-Math.min(6, rowH*.38)).attr("width", Math.max(1, Math.abs(x(a1)-x(a0)))).attr("height", Math.min(12, rowH*.76))
          .attr("fill", d.v > 0 ? C.sd : C.ns).attr("opacity", d.c ? .9 : .45);
        g.append("text").attr("class", "sub").attr("x", W-2).attr("y", cy+3.5).attr("text-anchor", "end").text(L.format("+.2f")(d.v));
        g.append("rect").attr("x", 0).attr("y", cy-rowH/2).attr("width", W).attr("height", rowH).attr("fill", "transparent")
          .on("pointerenter", ev => showTip(ev, `<div class="h">${d.c ? lab(d.c) : "All other features"}</div>` + trow("Contribution (log-odds)", L.format("+.3f")(d.v)) +
            (d.c && S().values[d.c] ? trow("Value", fr(S().values[d.c][i]) + " " + F(d.c).unit) : "")))
          .on("pointermove", ev => moveTip(ev)).on("pointerleave", hideTip);
      });
      svg.append("g").attr("class", "axis").attr("transform", `translate(0,${oy+half-22})`).call(d3.axisBottom(x).ticks(W < 420 ? 3 : 5).tickSizeOuter(0).tickFormat(fTick(L.format("+~g"))));
      svg.append("text").attr("class", "sub").attr("x", lw-14).attr("y", oy+half-22+15).attr("text-anchor", "end").text("log-odds of SD →");
    });
    // feature elegida: valores de los 136 registros por condición, con los dos de esta persona
    const c = ST.feat && S().values[ST.feat] ? ST.feat : (loc[0].top[0] || [null])[0];
    const vals = c && S().values[c], oy = 2*(half+8) + 4, hh = Hv - oy - 30;
    if(vals && strip && hh > 70){
      const sx = d3.scaleLinear().domain(d3.extent(vals)).nice().range([lw, W-56]);
      svg.append("text").attr("class", "ttl").attr("x", 2).attr("y", oy+11).text(trunc(lab(c), W*.7));
      svg.append("text").attr("class", "sub").attr("x", W-2).attr("y", oy+11).attr("text-anchor", "end").text(F(c).unit + (ST.sc === "paired" ? ", centered per person" : ""));
      const rows = [["Normal Sleep", 0, C.ns], ["Sleep Deprivation", 1, C.sd]], rh = Math.min(34, (hh-34)/2);
      const shp = ST.md === "ebm" && R().shapes && R().shapes[c];
      rows.forEach(([nm, sdv, col], k) => {
        const cy = oy + 30 + k*rh + rh/2;
        svg.append("text").attr("class", "flab").attr("x", lw-6).attr("y", cy+3.5).attr("text-anchor", "end").text(nm);
        svg.append("g").selectAll("circle").data(vals.map((v, i) => ({v, i})).filter(d => isSD(d.i) === !!sdv)).join("circle")
          .attr("cx", d => sx(d.v)).attr("cy", d => cy + ((d.i*37) % 11 - 5)*rh/30).attr("r", 2.4).attr("fill", col).attr("opacity", .35);
      });
      idx.forEach(i => {
        const k = isSD(i) ? 1 : 0, cy = oy + 30 + k*rh + rh/2;
        svg.append("circle").attr("cx", sx(vals[i])).attr("cy", cy).attr("r", 5.5).attr("fill", "none").attr("stroke", C.ink).attr("stroke-width", 2);
      });
      svg.append("g").attr("class", "axis").attr("transform", `translate(0,${oy+30+2*rh+4})`).call(d3.axisBottom(sx).ticks(W < 420 ? 3 : 4).tickSizeOuter(0).tickFormat(axf(sx.domain())));
      if(shp) svg.append("text").attr("class", "sub").attr("x", lw).attr("y", oy+24).text("its EBM shape curve is in Features");
    }
  }

  // ---------------------------------------------------------------- estado y controles
  // cada pestaña tiene su propia selección: elegir a alguien aquí no cambia la de Explorer (ni al revés)
  function pick(id){ ST.person = ST.person === id ? null : id; ST.feat = null; drawRec(); drawPerson(); }
  function drawAll(){ if(!M || !document.body.classList.contains("tab-ml")) return; readPalette(); drawCards(); drawMlVal(); drawRec(); drawImp(); drawFeat(); drawMet(); drawPerson(); }
  function load(){
    return d3.json("data/ml.json").catch(() => new Promise((res, rej) => {
      if(window.BATIMIX_DATA) return res(window.BATIMIX_DATA.ml);
      const sc = document.createElement("script"); sc.src = "data/data.js";
      sc.onload = () => window.BATIMIX_DATA && window.BATIMIX_DATA.ml ? res(window.BATIMIX_DATA.ml) : rej(new Error("data.js has no ml"));
      sc.onerror = () => rej(new Error("could not read data/"));
      document.head.appendChild(sc);
    }));
  }
  // arranque perezoso: los datos y el dibujo, la primera vez que se abre la pestaña
  let started = null;
  function start(){
    if(started) return started;
    started = load().then(d => {
      M = d;
      const seg = (id, key, after) => setupSeg(id, v => { ST[key] = v; seg.reg[id].set(v); after(); });
      seg.reg = {};
      seg.reg.scseg = seg("scseg", "sc", () => { ST.brush = null; ST.feat = null; drawAll(); });
      seg.reg.mdseg = seg("mdseg", "md", () => { ST.feat = null; drawAll(); });
      seg.reg.orseg = seg("orseg", "order", () => { drawRec(); drawMet(); });
      seg.reg.shseg = seg("shseg", "show", () => drawRec());
      d3.select("#ffsel").on("change", function(){ ST.ff = this.value; drawImp(); drawFeat(); drawPerson(); });
      // el tema cambia desde cualquier pestaña: se redibuja con la paleta nueva
      new MutationObserver(() => drawAll()).observe(document.documentElement, {attributes:true, attributeFilter:["data-theme"]});
      drawAll();
      if(document.fonts) document.fonts.ready.then(drawAll);
      let t = null; const ro2 = new ResizeObserver(() => { clearTimeout(t); t = setTimeout(drawAll, 120); }); ro2.observe(document.querySelector(".ml-c")); ro2.observe(document.querySelector(".ml-r"));
    }).catch(e => { d3.select("#rec").html(`<p class="note" style="color:var(--muted);padding:12px">Could not load data/ml.json (${e.message}). Generate it with tools/build_ml.py.</p>`); });
    return started;
  }
  // pestañas Explorer | Classifier: no recargan nada; el estado de cada vista se conserva al cambiar
  window.showTab = function(name){
    const ml = name === "classifier";
    // la barra lateral no cambia: solo se alternan las piezas marcadas con data-tabpane (controles, resumen y columnas)
    document.querySelectorAll("[data-tabpane]").forEach(e => { e.hidden = e.dataset.tabpane !== name; });
    document.body.classList.toggle("tab-ml", ml);
    if(!ml) $("warn").hidden = true;
    document.querySelectorAll(".vtabs button").forEach(b => b.setAttribute("aria-selected", b.dataset.tab === name));
    try{ history.replaceState(null, "", location.pathname + location.search + (ml ? "#classifier" : "")); }catch(e){}
    if(typeof hideTip === "function") hideTip();
    if(ml) start().then(() => requestAnimationFrame(drawAll));
    else requestAnimationFrame(() => { if(typeof window.drawAll === "function") window.drawAll(); });
  };
  document.querySelectorAll(".vtabs button").forEach(b => b.addEventListener("click", () => showTab(b.dataset.tab)));
  if(location.hash === "#classifier") showTab("classifier");
  window.ML = {ST, data:() => M, drawAll, pick, start};   // para las pruebas (check_app.py)
})();
