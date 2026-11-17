/* Arranque: carga los JSON procesados, prepara estado derivado y dibuja las cuatro vistas enlazadas.
   multiverse.json ya no tiene vista propia, pero trae los lapsos y la DE del TR del PVT (marcadores del eje y).
   Servido por HTTP (GitHub Pages o servidor local) lee data/*.json. Abierto con doble clic (file://)
   el navegador bloquea fetch, así que cae a data/data.js, el mismo contenido empaquetado. */
const FILES = ["participants", "topo", "coords", "subject_epochs", "topo_by_subject", "multiverse", "coords3d"];

function loadData(){
  const base = window.BATIMIX_BASE || "";
  // las vistas secundarias son opcionales: si faltan sus JSON, la app funciona igual
  const opt = f => d3.json(`${base}data/${f}.json`).catch(() => null);
  return Promise.all([Promise.all(FILES.map(f => d3.json(`${base}data/${f}.json`))), opt("aperiodic"), opt("connectivity"), opt("quality"), opt("electrode_epochs")])
    .then(([[p, t, c, s, st, mv, c3], ap, cn, ql, ee]) => ({participants:p, topo:t, coords:c, subEpochs:s, subTopo:st, multiverse:mv, coords3d:c3, aperiodic:ap, connectivity:cn, quality:ql, elecEpochs:ee}))
    .catch(() => new Promise((res, rej) => {
      if(window.BATIMIX_DATA) return res(window.BATIMIX_DATA);
      const sc = document.createElement("script"); sc.src = `${base}data/data.js`;
      sc.onload = () => window.BATIMIX_DATA ? res(window.BATIMIX_DATA) : rej(new Error("data.js is empty"));
      sc.onerror = () => rej(new Error("no se pudo leer data/"));
      document.head.appendChild(sc);
    }));
}

function prepare(D){
  P = D.participants; TOPO = D.topo; COORDS = D.coords; SUBEP = D.subEpochs; SUBTOPO = D.subTopo || {}; MULTI = D.multiverse || null; COORDS3 = D.coords3d || null;
  APER = D.aperiodic || null; CONN = D.connectivity || null; QUAL = D.quality || null;
  ELEP = D.elecEpochs || null; if(ELEP) ELEP.idx = Object.fromEntries(ELEP.electrodes.map((e, i) => [e, i]));
  EEG = P.filter(d => d.d_front_var != null); EEG_IDS = EEG.map(d => d.id);
  ELEC = Object.keys(COORDS).filter(e => TOPO[e]);
  const qv = bh(ELEC.map(e => TOPO[e].sigVar)), qm = bh(ELEC.map(e => TOPO[e].sigMean));
  ELEC.forEach((e, i) => { TOPO[e].qVar = qv[i]; TOPO[e].qMean = qm[i]; });
  // lapsos y DE del TR del PVT (Semana 6, behavioral_deltas.csv) llegan en multiverse.json
  if(MULTI){
    const at = new Map(MULTI.subjects.map((id, i) => [id, i]));
    P.forEach(d => { const i = at.get(d.id); d.d_pvtl = i == null ? null : MULTI.y.pvt_lapses[i]; d.d_pvtsd = i == null ? null : MULTI.y.pvt_sd[i]; });
  } else { delete MK.d_pvtl; delete MK.d_pvtsd; }
  const cov = k => EEG.filter(d => d[k] != null).length;
  document.querySelectorAll("[data-k='covLong']").forEach(n => n.textContent =
    `${EEG.length} have EEG in both conditions; of these, PVT ${cov("d_pvt")}, KSS ${cov("d_kss")}, SSS ${cov("d_sss")} and PANAS ${cov("d_panasP")}.`);
}

