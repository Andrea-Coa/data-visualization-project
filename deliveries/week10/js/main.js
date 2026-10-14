/* Arranque: carga los JSON procesados, prepara estado derivado, inicia la historia y el explorador enlazado.
   Servido por HTTP (GitHub Pages o servidor local) lee data/*.json. Abierto con doble clic (file://)
   el navegador bloquea fetch, así que cae a data/data.js, el mismo contenido empaquetado. */
const FILES = ["participants", "topo", "coords", "subject_epochs"];

function loadData(){
  return Promise.all(FILES.map(f => d3.json(`data/${f}.json`)))
    .then(([p, t, c, s]) => ({participants:p, topo:t, coords:c, subEpochs:s}))
    .catch(() => new Promise((res, rej) => {
      if(window.BATIMIX_DATA) return res(window.BATIMIX_DATA);
      const sc = document.createElement("script"); sc.src = "data/data.js";
      sc.onload = () => window.BATIMIX_DATA ? res(window.BATIMIX_DATA) : rej(new Error("data.js sin contenido"));
      sc.onerror = () => rej(new Error("no se pudo leer data/"));
      document.head.appendChild(sc);
    }));
}

function prepare(D){
  P = D.participants; TOPO = D.topo; COORDS = D.coords; SUBEP = D.subEpochs;
  EEG = P.filter(d => d.d_front_var != null); EEG_IDS = EEG.map(d => d.id);
  ELEC = Object.keys(COORDS).filter(e => TOPO[e]);
  const qv = bh(ELEC.map(e => TOPO[e].sigVar)), qm = bh(ELEC.map(e => TOPO[e].sigMean));
  ELEC.forEach((e, i) => { TOPO[e].qVar = qv[i]; TOPO[e].qMean = qm[i]; });
  AGE_DOM = d3.extent(P, d => d.age); PSQI_DOM = d3.extent(P.filter(d => d.psqi != null), d => d.psqi);
}

// ---------- controles del explorador ----------
let segRoi, segMet, segCond, segDc;
function setY(v){ S.y = v; $("ysel").value = v; scatter.clearBrushVisual(); scatter.render(); bus.call("axes"); }
function setRoi(v){ S.roi = v; segRoi.set(v); scatter.clearBrushVisual(); scatter.render(); bus.call("axes"); }
function setMod(v){ S.mod = v; $("modsel").value = v; bus.call("color"); }
function setMet(v){ S.met = v; segMet.set(v); topo.render(); }
function setCond(v){ S.cond = v; segCond.set(v); topo.render(); }
function setDcond(v){ S.dcond = v; segDc.set(v); dyn.render(); }
function resetAll(){ scatter.clearBrushVisual(); if(S.pinned) pin(null); setSelected(null); dyn.stop(); }

function updateStatus(){
  const n = S.selected ? S.selected.length : EEG.length; $("nact").textContent = n;
  $("seltag").textContent = S.selected ? "· selección" : "· grupo completo";
  $("resetbtn").disabled = !S.selected && !S.pinned;
  const ny = EEG.filter(d => d[S.y] != null).length, cls = n => n >= 60 ? "full" : (n >= 30 ? "part" : "low");
  $("covchips").innerHTML = `<span class="chip full"><i></i>EEG n = ${EEG.length}</span><span class="chip ${cls(ny)}"><i></i>${MK[S.y].short} n = ${ny}</span>` +
    (S.selected ? `<span class="chip ${cls(S.selected.length)}"><i></i>selección n = ${S.selected.length}</span>` : "");
}

// ---------- revelados y navegación (IntersectionObserver, sin scroll listeners) ----------
function observeChrome(){
  // solo se ocultan (para entrar suave) los bloques que al cargar están fuera de pantalla; sin JS todo queda visible
  const rv = new IntersectionObserver(es => es.forEach(e => { if(e.isIntersecting){ e.target.classList.remove("pre"); rv.unobserve(e.target); } }), {rootMargin:"0px 0px -12% 0px"});
  document.querySelectorAll(".reveal").forEach(n => { if(n.getBoundingClientRect().top > innerHeight) n.classList.add("pre"); rv.observe(n); });
  const links = [...document.querySelectorAll(".top nav a")];
  const nav = new IntersectionObserver(es => es.forEach(e => { if(e.isIntersecting) links.forEach(a => a.setAttribute("aria-current", a.dataset.sec === e.target.id)); }), {rootMargin:"-50% 0px -50% 0px"});
  ["historia", "explorar", "metodo"].map(id => $(id)).filter(Boolean).forEach(section => nav.observe(section));
}

// ---------- arranque ----------
loadData().then(D => {
  prepare(D); readPalette();
  d3.select("#ysel").selectAll("option").data(Object.entries(MK)).join("option").attr("value", d => d[0]).text(d => d[1].name);
  $("ysel").value = S.y; $("modsel").value = S.mod;
  segRoi = setupSeg("roiseg", setRoi); segMet = setupSeg("metseg", setMet); segCond = setupSeg("condseg", setCond); segDc = setupSeg("dyncondseg", setDcond);
  d3.select("#ysel").on("change", function(){ setY(this.value); });
  d3.select("#modsel").on("change", function(){ setMod(this.value); });
  d3.select("#playbtn").on("click", () => dyn.play());
  d3.select("#resetbtn").on("click", resetAll);
  addEventListener("keydown", e => { if(e.key === "Escape" && !e.defaultPrevented) resetAll(); });
  bus.on("select.status", updateStatus); bus.on("pin.status", updateStatus); bus.on("axes.status", updateStatus);

  observeChrome();
  story.init();
  scatter.render(false); topo.render(false); dyn.render({live:true}); updateStatus();
  SEGS.forEach(s => s.place(false));
  syncHeights();
  const boot = $("boot"); boot.classList.add("done"); setTimeout(() => boot.remove(), 450);
  // las fuentes cambian anchos: recolocar indicadores y alturas al terminar de cargar
  if(document.fonts) document.fonts.ready.then(() => { SEGS.forEach(s => s.place(false)); syncHeights(); setTimeout(syncHeights, 300); });

  let lastW = innerWidth, lastH = innerHeight, rt;
  addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      const wChanged = Math.abs(innerWidth-lastW) > 1, hChanged = Math.abs(innerHeight-lastH) > (innerWidth > 1100 ? 1 : 80);
      if(!wChanged && !hChanged) return;     // la barra del navegador móvil cambia la altura: se ignora
      lastW = innerWidth; lastH = innerHeight;
      story.resize();
      if(wChanged || hChanged){
        scatter_h = null; scatter.rebuild(); topo.rebuild(); dyn.rebuild();
        scatter.render(false); topo.render(false); dyn.render({live:true}); scatter.paint();
        SEGS.forEach(s => s.place(false)); syncHeights();
      }
    }, 160);
  });
}).catch(err => {
  console.error(err);
  const b = $("boot"); b.classList.add("err");
  b.innerHTML = `<b>No se pudieron cargar los datos.</b><span>Abre la carpeta con un servidor local (ver README) o verifica que exista <code>data/</code>.</span><span style="color:var(--muted)">${err.message}</span>`;
});
