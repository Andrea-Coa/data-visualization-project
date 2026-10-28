/* Arranque: carga los JSON procesados, prepara estado derivado y dibuja las cuatro vistas enlazadas.
   multiverse.json ya no tiene vista propia, pero trae los lapsos y la DE del TR del PVT (marcadores del eje y).
   Servido por HTTP (GitHub Pages o servidor local) lee data/*.json. Abierto con doble clic (file://)
   el navegador bloquea fetch, así que cae a data/data.js, el mismo contenido empaquetado. */
const FILES = ["participants", "topo", "coords", "subject_epochs", "topo_by_subject", "multiverse"];

function loadData(){
  const base = window.BATIMIX_BASE || "";
  return Promise.all(FILES.map(f => d3.json(`${base}data/${f}.json`)))
    .then(([p, t, c, s, st, mv]) => ({participants:p, topo:t, coords:c, subEpochs:s, subTopo:st, multiverse:mv}))
    .catch(() => new Promise((res, rej) => {
      if(window.BATIMIX_DATA) return res(window.BATIMIX_DATA);
      const sc = document.createElement("script"); sc.src = `${base}data/data.js`;
      sc.onload = () => window.BATIMIX_DATA ? res(window.BATIMIX_DATA) : rej(new Error("data.js sin contenido"));
      sc.onerror = () => rej(new Error("no se pudo leer data/"));
      document.head.appendChild(sc);
    }));
}

function prepare(D){
  P = D.participants; TOPO = D.topo; COORDS = D.coords; SUBEP = D.subEpochs; SUBTOPO = D.subTopo || {}; MULTI = D.multiverse || null;
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
    `${EEG.length} tienen EEG en ambas condiciones; entre ellas, PVT ${cov("d_pvt")}, KSS ${cov("d_kss")}, SSS ${cov("d_sss")} y PANAS ${cov("d_panasP")}.`);
}

// ---------- controles del header ----------
let segRoi, segMet;
// tema oscuro (instrumento) o claro (clásico): cambia los tokens de color y fuente, relee la paleta y redibuja todo
function setTheme(t){
  const light = t === "light";
  if(light) document.documentElement.dataset.theme = "light"; else delete document.documentElement.dataset.theme;
  try{ localStorage.setItem("batimix-tema", t); }catch(e){}
  document.querySelector('meta[name="theme-color"]').content = light ? "#FFFFFF" : "#0B0D12";
  const b = $("themebtn"), next = light ? "oscuro" : "claro";
  b.setAttribute("aria-label", `Cambiar a tema ${next}`); b.title = `Tema ${next}`;
  if(new URLSearchParams(location.search).has("tema")) history.replaceState(null, "", location.pathname + location.hash);
  readPalette(); drawAll();
  if(document.fonts) document.fonts.ready.then(drawAll);   // las fuentes del otro tema cambian la medida del texto
}
const themeNow = () => document.documentElement.dataset.theme === "light" ? "light" : "dark";
function drawAll(){ scatter.render(); topo.render(); dyn.render(); indiv.render(); updateStatus(); }
function setY(v){ S.y = v; $("ysel").value = v; scatter.clearBrushVisual(); scatter.render(); refreshGroup(); topo.render(); bus.call("axes"); }
function setRoi(v){ S.roi = v; S.elec = null; segRoi.set(v); computeX(); scatter.clearBrushVisual(); scatter.render(); refreshGroup(); topo.render(); bus.call("axes"); }
function setMet(v){ S.met = v; segMet.set(v); computeX(); scatter.clearBrushVisual(); scatter.render(); refreshGroup(); topo.render(); bus.call("axes"); }
// electrodo elegido en un mapa: manda en el eje x de la dispersión (clic de nuevo = volver a la región)
function setElec(e){ S.elec = S.elec === e ? null : e; if(S.elec) S.win = null; computeX(); scatter.clearBrushVisual(); scatter.render(); refreshGroup(); topo.render(); bus.call("axes"); }
// ventana de tiempo elegida en la serie: el eje x usa el cambio theta de cada persona dentro de la ventana
function setWin(w){ S.win = w; if(w) S.elec = null; computeX(); scatter.clearBrushVisual(); scatter.render(); refreshGroup(); topo.render(); bus.call("axes"); }
function resetAll(){
  scatter.clearBrushVisual(); S.pair = []; S.elec = null; S.win = null; S.cmp = "none"; computeX();
  setSelected(null); bus.call("pin", null, S.pair); scatter.render(); topo.render(); bus.call("axes");
}
// comparación de dos grupos: las cuatro vistas se dibujan con los dos colores; anula el lazo
function setCmp(k){
  S.cmp = k; scatter.clearBrushVisual(); S.selected = null; S.group = "all";
  scatter.render(); topo.render(); bus.call("axes");
}
const refreshGroup = () => {};   // el cuadrante vulnerable se recalcula en cada dibujo de la dispersión
function fillCmp(){
  d3.select("#cmpsel").selectAll("option").data(COMPARES).join("option").attr("value", c => c.k)
    .text(c => c.g ? `${c.name} (${c.g.map(([, f]) => EEG.filter(f).length).join(" y ")})` : (S.selected ? `Tu selección (${S.selected.length})` : `${c.name} (${EEG.length})`));
}
function updateStatus(){
  fillCmp(); $("cmpsel").value = S.cmp;
  $("resetbtn").disabled = !S.selected && !S.pair.length && !S.elec && !S.win && S.cmp === "none";
  // un solo chip en el header dice qué manda en el eje x cuando no es la región: ventana o electrodo
  const chip = $("xchip"), on = S.elec || S.win;
  chip.hidden = !on;
  if(on) chip.textContent = S.win ? `x: ${winTxt(S.win)}` : `x: ${S.elec}`;
  document.querySelectorAll("#roiseg button").forEach(b => b.setAttribute("aria-pressed", !S.elec && b.dataset.v === S.roi));
  document.querySelectorAll("#metseg button").forEach(b => b.setAttribute("aria-pressed", b.dataset.v === S.met));
}