// ---------- bandas (fase 4 de PLAN.md) ----------
// Cada banda vive en data/bands/<banda>/ (theta en data/, ya cargada). Se trae la primera vez que se elige y queda en
// memoria. Cambiar de banda reasigna los globales que dependen de ella (TOPO, SUBTOPO, SUBEP, ELEP y los campos EEG de
// P) y redibuja. Abierta con doble clic (file://) el navegador bloquea fetch: data.js solo trae theta, así que las
// demás bandas requieren servidor local o GitHub Pages; si fallan, se avisa y se queda en theta.
const BANDDATA = {}, EEG_FIELDS = ["d_front_var", "d_ct_var", "d_front_pow", "d_ct_pow"];
let segBand = null;
function keepTheta(){
  BANDDATA.theta = {topo:TOPO, subTopo:SUBTOPO, subEpochs:SUBEP, elecEpochs:ELEP,
    eeg:Object.fromEntries(P.map(d => [d.id, Object.fromEntries(EEG_FIELDS.map(k => [k, d[k]]))]))};
}
function useBand(b){
  const X = BANDDATA[b];
  TOPO = X.topo; SUBTOPO = X.subTopo; SUBEP = X.subEpochs; ELEP = X.elecEpochs;
  if(ELEP && !ELEP.idx) ELEP.idx = Object.fromEntries(ELEP.electrodes.map((e, i) => [e, i]));
  P.forEach(d => { const v = X.eeg[d.id] || {}; EEG_FIELDS.forEach(k => { d[k] = v[k] ?? null; }); });
  if(ELEC.some(e => TOPO[e] && TOPO[e].qVar == null)){   // q de FDR (61 pruebas) por banda × métrica, como theta
    const qv = bh(ELEC.map(e => TOPO[e].sigVar)), qm = bh(ELEC.map(e => TOPO[e].sigMean));
    ELEC.forEach((e, i) => { TOPO[e].qVar = qv[i]; TOPO[e].qMean = qm[i]; });
  }
}
function loadBand(b){
  if(BANDDATA[b]) return Promise.resolve();
  const base = window.BATIMIX_BASE || "";
  return Promise.all(BAND_FILES.map(f => d3.json(`${base}data/bands/${b}/${f}.json`))).then(([t, st, se, ee, pe]) => {
    BANDDATA[b] = {topo:t, subTopo:st, subEpochs:se, elecEpochs:ee, eeg:pe};
  });
}
function setBand(b){
  if(!BANDS[b] || b === S.band) return Promise.resolve();
  const bt = $("bandseg"); if(bt) bt.setAttribute("aria-busy", "true");
  return loadBand(b).then(() => {
    if(typeof dyn !== "undefined" && dyn.stop) dyn.stop();
    S.band = b; useBand(b); segBand.set(b); document.documentElement.dataset.band = b;
    try{ const u = new URL(location.href); if(b === "theta") u.searchParams.delete("band"); else u.searchParams.set("band", b); history.replaceState(null, "", u); }catch(e){}
    computeX(); scatter.clearBrushVisual(); drawAll(); bus.call("axes");
    if(window.i18n && i18n.refresh) i18n.refresh();   // vuelve a etiquetar los textos fijos (σθ → σα…)
  }).catch(() => {
    alert(`The ${BANDS[b].name} band could not be loaded. Bands other than theta need the app served over HTTP (python -m http.server, or GitHub Pages); opened with a double click only theta is available.`);
  }).finally(() => { if(bt) bt.removeAttribute("aria-busy"); });
}

// ---------- controles del header ----------
let segRoi, segMet;
// tema oscuro (instrumento) o claro (clásico): cambia los tokens de color y fuente, relee la paleta y redibuja todo
function setTheme(t){
  const light = t === "light";
  if(light) document.documentElement.dataset.theme = "light"; else delete document.documentElement.dataset.theme;
  try{ localStorage.setItem("batimix-tema", t); }catch(e){}
  document.querySelector('meta[name="theme-color"]').content = light ? "#FFFFFF" : "#0B0D12";
  const b = $("themebtn"), next = light ? "dark" : "light";
  b.setAttribute("aria-label", `Switch to ${next} theme`); b.title = `${next[0].toUpperCase()+next.slice(1)} theme`;
  if(["tema", "theme"].some(k => new URLSearchParams(location.search).has(k))) history.replaceState(null, "", location.pathname + location.hash);
  readPalette(); drawAll();
  if(document.fonts) document.fonts.ready.then(drawAll);   // las fuentes del otro tema cambian la medida del texto
}
const themeNow = () => document.documentElement.dataset.theme === "light" ? "light" : "dark";
function drawAll(){ scatter.render(); topo.render(); dyn.render(); indiv.render(); side.render(); drawValList(); updateStatus(); }

// ---------- validación: tabla de verificaciones y ventanas flotantes ----------
// cada verificación se abre en su propia ventana (tamaño inicial según su gráfico); varias a la vez; la fila de una
// ventana ya abierta la trae al frente
const VALWIN = {"b-aper":[400, 620], "b-eye":[420, 500], "b-conn":[440, 580], "b-graph":[480, 480]};   // ancho, alto iniciales
let valZ = 60, valN = 0;   // z-index de las ventanas: 61, 62…; se reinicia al cerrarlas todas (no crece sin fin)
const valOpen = () => [...document.querySelectorAll(".sidebox .sec[data-open=true]")];
function openVal(secId){
  secId = secId || "b-aper";
  const sec = $(secId) && $(secId).closest(".sec"); if(!sec) return;
  if(sec.dataset.open !== "true"){
    // posición inicial: a la derecha de la última ventana abierta (si cabe), si no escalonada; así varias se ven a la vez
    const [w, h] = VALWIN[secId] || [460, 560], W = Math.min(w, innerWidth - 16), H = Math.min(h, innerHeight - 16);
    const open = valOpen().map(s => s.getBoundingClientRect()), last = open.sort((p, q) => p.right - q.right).pop();
    let x = innerWidth*.24, y = Math.max(8, innerHeight*.05);
    if(last){ x = last.right + 8; y = last.top; if(x + W > innerWidth - 8){ const k = valN % 4; x = innerWidth*.24 + k*36; y = innerHeight*.05 + k*32; } }
    valN++;
    x = Math.max(8, Math.min(innerWidth - W - 8, x)); y = Math.max(8, Math.min(innerHeight - H - 8, y));
    sec.style.setProperty("--w", W + "px"); sec.style.setProperty("--h", H + "px"); sec.style.setProperty("--x", x + "px"); sec.style.setProperty("--y", y + "px");
    sec.dataset.open = "true"; sec.querySelector(".sec-btn").setAttribute("aria-expanded", "true");
    if(!sec.querySelector(".secx")){
      const b = document.createElement("button"); b.type = "button"; b.className = "secx"; b.textContent = "×"; b.title = "Close (Esc closes the front window)"; b.setAttribute("aria-label", "Close this chart");
      b.addEventListener("click", e => { e.stopPropagation(); closeVal(secId); });
      sec.querySelector(".sec-hd").appendChild(b);
    }
    if(!sec.dataset.watch){ sec.dataset.watch = "1"; let t = null; new ResizeObserver(() => { clearTimeout(t); t = setTimeout(() => { if(sec.dataset.open === "true") side.render(); }, 120); }).observe(sec); }
    dragVal(sec);
  }
  sec.style.setProperty("--z", ++valZ);
  sec.classList.add("flash"); setTimeout(() => sec.classList.remove("flash"), 700);
  drawValList();
  requestAnimationFrame(() => side.render());
}
function closeVal(secId){
  const secs = secId ? [$(secId).closest(".sec")] : valOpen();
  secs.forEach(s => { s.dataset.open = "false"; s.querySelector(".sec-btn").setAttribute("aria-expanded", "false"); if(s.classList.contains("is-max")) setMax(null); });
  if(!valOpen().length) valZ = 60;
  drawValList(); side.render();
}
// la ventana de adelante (mayor z) para Esc
const valFront = () => valOpen().sort((a, b) => (+b.style.getPropertyValue("--z") || 0) - (+a.style.getPropertyValue("--z") || 0))[0];
// arrastre por el título de cada ventana; un clic sin arrastre la trae al frente
function dragVal(sec){
  if(sec.dataset.drag) return; sec.dataset.drag = "1";
  const head = sec.querySelector(".sec-hd");
  head.addEventListener("pointerdown", e => {
    if(sec.dataset.open !== "true" || sec.classList.contains("is-max") || e.target.closest(".secx, .info, a")) return;
    sec.style.setProperty("--z", ++valZ);
    const r = sec.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
    head.setPointerCapture(e.pointerId);
    const move = ev => { sec.style.setProperty("--x", Math.max(0, Math.min(innerWidth - 120, ev.clientX - dx)) + "px"); sec.style.setProperty("--y", Math.max(0, Math.min(innerHeight - 40, ev.clientY - dy)) + "px"); };
    const up = () => { head.removeEventListener("pointermove", move); head.removeEventListener("pointerup", up); };
    head.addEventListener("pointermove", move); head.addEventListener("pointerup", up);
  });
}
// Validation de Explorer: filas con su cifra y un mini gráfico (escala fina con la referencia punteada); clic abre el
// gráfico completo en una ventana flotante. El mismo componente (miniRows, core.js) que la Validation del clasificador
function drawValList(){
  const el = $("vlist"); if(!el) return;
  const roi = S.roi, rows = [];
  const AB = S.band !== "theta" && APER && APER.bands ? APER.bands[S.band] : null;
  const sg = APER ? (AB ? AB.sigma[roi] : APER.sigma[roi]) : null;
  if(QUAL){ const sm = QUAL.summary[roi]; rows.push({id:"b-eye", k:"Without blinks", v:`ρ ${f2(sm.rho_clean_vs_all)}`, dom:[0, 1], marks:[{v:sm.rho_clean_vs_all, lab:"ρ"}],
    tip:`Δσθ recomputed without the 1-s windows near a blink vs the full Δσθ (${ROI[roi].name}, n = ${sm.n_clean}). Near 1: blinks do not drive the effect. Click to open the chart.`}); }
  if(sg) rows.push({id:"b-aper", k:"Periodic part", v:`ρ ${f2(sg.rho_periodic)}`, dom:[0, 1], marks:[{v:sg.rho_periodic, lab:"ρ"}],
    tip:`Δσθ vs Δσθ of the periodic component, 1/f removed (${ROI[roi].name}, n = ${sg.n}). High: the change is oscillatory, not the 1/f background. Click to open the chart.`});
  if(CONN){ const g = CONN.global; rows.push({id:"b-conn", k:"θ synchrony", v:`p ${fp(g.p_perm)}`, dom:[0, 1], ref:.05, refLab:"0.05", marks:[{v:g.p_perm, lab:"p, permutation"}],
    tip:`Global change in between-region wPLI² (permutation test, n = ${CONN.meta.n}); exploratory. Right of the dashed line (0.05): no change. Click to open the chart.`}); }
  rows.push({id:"b-graph", k:"Similarity", v:"3 most alike", desc:"each person linked to the three with the most similar change",
    tip:"Each person linked to the three whose pattern of change over the 61 electrodes is most alike. Click to open the chart."});
  miniRows(el, rows, openVal, d => { const s = $(d.id) && $(d.id).closest(".sec"); return !!s && s.dataset.open === "true"; });
}