loadData().then(D => {
  prepare(D); readPalette();
  d3.select("#ysel").selectAll("option").data(Object.entries(MK)).join("option").attr("value", d => d[0]).text(d => d[1].name);
  $("ysel").value = S.y;
  segRoi = setupSeg("roiseg", setRoi); segMet = setupSeg("metseg", setMet);
  d3.select("#ysel").on("change", function(){ setY(this.value); });
  d3.select("#cmpsel").on("change", function(){ setCmp(this.value); });
  d3.select("#resetbtn").on("click", resetAll);
  d3.select("#xchip").on("click", () => S.win ? setWin(null) : setElec(S.elec));
  d3.select("#reportbtn").on("click", () => report.download());
  d3.select("#themebtn").on("click", () => setTheme(themeNow() === "light" ? "dark" : "light"));
  if(themeNow() === "light"){ $("themebtn").setAttribute("aria-label", "Cambiar a tema oscuro"); $("themebtn").title = "Tema oscuro"; }
  d3.select("#aboutbtn").on("click", () => { const d = $("about"); d.showModal ? d.showModal() : d.setAttribute("open", ""); });
  document.querySelectorAll("dialog [data-close]").forEach(b => b.addEventListener("click", () => b.closest("dialog").close()));
  document.querySelectorAll("dialog").forEach(d => d.addEventListener("click", e => { if(e.target === d) d.close(); }));
  // Esc limpia la vista
  addEventListener("keydown", e => { if(e.key !== "Escape" || e.defaultPrevented || document.querySelector("dialog[open]")) return; resetAll(); });
  bus.on("select.status", updateStatus); bus.on("pin.status", updateStatus); bus.on("axes.status", updateStatus);

  $("boot").classList.add("done");   // la rejilla se muestra antes de dibujar para que cada vista mida su espacio real
  scatter.render(); topo.render(); dyn.render(); indiv.render();
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
  ["scatter", "topo", "dyn", "heat"].forEach(id => ro.observe($(id)));
}).catch(err => {
  console.error(err);
  const b = $("boot"); b.classList.add("err");
  b.innerHTML = `<b>No se pudieron cargar los datos.</b><span>Abre la carpeta con un servidor local (ver README) o verifica que exista <code>data/</code>.</span><span style="color:var(--muted)">${err.message}</span>`;
});