function setY(v){ S.y = v; $("ysel").value = v; scatter.clearBrushVisual(); scatter.render(); refreshGroup(); topo.render(); bus.call("axes"); }
function setRoi(v){ S.roi = v; S.elec = null; segRoi.set(v); computeX(); scatter.clearBrushVisual(); scatter.render(); refreshGroup(); topo.render(); bus.call("axes"); }
// σθ necesita al menos 60 s (WIN_MIN_VAR épocas): al pasar a σθ con la ventana de 32 s, sube a 60 s
function setMet(v){
  S.met = v;
  if(!winLenOk(S.winLen, v)){   // la ventana abierta también se alarga, con el mismo centro
    S.winLen = WIN_MIN_VAR;
    if(S.win){ S.win = winCentered((S.win[0]+S.win[1]+1)*2); topo.setFrame(S.win); bus.call("frame", null, S.win); }
  }
  syncWinUI(); segMet.set(v); computeX(); scatter.clearBrushVisual(); scatter.render(); refreshGroup(); topo.render(); bus.call("axes"); }
// electrodo elegido en un mapa: manda en el eje x de la dispersión (clic de nuevo = volver a la región)
function setElec(e){ S.elec = S.elec === e ? null : e; if(S.elec) S.win = null; computeX(); scatter.clearBrushVisual(); scatter.render(); refreshGroup(); topo.render(); bus.call("axes"); }
// ventana de tiempo elegida en la serie: el eje x usa el cambio theta de cada persona dentro de la ventana
// el intervalo elegido lo siguen también los mapas, el mapa de calor y el grafo (como en la reproducción)
// ---------- vista temporal: ventana, duración y serie ----------
// Elegir una ventana cierra la serie (son dos modos excluyentes: una ventana o bloques).
function syncWinUI(){
  d3.selectAll("#wlen button").attr("aria-pressed", function(){ return +this.dataset.n === S.winLen; })
    .property("disabled", function(){ return !winLenOk(+this.dataset.n, S.met); });
  const b = $("seriesbtn"); if(b){ b.setAttribute("aria-pressed", S.series); b.title = S.series ? "Close the series" : "Show the full series: Δ maps in non-overlapping blocks aligned with the Time View"; }
  if(dyn.ui) dyn.ui();
}
// nueva duración: si hay una ventana elegida, se mantiene su centro con el largo nuevo
function setWinLen(n){
  if(!winLenOk(n, S.met) || n === S.winLen) return;
  if(dyn.stopKeep) dyn.stopKeep();
  const w = S.win; S.winLen = n; syncWinUI();
  if(w) setWin(winCentered((w[0]+w[1]+1)*2)); else { topo.render(); bus.call("axes"); }
}
function setSeries(on){
  if(on === S.series) return;
  dyn.stop(); S.series = on;
  if(on && S.win){ S.win = null; computeX(); scatter.render(); topo.endFrames(); bus.call("frame", null, null); }
  syncWinUI(); topo.render(); bus.call("axes");
}
// «Back to the full recording»: sin ventana, sin serie, sin reproducción
function backToFull(){ dyn.stop(); S.series = false; syncWinUI(); setWin(null); }
function setWin(w){ if(w && S.series){ S.series = false; syncWinUI(); } S.win = w; if(w) S.elec = null; computeX(); scatter.clearBrushVisual(); scatter.render(); refreshGroup(); topo.setFrame(w); if(!w) topo.render(); bus.call("axes"); bus.call("frame", null, w); }
function resetAll(){
  scatter.clearBrushVisual(); S.pair = []; S.elec = null; S.win = null; S.cmp = "none"; S.series = false; syncWinUI(); computeX();
  setSelected(null); bus.call("pin", null, S.pair); scatter.render(); topo.endFrames(); topo.render(); bus.call("axes"); bus.call("frame", null, null);
}
// comparación de dos grupos: las cuatro vistas se dibujan con los dos colores; anula el lazo
function setCmp(k){
  S.cmp = k; scatter.clearBrushVisual(); S.selected = null; S.group = "all";
  scatter.render(); topo.render(); bus.call("axes");
}
const refreshGroup = () => {};   // el cuadrante vulnerable se recalcula en cada dibujo de la dispersión
function fillCmp(){
  d3.select("#cmpsel").selectAll("option").data(COMPARES).join("option").attr("value", c => c.k)
    .text(c => c.g ? `${c.name} (${c.g.map(([, f]) => EEG.filter(f).length).join(" and ")})` : (S.selected ? `Your selection (${S.selected.length})` : `${c.name} (${EEG.length})`));
}
function updateStatus(){
  fillCmp(); $("cmpsel").value = S.cmp;
  $("resetbtn").disabled = !S.selected && !S.pair.length && !S.elec && !S.win && S.cmp === "none";
  // el electrodo tiene su selector; el chip queda para la ventana de tiempo elegida en la serie
  $("elsel").value = S.elec || "";
  const chip = $("xchip");
  chip.hidden = !S.win;
  if(S.win) chip.textContent = `x: ${winTxt(S.win)}`;
  document.querySelectorAll("#roiseg button").forEach(b => b.setAttribute("aria-pressed", !S.elec && b.dataset.v === S.roi));
  document.querySelectorAll("#metseg button").forEach(b => b.setAttribute("aria-pressed", b.dataset.v === S.met));
}

loadData().then(D => {
  prepare(D); readPalette();
  d3.select("#ysel").selectAll("option").data(Object.entries(MK)).join("option").attr("value", d => d[0]).text(d => d[1].name);
  $("ysel").value = S.y;
  segRoi = setupSeg("roiseg", setRoi); segMet = setupSeg("metseg", setMet);
  keepTheta(); segBand = setupSeg("bandseg", setBand);
  try{ const mk = localStorage.getItem("batimix-marks2"); if(["cluster", "fdr", "p", "none"].includes(mk)) S.marks = mk; }catch(e){}   // la marca elegida se recuerda (clave nueva: el valor por defecto cambió a FDR)
  { const qb = new URLSearchParams(location.search).get("band"); if(qb && qb !== "theta" && BANDS[qb]) setTimeout(() => setBand(qb), 0); }
  d3.select("#ysel").on("change", function(){ setY(this.value); });
  // intercambia de lado las dos columnas; los anchos viajan con ellas, así que no hace falta redibujar
  d3.select("#swapbtn").on("click", function(){
    const on = document.querySelector(".board").classList.toggle("swap");
    this.setAttribute("aria-pressed", on);
  });
  // columna de vistas secundarias: se pliega a una franja; el centro y la izquierda ganan el espacio
  d3.select("#sidebtn").on("click", function(){
    const off = document.querySelector(".board").classList.toggle("side-off");
    this.setAttribute("aria-expanded", !off); this.textContent = off ? "‹" : "›"; this.title = off ? "Show secondary views" : "Collapse secondary views";
  });
  // validación (17 nov 2026): los cuatro gráficos se abren juntos en un panel flotante no modal; la barra de cada
  // gráfico (y la lista de la columna) abre el panel y resalta ese gráfico
  document.querySelectorAll(".sec-btn").forEach(b => b.addEventListener("click", () => openVal(b.id)));
  d3.select("#cmpsel").on("change", function(){ setCmp(this.value); });
  d3.selectAll("#wlen button").on("click", function(){ setWinLen(+this.dataset.n); });
  d3.select("#seriesbtn").on("click", () => setSeries(!S.series));
  syncWinUI();
  d3.select("#resetbtn").on("click", resetAll);
  d3.select("#xchip").on("click", () => setWin(null));
  // selector de electrodo: "None" = la región del header; los electrodos agrupados por región
  const els = d3.select("#elsel");
  els.append("option").attr("value", "").text("None");
  REG.forEach((r, k) => els.append("optgroup").attr("label", r).selectAll("option")
    .data(electrodes().filter(e => regionOf(e) === k)).join("option").attr("value", e => e).text(e => e));
  els.on("change", function(){ const v = this.value || null; if(v !== S.elec) setElec(v || S.elec); });
  d3.select("#reportbtn").on("click", () => report.download());
  d3.select("#themebtn").on("click", () => setTheme(themeNow() === "light" ? "dark" : "light"));
  if(themeNow() === "light"){ $("themebtn").setAttribute("aria-label", "Switch to dark theme"); $("themebtn").title = "Dark theme"; }
  d3.select("#aboutbtn").on("click", () => { const d = $("about"); d.showModal ? d.showModal() : d.setAttribute("open", ""); });
  // el chip de pipeline abre Acerca de en la sección de método
  d3.select("#pipebtn").on("click", () => { const d = $("about"); d.showModal ? d.showModal() : d.setAttribute("open", "");
    const h = [...d.querySelectorAll("h3")].find(x => x.id === "h-method"); if(h) h.scrollIntoView({block:"start"}); });
  document.querySelectorAll("dialog [data-close]").forEach(b => b.addEventListener("click", () => b.closest("dialog").close()));
  document.querySelectorAll("dialog").forEach(d => d.addEventListener("click", e => { if(e.target === d) d.close(); }));
  // Esc limpia la vista
  // ver una vista en grande: el botón ⤢ de su cabecera la abre casi a pantalla completa (se redibuja con su nuevo
  // tamaño); el mismo botón, el fondo o Esc la devuelven a su lugar
  const setMax = box => {
    document.querySelectorAll(".is-max").forEach(b => { b.classList.remove("is-max"); b.querySelector(".vx").setAttribute("aria-label", "Expand view"); });
    $("maxbg").hidden = !box;
    document.querySelectorAll(".vx").forEach(b => b.title = "Expand (Esc to close)");
    if(box){ box.classList.add("is-max"); const b = box.querySelector(".vx"); b.setAttribute("aria-label", "Restore view"); b.title = "Restore (Esc)"; }
    requestAnimationFrame(drawAll);   // el nuevo tamaño ya está aplicado: cada vista se redibuja a su escala
  };
  document.querySelectorAll(".vx").forEach(b => b.addEventListener("click", e => {
    e.stopPropagation(); const box = b.closest(".panel, .sec"); setMax(box.classList.contains("is-max") ? null : box); }));
  $("maxbg").addEventListener("click", () => setMax(null));
  // Espacio y ← → controlan la reproducción de los mapas (fase 5 de PLAN.md), salvo al escribir o con un control enfocado
  addEventListener("keydown", e => {
    if(![" ", "ArrowLeft", "ArrowRight"].includes(e.key) || e.defaultPrevented || document.querySelector("dialog[open]") || document.body.classList.contains("tab-ml")) return;
    const t = e.target; if(t && t.closest && t.closest("input, select, textarea, button, [contenteditable], [role=button], .sbox")) return;
    if(dyn.key(e.key)) e.preventDefault();
  });
  addEventListener("keydown", e => {
    if(e.key !== "Escape" || e.defaultPrevented || document.querySelector("dialog[open]") || document.body.classList.contains("tab-ml")) return;
    if(document.querySelector(".is-max")){ setMax(null); return; }
    { const f = valFront(); if(f){ closeVal(f.querySelector(".sec-btn").id); return; } }
    resetAll(); });
  bus.on("select.status", updateStatus); bus.on("pin.status", updateStatus); bus.on("axes.status", updateStatus);

  $("boot").classList.add("done");   // la rejilla se muestra antes de dibujar para que cada vista mida su espacio real
  scatter.render(); topo.render(); dyn.render(); indiv.render(); side.render(); drawValList();
  updateStatus();
  if(document.fonts) document.fonts.ready.then(drawAll);
  // cada vista se redibuja cuando cambia el tamaño real de su contenedor
  const sizes = new Map(); let rt;
  const ro = new ResizeObserver(entries => {
    let changed = false;
    entries.forEach(e => { const r = e.contentRect, old = sizes.get(e.target); if(!r.width) return;   // pantalla oculta
      if(!old || Math.abs(old[0]-r.width) > 2 || Math.abs(old[1]-r.height) > 2){ sizes.set(e.target, [r.width, r.height]); if(old) changed = true; } });
    if(changed){ clearTimeout(rt); rt = setTimeout(drawAll, 120); }
  });
  ["scatter", "topo", "dyn", "heat", "aper", "conn", "eye"].forEach(id => ro.observe($(id)));
}).catch(err => {
  console.error(err);
  const b = $("boot"); b.classList.add("err");
  b.innerHTML = `<b>The data could not be loaded.</b><span>Open the folder with a local server (see README) or check that <code>data/</code> exists.</span><span style="color:var(--muted)">${err.message}</span>`;
});
