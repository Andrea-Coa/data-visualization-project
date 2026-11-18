/* BATIMIX · core: datos, estado compartido, bus de eventos, paleta, formato y estadística.
   Todas las vistas leen de aquí; ninguna vista habla directamente con otra (todo pasa por el bus).
   Semana 12: sin animaciones de transición; los cambios de estado se dibujan en el acto. Excepción (noviembre 2026):
   la reproducción de los mapas en el tiempo (▶ en la Topography View), siempre iniciada por quien usa la app,
   opcional y con alternativa estática (ventana elegida con clic y la serie de bloques); con prefers-reduced-motion
   no se anima: se avanza con ← →. */

// ---------- datos (los asigna main.js tras cargar data/*.json) ----------
let P = [], TOPO = {}, COORDS = {}, COORDS3 = null, APER = null, CONN = null, QUAL = null, ELEP = null, SUBEP = {}, EEG = [], EEG_IDS = [], ELEC = [], SUBTOPO = {}, MULTI = null;
const $ = id => document.getElementById(id);

// ---------- paleta: se lee de los tokens CSS (una sola fuente de verdad) ----------
const C = {};
function readPalette(){
  const cs = getComputedStyle(document.documentElement), v = n => cs.getPropertyValue(n).trim();
  Object.assign(C, {
    ns:v("--ns"), sd:v("--sd"), vuln:v("--vuln"), rest:v("--rest"), signeg:v("--signeg"), g1:v("--g1"), g2:v("--g2"),
    ink:v("--ink"), ink2:v("--ink2"), muted:v("--muted"), faint:v("--faint"), panel:v("--panel"), rule:v("--rule"), rule2:v("--rule2"),
    sigpos:v("--sigpos") || "#5EE6A8", edot:v("--edot") || "rgba(0,0,0,.35)", mark:v("--mark") || "#1B1B1B", halo:v("--halo") || "#9fb4ff",
    // NS y SD: secuencial (inferno en el tema oscuro, o la rampa del tema si la define); Δ: divergente con cero neutro
    seq:(r => r ? d3.interpolateRgbBasis(r.split(",").map(s => s.trim())) : t => d3.interpolateInferno(.1+.86*Math.max(0, Math.min(1, t))))(v("--ramp-seq")),
    div:d3.interpolateRgbBasis(v("--ramp-div").split(",").map(s => s.trim())),
  });
}

// ---------- formato (signo menos tipográfico) ----------
const L = d3.formatLocale({decimal:".", thousands:" ", grouping:[3], currency:["",""], minus:"−"});
const f2 = L.format(".2f"), f3 = L.format(".3f"), fpc = L.format("+.1%");
const fsr = v => v == null || isNaN(v) ? "n/a" : (Math.abs(v) < 1 ? L.format("+.3r")(v) : L.format("+.1f")(v));
const fr = v => v == null || isNaN(v) ? "n/a" : (Math.abs(v) < 1 ? L.format(".3r")(v) : L.format(".1f")(v));
const fp = p => p == null ? "n/a" : (p < 0.001 ? "< 0.001" : L.format(".3f")(p));
const fTick = (f) => v => Math.abs(v) < 1e-12 ? "0" : f(v);   // "0" en vez de "+0" o "−0.00"

// ---------- marcadores, regiones ----------
const MK = {
  d_pvt:   {name:"PVT · median RT",           short:"PVT RT", axis:"Δ PVT, median reaction time (ms)",         ax2:"Δ RT (ms)",        worse: 1},
  d_pvtl:  {name:"PVT · lapses",              short:"lapses", axis:"Δ PVT, lapses (count)",                      ax2:"Δ lapses",         worse: 1},
  d_pvtsd: {name:"PVT · RT variability",      short:"RT SD",  axis:"Δ PVT, SD of reaction time (ms)",           ax2:"Δ RT SD (ms)",     worse: 1},
  d_kss:   {name:"KSS · sleepiness",          short:"KSS",    axis:"Δ KSS, sleepiness (points)",                ax2:"Δ KSS (points)",   worse: 1},
  d_sss:   {name:"SSS · sleepiness",          short:"SSS",    axis:"Δ SSS, sleepiness (points)",                ax2:"Δ SSS (points)",   worse: 1},
  d_panasP:{name:"PANAS · positive affect",   short:"PANAS+", axis:"Δ PANAS, positive affect (points)",          ax2:"Δ PANAS+ (points)",worse:-1},
  d_panasN:{name:"PANAS · negative affect",   short:"PANAS−", axis:"Δ PANAS, negative affect (points)",          ax2:"Δ PANAS− (points)",worse: 1},
};
const ROI = {
  front:{name:"frontal",         var:"d_front_var", mean:"d_front_pow", pref:"f"},
  ct:   {name:"centrotemporal",  var:"d_ct_var",    mean:"d_ct_pow",    pref:"c"},
};
const METN = {var:"σθ", mean:"μθ"};
// ---------- bandas (fase 4 de PLAN.md) ----------
// Potencia relativa (banda / 1–40 Hz) por época y electrodo, igual que theta. Bordes en tools/eeg_ica.py (sin bins
// contados dos veces): delta [1, 4), theta [4, 8] (regla del notebook 02), alfa (8, 13), beta [13, 30). Theta σ es la
// hipótesis confirmatoria; las demás bandas son exploratorias (FDR dentro de cada banda × métrica, 61 pruebas).
const BANDS = {
  delta:{sym:"δ", name:"delta", Name:"Delta", lo:1, hi:4},
  theta:{sym:"θ", name:"theta", Name:"Theta", lo:4, hi:8},
  alpha:{sym:"α", name:"alpha", Name:"Alpha", lo:8, hi:13},
  beta: {sym:"β", name:"beta",  Name:"Beta",  lo:13, hi:30}};
const BAND_FILES = ["topo", "topo_by_subject", "subject_epochs", "electrode_epochs", "participants_eeg"];
// Los textos de la app están escritos para theta («σθ», «theta», «4–8 Hz»); con otra banda, bandText los cambia al
// vuelo (en i18n.js, sobre cada texto que llega a la página, después de traducir). Lo que solo existe para theta
// (multiverso, parpadeos, sincronía, la dispersión periódica, los hallazgos del About) lleva data-theta-only y no cambia.
function bandText(t){
  if(S.band === "theta" || !t || !/θ|[Tt]heta|4–8/.test(t)) return t;
  const B = BANDS[S.band];
  return t.replace(/θ/g, B.sym).replace(/\btheta\b/g, B.name).replace(/\bTheta\b/g, B.Name).replace(/\bTHETA\b/g, B.Name.toUpperCase())
    .replace(/4–8 Hz/g, `${B.lo}–${B.hi} Hz`).replace(/4–8 \//g, `${B.lo}–${B.hi} /`).replace(/4–8\/1–40/g, `${B.lo}–${B.hi}/1–40`);
}
// los 61 electrodos en tres regiones (las dos primeras son las regiones del header); el mapa de calor y el selector
// de electrodo los ordenan igual: por región y, dentro de ella, de adelante hacia atrás y de izquierda a derecha
const EL_FRONTAL = ["Fp1", "Fp2", "Fpz", "AF3", "AF4", "AF7", "AF8", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "Fz"];
const EL_CT = ["FC1", "FC2", "FC3", "FC4", "FC5", "FC6", "FT7", "FT8", "C1", "C2", "C3", "C4", "C5", "C6", "Cz", "T7", "T8",
  "CP1", "CP2", "CP3", "CP4", "CP5", "CP6", "CPz", "TP7", "TP8", "TP9", "TP10"];
const REG = ["Frontal", "Centrotemporal", "Posterior"];
const regionOf = e => EL_FRONTAL.includes(e) ? 0 : (EL_CT.includes(e) ? 1 : 2);
const electrodes = () => ELEC.slice().sort((a, b) => regionOf(a)-regionOf(b) || COORDS[b][1]-COORDS[a][1] || COORDS[a][0]-COORDS[b][0]);

// ---------- estado + bus ----------
const bus = d3.dispatch("hover", "pin", "select", "axes", "frame");
const S = {
  y:"d_pvt", roi:"front", met:"var",
  hovered:null, pair:[], selected:null, group:"all", vuln:new Set(), elec:null, win:null, cmp:"none", showD:true,   // la matriz siempre muestra NS, SD y Δ (6 mapas)
  // vista temporal: duración de la ventana en épocas de 4 s (WINLENS) y modo serie (bloques de tiempo sin solapamiento)
  winLen:15, series:false,
  marks:"fdr",   // marcas de los mapas Δ: fdr (por defecto), cluster (canales del cluster, descriptivo), p (sin corregir) o none
  band:"theta",   // banda elegida (BANDS); theta es la hipótesis confirmatoria, las demás son exploratorias
  // origen del eje x de la dispersión: ventana de tiempo > electrodo > región
  xKey(){ return this.win ? "wx" : (this.elec ? "ex" : ROI[this.roi][this.met]); },
};
const winTxt = w => `${w[0]*4}–${(w[1]+1)*4} s`;
// Duraciones de ventana que se pueden elegir, en épocas de 4 s: 8 (32 s), 15 (60 s) y 25 (100 s). Las épocas duran
// 4 s, así que «30 s» no existe exacto: la opción corta es 32 s. σθ es una desviación estándar entre épocas y con
// 8 valores es demasiado ruidosa (error relativo ≈ 1/√(2(n−1)) ≈ 27 %), así que con σθ el mínimo es 60 s (15 épocas).
const WINLENS = [8, 15, 25], WIN_MIN_VAR = 15;
const winLenOk = (n, met) => met !== "var" || n >= WIN_MIN_VAR;
// Modo serie: el registro (75 épocas) se parte en bloques consecutivos sin solapamiento del largo elegido; con 32 s
// los bloques serían 9 y no caben alineados, así que la serie usa bloques de 60 s. 15 épocas → 5 bloques de 60 s;
// 25 → 3 bloques de 100 s.
const seriesLen = () => Math.max(S.winLen, WIN_MIN_VAR);
const seriesBlocks = () => { const L = seriesLen(); return d3.range(Math.floor(75/L)).map(k => [k*L, k*L+L-1]); };
// ventana de largo S.winLen centrada en el segundo t (dentro de las 75 épocas)
const winCentered = t => { const L = S.winLen, a = Math.max(0, Math.min(75-L, Math.round(t/4-L/2))); return [a, a+L-1]; };
// valores por persona del electrodo elegido en un mapa, o de la ventana de tiempo elegida en la serie
function computeX(){
  P.forEach(d => { d.ex = null; d.wx = null; });
  if(S.elec) P.forEach(d => { const t = SUBTOPO[d.id] && SUBTOPO[d.id][S.elec]; if(t) d.ex = S.met === "var" ? t.dVar : t.dMean; });
  if(S.win){
    const [a, b] = S.win, pref = ROI[S.roi].pref;
    P.forEach(d => {
      const s = SUBEP[d.id]; if(!s || !s[pref+"_NS"] || !s[pref+"_SD"]) return;
      const ns = s[pref+"_NS"].slice(a, b+1).filter(v => v != null), sd = s[pref+"_SD"].slice(a, b+1).filter(v => v != null);
      if(ns.length < 3 || sd.length < 3) return;
      d.wx = S.met === "var" ? sdPop(sd)-sdPop(ns) : d3.mean(sd)-d3.mean(ns);
    });
  }
}
// ρ de Spearman entre el cambio en un electrodo y el marcador del eje Y (sobre el grupo activo)
function elecRho(e, met){
  const rows = activeIds().map(id => { const t = SUBTOPO[id] && SUBTOPO[id][e], p = P.find(d => d.id === id); return t && p && p[S.y] != null ? {x:met === "var" ? t.dVar : t.dMean, y:p[S.y]} : null; }).filter(Boolean);
  return spearman(rows, "x", "y");
}
const yK = () => S.y;
const mkY = () => MK[S.y];
function xName(){
  if(S.win) return `Δ${METN[S.met]} ${ROI[S.roi].name}, ${winTxt(S.win)}`;
  if(S.elec) return `Δ${METN[S.met]} at ${S.elec}`;
  return `Δ${METN[S.met]} ${ROI[S.roi].name}`;
}
function hover(d){ if(S.hovered === (d || null)) return; S.hovered = d || null; bus.call("hover", null, S.hovered); }
// Clic en un punto: entra como A, el segundo como B, un tercero reemplaza solo a B; clic sobre A o B lo quita.
function pin(d){
  if(!d) S.pair = [];
  else if(S.pair.some(p => p.id === d.id)) S.pair = S.pair.filter(p => p.id !== d.id);
  else S.pair = S.pair.length < 2 ? [...S.pair, d] : [S.pair[0], d];
  bus.call("pin", null, S.pair);
}
const pairLetter = d => { const i = S.pair.findIndex(p => p.id === d.id); return i < 0 ? null : "AB"[i]; };
// lazo o clic: una selección libre. Convive con la comparación de grupos: los colores y las vistas por grupo
// se mantienen, y la selección solo marca a sus personas (anillo en la dispersión, contorno en el mapa de calor)
function setSelected(ids, opts = {}){
  S.selected = ids && ids.length ? ids : null;
  S.group = S.selected ? "lasso" : "all";
  bus.call("select", null, {live: !!opts.live});
}
const activeIds = () => S.selected || EEG_IDS;
// Clic en un punto de la dispersión: la persona entra o sale de la selección (de 1 a n; se suma a la del lazo).
function togglePick(d){
  const cur = S.selected ? [...S.selected] : [], i = cur.indexOf(d.id);
  if(i >= 0) cur.splice(i, 1); else cur.push(d.id);
  setSelected(cur.length ? cur : null);
}
// Comparaciones de dos grupos (tarea T7): cada moderador se ve lado a lado, con dos colores propios,
// en las cuatro vistas a la vez (filas de mapas, ρ por grupo, Δ por época por grupo)
const COMPARES = [
  {k:"none",  name:"No comparison"},
  {k:"sex",   name:"Women vs men", g:[["Women", d => d.gender === "F"], ["Men", d => d.gender === "M"]]},
  {k:"order", name:"Session order", g:[["Normal sleep first", d => d.order === "NS->SD"], ["Deprivation first", d => d.order === "SD->NS"]]},
  {k:"psqi",  name:"Habitual sleep (PSQI)", g:[["PSQI > 5", d => d.psqi != null && d.psqi > 5], ["PSQI ≤ 5", d => d.psqi != null && d.psqi <= 5]]},
  {k:"vuln",  name:"Vulnerable vs rest", circular:true, g:[["Vulnerable", d => S.vuln.has(d.id)], ["Rest", d => !S.vuln.has(d.id)]]},
];
function cmpGroups(){
  const c = COMPARES.find(c => c.k === S.cmp); if(!c || !c.g) return null;
  return c.g.map(([name, f], i) => { const ids = EEG.filter(f).map(d => d.id); return {name, ids, set:new Set(ids), color:i ? C.g2 : C.g1, circular:!!c.circular}; });
}
// grupos que muestran las vistas de detalle (topomapas y serie por época): la selección manda sobre la comparación;
// la comparación sigue coloreando la dispersión y agrupando el mapa de calor
const viewGroups = () => S.selected ? null : cmpGroups();
const groupName = () => S.selected ? "Your selection" : "";
// título de panel: qué muestra, en pocas palabras, la cifra principal en tono apagado y, en el ícono ⓘ,
// los detalles y la lectura del gráfico (tooltip al pasar el cursor o al enfocarlo con el teclado)
function setTitle(id, head, sub, info){
  const h = $(id);
  h.innerHTML = `${head}${sub ? ` <span class="m">${sub}</span>` : ""}`;
  // el ícono ⓘ va junto al nombre de la vista (cabecera del panel o barra de la vista secundaria), no en este subtítulo
  const host = h.closest(".panel, .sec"), slot = (host && host.querySelector(".vh > span, .sec-lbl b")) || h;
  slot.querySelectorAll(":scope > .info").forEach(x => x.remove());
  if(!info) return;
  const i = document.createElement("span");
  i.className = "info"; i.tabIndex = 0; i.setAttribute("role", "button"); i.setAttribute("aria-label", "Chart details"); i.textContent = "i";
  slot.appendChild(i);
  // el texto de la ⓘ no tapa la vista que explica: va al lado del panel (o de la ventana flotante), arriba, donde
  // haya sitio; si no cabe a ningún lado, junto al ícono
  const place = () => {
    tipEl.innerHTML = info; tipEl.style.opacity = 1;
    const p = (i.closest(".sidebox .sec") || host || i).getBoundingClientRect(), ir = i.getBoundingClientRect(), w = tipEl.offsetWidth, h = tipEl.offsetHeight, g = 8;
    let x = p.right + g <= innerWidth - w - 8 ? p.right + g : p.left - g - w >= 8 ? p.left - g - w : null;
    let y = Math.max(8, Math.min(innerHeight - h - 8, ir.top - 6));
    if(x == null){ x = Math.min(innerWidth - w - 8, ir.right + g); y = Math.min(innerHeight - h - 8, ir.bottom + g); }
    tipEl.style.transform = `translate(${Math.max(8, x)}px,${y}px)`;
  };
  i.onpointerenter = place; i.onpointerleave = hideTip;
  i.onfocus = place; i.onblur = hideTip;
  i.onclick = place;   // también con clic o toque (pantallas táctiles, trackpads)
}
// ---------- leyenda flotante dentro del área de datos (dispersión y serie por época) ----------
// Se arrastra (o se mueve con las flechas); un clic sin arrastre la comprime en un ícono ↗ y otro la devuelve.
// Sin posición elegida empieza en la esquina que tapa menos marcas y nunca sobre `avoid`. La posición elegida se
// guarda como fracción del espacio libre y vale mientras no cambie `key` (los ejes). Sin ítems no se dibuja.
// Ítems: {t: texto, mark: "dot" | "ring" | "line" | "dash", c: color, n: tamaño de la clase (opcional)}.
// Sin `mark`, el ítem es una fila de lectura: etiqueta tenue a la izquierda y su valor `v` a la derecha
// (`strong`: el valor principal, en negrita).
function floatLegend(){
  let c = null, g = null, geo = null, pos = null, key = null, min = false, drag = null;
  const pad = 8, lh = 15, isLine = d => d.mark === "line" || d.mark === "dash";
  const at = p => ({x:geo.x0+p.fx*(geo.x1-geo.x0), y:geo.y0+p.fy*(geo.y1-geo.y0)});
  const place = p => { const q = at(p); g.attr("transform", `translate(${q.x-geo.ox},${q.y-geo.oy})`); };
  function corner(){
    const A = c.avoid, cs = [{fx:0, fy:0}, {fx:0, fy:1}, {fx:1, fy:1}, {fx:1, fy:0}];
    const hits = p => { const q = at(p), x1 = q.x+geo.bw, y1 = q.y+geo.bh;
      const onA = A && q.x < A.x1+4 && x1 > A.x0-4 && q.y < A.y1+4 && y1 > A.y0-4;
      return (onA ? 1e3 : 0)+c.marks.filter(([x, y]) => x > q.x-6 && x < x1+6 && y > q.y-6 && y < y1+6).length; };
    return cs.reduce((a, p) => hits(p) < hits(a) ? p : a);
  }
  function draw(){
    g.selectAll("*").remove();
    const items = c.items;
    g.style("display", items.length ? null : "none").attr("tabindex", items.length ? 0 : null);
    if(!items.length){ geo = null; return; }
    g.classed("min", min).attr("aria-expanded", !min)
      .attr("aria-label", min ? "Legend (minimized): press Enter to show it" : `Legend: ${items.map(d => d.t+(d.v != null ? ` ${d.v}` : (d.n != null ? `, n = ${d.n}` : ""))).join("; ")}. Enter minimizes it; arrow keys move it`);
    g.append("title").text(min ? "Show the legend" : "Click to minimize · drag to move");
    const bg = g.append("rect").attr("class", "sbox-bg").attr("rx", 5), tg = g.append("g");
    let ox, oy, bw, bh;
    if(min){   // ícono de expandir: flecha hacia la esquina superior derecha
      const s = 22; tg.append("path").attr("class", "sbox-ico").attr("d", "M-3.5,3.5L3.5,-3.5M-1,-3.5H3.5V1");
      bw = bh = s; ox = oy = -s/2;
    } else {
      const tx = items.some(isLine) ? 19 : (items.some(d => d.mark) ? 13 : 0);
      const labs = items.map((d, i) => {
        const y = i*lh-3.8;
        if(isLine(d)) tg.append("line").attr("x1", 0).attr("x2", 14).attr("y1", y).attr("y2", y).attr("stroke", d.c).attr("stroke-width", 2).attr("stroke-dasharray", d.mark === "dash" ? "4 3" : null);
        else if(d.mark){ const k = tg.append("circle").attr("cx", 4).attr("cy", y).attr("r", 3.5);
          if(d.mark === "ring") k.attr("fill", "none").attr("stroke", d.c).attr("stroke-width", 1.4); else k.attr("fill", d.c); }
        return tg.append("text").attr("class", d.mark ? null : "m").attr("x", tx).attr("y", i*lh).text(d.t);
      });
      // segunda columna, alineada a la derecha: el valor de una fila de lectura o el n de cada clase
      const len = t => t.node().getComputedTextLength();
      const ns = items.map((d, i) => d.v != null ? tg.append("text").attr("class", d.strong ? "strong" : null).attr("y", i*lh).attr("text-anchor", "end").text(d.v)
        : (d.n != null ? tg.append("text").attr("class", "m").attr("y", i*lh).attr("text-anchor", "end").text(`n = ${d.n}`) : null)).filter(Boolean);
      const nx = tx+d3.max(labs, len)+12+(d3.max(ns, len) || 0);
      ns.forEach(t => t.attr("x", nx));
      const bb = tg.node().getBBox(); bw = bb.width+2*pad; bh = bb.height+2*pad-3; ox = bb.x-pad; oy = bb.y-pad+1;
    }
    bg.attr("x", ox).attr("y", oy).attr("width", bw).attr("height", bh);
    const {x0, x1, y0, y1} = c.area;
    geo = {x0:x0+6, x1:Math.max(x0+6, x1-bw-6), y0:y0+6, y1:Math.max(y0+6, y1-bh-6), ox, oy, bw, bh};
    place(pos || corner());
  }
  // se comprime y se expande desde la misma esquina superior izquierda (sin salirse del área de datos)
  function toggle(){
    if(!geo) return;
    const q = at(pos || corner()), f = (v, a, b) => b > a ? Math.max(0, Math.min(1, (v-a)/(b-a))) : 0;
    min = !min; pos = {fx:0, fy:0}; draw(); if(!geo) return;
    pos = {fx:f(q.x, geo.x0, geo.x1), fy:f(q.y, geo.y0, geo.y1)}; place(pos); hideTip();
  }
  function bind(){
    const clamp = v => Math.max(0, Math.min(1, v)), span = k => (geo[k+"1"]-geo[k+"0"]) || 1;
    const move = (dx, dy, from) => { pos = {fx:clamp(from.fx+dx/span("x")), fy:clamp(from.fy+dy/span("y"))}; place(pos); };
    g.on("pointerdown", ev => {
      if(ev.button !== 0 || !geo) return;
      ev.preventDefault(); ev.stopPropagation(); hideTip();
      const [px, py] = d3.pointer(ev, c.svg.node());
      drag = {id:ev.pointerId, px, py, from:pos || corner(), moved:false};
      g.node().setPointerCapture(ev.pointerId);
    }).on("pointermove", ev => {
      if(!drag || ev.pointerId !== drag.id) return;
      ev.stopPropagation(); const [px, py] = d3.pointer(ev, c.svg.node()), dx = px-drag.px, dy = py-drag.py;
      if(!drag.moved && Math.hypot(dx, dy) < 3) return;   // por debajo de 3 px cuenta como clic, no como arrastre
      drag.moved = true; g.classed("drag", true);
      move(dx, dy, drag.from);
    }).on("pointerup", ev => {
      if(!drag || ev.pointerId !== drag.id) return;
      ev.stopPropagation(); const click = !drag.moved; drag = null; g.classed("drag", false);
      if(click) toggle();
    }).on("pointercancel", ev => {
      if(drag && ev.pointerId === drag.id){ drag = null; g.classed("drag", false); }
    }).on("keydown", ev => {
      if(ev.key === "Enter" || ev.key === " "){ ev.preventDefault(); toggle(); return; }
      const d = {ArrowLeft:[-10, 0], ArrowRight:[10, 0], ArrowUp:[0, -10], ArrowDown:[0, 10]}[ev.key];
      if(!d || !geo) return; ev.preventDefault(); move(d[0], d[1], pos || corner());
    });
  }
  return {
    // cfg: {svg, parent: <g> donde se agrega (encima de las marcas), area: {x0, x1, y0, y1}, items, marks: [[x, y]], avoid, key}
    mount(cfg){ c = cfg; if(cfg.key !== key){ key = cfg.key; pos = null; } drag = null;
      g = cfg.parent.append("g").attr("class", "sbox").attr("role", "button"); bind(); draw(); },
    update(items){ if(!g) return; c.items = items; draw(); },
    owns: el => !!(g && g.node().contains(el)),
    // el reporte siempre lleva la leyenda completa: si está comprimida, se expande solo mientras se copia el SVG
    withFull(fn){ if(!min || !g) return fn(); min = false; draw(); try { return fn(); } finally { min = true; draw(); } },
  };
}
const notes = (...ls) => ls.filter(Boolean).map(l => `<p class="note">${nb(l)}</p>`).join("");   // contenido del ícono ⓘ
// ⓘ en tres líneas cortas (17 nov 2026), siguiendo a Lundgard y Satyanarayan (TVCG 2022): primero la conclusión (L4),
// luego cómo leer lo que no dice la leyenda (L3) y al final el método en una línea tenue; el detalle va en About
// cada oración va en su propio nodo de texto: así i18n.js la traduce sola (menos combinaciones en el diccionario)
const sents = l => nb(l.trim()).split(/(?<=[.?!])\s+(?=[A-ZÁÉÍÓÚÑΔσμθ(])/).map(x => `<span>${x}</span>`).join(" ");
const info = (so, read, how) => [["so", so], ["", read], ["how", how]].filter(([, l]) => l && l.trim()).map(([c, l]) => `<p class="note${c ? " " + c : ""}">${sents(l)}</p>`).join("");
const nb = s => s.replace(/ (=|≥|≤|&lt;|&gt;) /g, "\u00a0$1\u00a0");   // "ρ = −0.10" o "p ≥ 0.15" nunca se parten en dos líneas

// ---------- estadística ----------
function ranks(a){
  const o = a.map((v, i) => [v, i]).sort((x, y) => x[0]-y[0]), r = new Array(a.length);
  let i = 0;
  while(i < o.length){ let j = i; while(j+1 < o.length && o[j+1][0] === o[i][0]) j++; const rk = (i+j)/2+1; for(let k = i; k <= j; k++) r[o[k][1]] = rk; i = j+1; }
  return r;
}
function pearson(x, y){
  const mx = d3.mean(x), my = d3.mean(y); let a = 0, b = 0, c = 0;
  for(let i = 0; i < x.length; i++){ const u = x[i]-mx, v = y[i]-my; a += u*v; b += u*u; c += v*v; }
  return a/Math.sqrt(b*c);
}
function spearman(rows, kx, ky){
  const r = rows.filter(d => d[kx] != null && d[ky] != null), n = r.length;
  if(n < 5) return {rho:NaN, n, lo:NaN, hi:NaN};
  const rho = pearson(ranks(r.map(d => d[kx])), ranks(r.map(d => d[ky])));
  const z = Math.atanh(Math.max(-.999999, Math.min(.999999, rho))), se = 1/Math.sqrt(n-3);
  return {rho, n, lo:Math.tanh(z-1.96*se), hi:Math.tanh(z+1.96*se)};
}
// Benjamini y Hochberg: q-valores para las 61 pruebas t por electrodo
function bh(ps){
  const m = ps.length, o = ps.map((p, i) => [p, i]).sort((a, b) => a[0]-b[0]), q = new Array(m);
  let mn = 1;
  for(let k = m-1; k >= 0; k--){ mn = Math.min(mn, o[k][0]*m/(k+1)); q[o[k][1]] = mn; }
  return q;
}
// beta incompleta regularizada I_x(a, b) por fracción continua (Numerical Recipes, betacf)
function betaInc(x, a, b){
  if(x <= 0) return 0; if(x >= 1) return 1;
  const lg = z => { const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, .1208650973866179e-2, -.5395239384953e-5];
    let y = z, t = z+5.5; t -= (z+.5)*Math.log(t); let s = 1.000000000190015; for(const ci of c) s += ci/++y; return -t+Math.log(2.5066282746310005*s/z); };
  const front = Math.exp(lg(a+b)-lg(a)-lg(b)+a*Math.log(x)+b*Math.log(1-x));
  const cf = (x, a, b) => {
    let c = 1, d = 1-(a+b)*x/(a+1); if(Math.abs(d) < 1e-300) d = 1e-300; d = 1/d; let h = d;
    for(let m = 1; m <= 300; m++){
      const m2 = 2*m; let aa = m*(b-m)*x/((a+m2-1)*(a+m2));
      d = 1+aa*d; if(Math.abs(d) < 1e-300) d = 1e-300; c = 1+aa/c; if(Math.abs(c) < 1e-300) c = 1e-300; d = 1/d; h *= d*c;
      aa = -(a+m)*(a+b+m)*x/((a+m2)*(a+m2+1));
      d = 1+aa*d; if(Math.abs(d) < 1e-300) d = 1e-300; c = 1+aa/c; if(Math.abs(c) < 1e-300) c = 1e-300; d = 1/d;
      const del = d*c; h *= del; if(Math.abs(del-1) < 3e-14) break;
    }
    return h;
  };
  return x < (a+1)/(a+b+2) ? front*cf(x, a, b)/a : 1-front*cf(1-x, b, a)/b;
}
// prueba t pareada sobre las diferencias (una muestra contra 0): {t, p bilateral, n}; null con menos de 3 personas
function tTest1(d){
  const n = d.length; if(n < 3) return null;
  const m = d3.mean(d), sd = d3.deviation(d); if(!sd) return null;
  const t = m/(sd/Math.sqrt(n)), df = n-1;
  return {t, p:betaInc(df/(df+t*t), df/2, .5), n};
}
// Welch t de dos muestras (a − b) con gl de Welch-Satterthwaite y p bilateral (betaInc): para el análisis cruzado
function welchT(a, b){
  if(a.length < 2 || b.length < 2) return null;
  const ma = d3.mean(a), mb = d3.mean(b), va = d3.variance(a)/a.length, vb = d3.variance(b)/b.length, se = Math.sqrt(va+vb);
  if(!se) return null;
  const t = (ma-mb)/se, df = (va+vb)**2/(va*va/(a.length-1)+vb*vb/(b.length-1));
  return {diff:ma-mb, t, df, p:betaInc(df/(df+t*t), df/2, .5)};
}
// ---------- prueba de permutación por clusters (Maris y Oostenveld, 2007) ----------
// Para Δ = SD − NS por persona (diseño pareado): t de una muestra por nodo (electrodo, o electrodo × bloque en la
// serie); los nodos vecinos con |t| sobre el umbral de p < 0.05 bilateral y el mismo signo forman un cluster, cuya
// masa es la suma de sus t. La nula se arma invirtiendo al azar el signo del Δ de cada persona (equivale a
// intercambiar NS y SD dentro de la persona) y guardando la mayor |masa| de cada permutación; p del cluster =
// proporción de permutaciones (contando la observada) con una masa máxima ≥ la suya. Controla el error a nivel de
// cluster: dice que la zona cambió, no que cada electrodo de ella cambió. Validada contra
// mne.stats.permutation_cluster_1samp_test (tools/check_app.py, prueba 11).
const CLUSTER = {perms:1000, seed:97, alpha:.05};
// t crítico bilateral para gl = df: bisección sobre la p de betaInc
function tCrit(df, alpha = .05){
  let lo = 0, hi = 50;
  for(let k = 0; k < 80; k++){ const mid = (lo+hi)/2, p = betaInc(df/(df+mid*mid), df/2, .5); if(p > alpha) lo = mid; else hi = mid; }
  return (lo+hi)/2;
}
// vecinos entre electrodos: triangulación de Delaunay de las posiciones 2D (como mne.channels.find_ch_adjacency)
let ADJ = null;
function elecAdjacency(){
  if(ADJ) return ADJ;
  const pts = ELEC.map(e => COORDS[e]), D = d3.Delaunay.from(pts), nb = ELEC.map(() => new Set());
  for(let t = 0; t < D.triangles.length; t += 3){
    const [a, b, c] = [D.triangles[t], D.triangles[t+1], D.triangles[t+2]];
    nb[a].add(b).add(c); nb[b].add(a).add(c); nb[c].add(a).add(b);
  }
  return (ADJ = nb.map(s => [...s]));
}
// vecinos de los nodos electrodo × bloque: vecinos espaciales en el mismo bloque y el mismo electrodo en bloques contiguos
function stAdjacency(nBlocks){
  const A = elecAdjacency(), m = A.length, out = [];
  for(let b = 0; b < nBlocks; b++) for(let i = 0; i < m; i++){
    const n = A[i].map(j => b*m+j); if(b > 0) n.push((b-1)*m+i); if(b < nBlocks-1) n.push((b+1)*m+i); out.push(n);
  }
  return out;
}
function mulberry32(a){ return () => { a |= 0; a = a+0x6D2B79F5|0; let t = Math.imul(a^a>>>15, 1|a); t = t+Math.imul(t^t>>>7, 61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
// X: filas = personas, columnas = nodos (Δ por persona); adj: vecinos de cada nodo. Devuelve los clusters con su p.
function clusterTest(X, adj, opts = {}){
  const rows = X.filter(r => r.every(v => v != null && isFinite(v))), n = rows.length, m = adj.length;
  if(n < 3) return null;
  const nPerm = opts.perms || CLUSTER.perms, thr = tCrit(n-1, CLUSTER.alpha);
  const sq = new Float64Array(m); rows.forEach(r => r.forEach((v, j) => { sq[j] += v*v; }));
  const tOf = sums => Array.from(sums, (s, j) => { const mean = s/n, v = (sq[j]-s*s/n)/(n-1); return v > 0 ? mean/Math.sqrt(v/n) : 0; });
  const clustersOf = t => {
    const seen = new Uint8Array(m), out = [];
    for(let i = 0; i < m; i++){
      if(seen[i] || Math.abs(t[i]) <= thr) continue;
      const sign = Math.sign(t[i]), stack = [i], nodes = []; seen[i] = 1;
      while(stack.length){ const k = stack.pop(); nodes.push(k); for(const j of adj[k]) if(!seen[j] && Math.abs(t[j]) > thr && Math.sign(t[j]) === sign){ seen[j] = 1; stack.push(j); } }
      out.push({nodes:nodes.sort((a, b) => a-b), mass:nodes.reduce((s, k) => s+t[k], 0), sign});
    }
    return out;
  };
  const sums0 = new Float64Array(m); rows.forEach(r => r.forEach((v, j) => { sums0[j] += v; }));
  const t0 = tOf(sums0), obs = clustersOf(t0);
  const rnd = mulberry32(opts.seed || CLUSTER.seed), maxes = [];
  for(let q = 0; q < nPerm; q++){
    const sums = new Float64Array(m);
    for(let i = 0; i < n; i++){ const s = rnd() < .5 ? -1 : 1, r = rows[i]; for(let j = 0; j < m; j++) sums[j] += s*r[j]; }
    const cs = clustersOf(tOf(sums)); maxes.push(cs.length ? Math.max(...cs.map(c => Math.abs(c.mass))) : 0);
  }
  obs.forEach(c => { c.p = (1 + maxes.filter(v => v >= Math.abs(c.mass)).length)/(nPerm+1); });
  return {n, thr, t:t0, clusters:obs.sort((a, b) => a.p-b.p), perms:nPerm};
}
// Δ por persona y electrodo (filas = personas, columnas = ELEC) de los cinco minutos o de una ventana [época, época]
function deltaMatrix(ids, met, w){
  return ids.map(id => {
    if(!w){ const T = SUBTOPO[id]; return ELEC.map(e => T && T[e] ? (met === "var" ? T[e].dVar : T[e].dMean) : null); }
    const p = ELEP && ELEP.persons[id]; if(!p || !p.NS || !p.SD) return ELEC.map(() => null);
    return ELEC.map(e => {
      const i = ELEP.idx[e]; if(i == null) return null;
      const f = c => { const a = p[c][i].slice(w[0], w[1]+1).filter(v => v != null).map(v => v/ELEP.scale); return a.length >= 3 ? (met === "var" ? sdPop(a) : d3.mean(a)) : null; };
      const a = f("NS"), b = f("SD"); return a == null || b == null ? null : b-a;
    });
  });
}
// posición dibujada de un electrodo: TP9 y TP10 quedan fuera del círculo de la cabeza (radio 1.2) y se traen
// justo dentro del borde; la interpolación usa las posiciones reales
const RIM = .94, dpos = e => { const [x, y] = COORDS[e], r = Math.hypot(x, y), k = r > RIM ? RIM/r : 1; return [x*k, y*k]; };
const pOf = (t, met) => met === "var" ? t.sigVar : t.sigMean;
const qOf = (t, met) => met === "var" ? t.qVar : t.qMean;
const sigCount = met => ({p: ELEC.filter(e => pOf(TOPO[e], met) < .05).length, q: ELEC.filter(e => qOf(TOPO[e], met) < .05).length});
// σθ móvil: desviación estándar de la θ regional en una ventana deslizante del largo elegido (S.winLen épocas; 60 s
// por defecto). Antes era fija en 40 s citando a Gudmundsson et al. (2007), pero esa cifra no se pudo verificar en
// el artículo: ahora la ventana la elige quien analiza y la ⓘ explica el compromiso (más corta = más ruido).
// Mismo divisor que σθ en el pipeline (np.std, n). Ojo: σθ de la dispersión promedia las DE de cada electrodo de la
// región; aquí se usa la serie ya promediada por región (subject_epochs.json), así que la escala es menor: sirve
// para ver la forma en el tiempo, no para comparar cifras con la dispersión.
const rollW = () => S.winLen;
const sdPop = a => { const m = d3.mean(a); return Math.sqrt(d3.mean(a, v => (v-m)**2)); };
function rollSD(arr){
  const out = [];
  const w = rollW();
  for(let i = 0; i+w <= 75; i++){ const v = arr.slice(i, i+w).filter(x => x != null); out.push(v.length >= w*.8 ? sdPop(v) : null); }
  return out;
}
// eje del tiempo (segundos) de cada punto: centro de la época, o centro de la ventana móvil
const seriesX = met => met === "var" ? d3.range(75-rollW()+1).map(i => i*4+rollW()*2) : d3.range(75).map(i => i*4+2);
// serie por época de una persona: la de la región o, con un electrodo elegido (clic en un mapa o en una fila del mapa
// de calor), la de ese electrodo (data/electrode_epochs.json); null en las épocas rechazadas
function rawSeries(id, pref, cond){
  if(S.elec && ELEP){
    const p = ELEP.persons[id], i = ELEP.idx[S.elec], a = p && p[cond] && p[cond][i];
    return a ? a.map(v => v == null ? null : v/ELEP.scale) : null;
  }
  const s = SUBEP[id]; return s ? s[pref+"_"+cond] : null;
}
const seriesOf = (id, pref, cond, met) => { const a = rawSeries(id, pref, cond); return a ? (met === "var" ? rollSD(a) : a) : null; };
// media ± EE entre personas, punto a punto; con met = "var", de la σθ móvil
function epochStats(ids, pref, cond, met = "mean"){
  const xs = seriesX(met), mean = [], sem = [], n = [], per = ids.map(id => seriesOf(id, pref, cond, met));
  for(let i = 0; i < xs.length; i++){
    const v = []; for(const a of per) if(a && a[i] != null) v.push(a[i]);
    mean.push(v.length ? d3.mean(v) : null); sem.push(v.length > 1 ? d3.deviation(v)/Math.sqrt(v.length) : 0); n.push(v.length);
  }
  return {mean, sem, n:d3.max(n), xs};
}
// Δ (SD menos NS) punto a punto, persona a persona, con su error estándar
function epochDiffStats(ids, pref, met = "mean"){
  const xs = seriesX(met), mean = [], sem = []; let nMax = 0;
  const per = ids.map(id => [seriesOf(id, pref, "NS", met), seriesOf(id, pref, "SD", met)]);
  for(let i = 0; i < xs.length; i++){
    const v = []; for(const [a, b] of per) if(a && b && a[i] != null && b[i] != null) v.push(b[i]-a[i]);
    mean.push(v.length ? d3.mean(v) : null); sem.push(v.length > 1 ? d3.deviation(v)/Math.sqrt(v.length) : 0); nMax = Math.max(nMax, v.length);
  }
  return {mean, sem, n:nMax, xs};
}
function slopePerMin(arr, xs){
  const pts = arr.map((v, i) => [(xs ? xs[i] : i*4+2)/60, v]).filter(p => p[1] != null);
  const mx = d3.mean(pts, p => p[0]), my = d3.mean(pts, p => p[1]); let a = 0, b = 0;
  pts.forEach(([x, y]) => { a += (x-mx)*(y-my); b += (x-mx)**2; });
  return a/b;
}

// ---------- filas de verificación con mini gráfico (Validation de Explorer y de Classifier) ----------
// Cada fila: nombre y cifra; debajo, una escala fina con la referencia (azar o umbral, punteada), un rango opcional y
// marcas (llena = la cifra principal; vacía = la comparación). Con onOpen la fila es un botón que abre su gráfico.
// rows: {id, k, v, tip, desc?, dom:[a,b], ref?, refLab?, band?:[lo,hi], marks:[{v, lab, open?}]}
function miniRows(el, rows, onOpen, isOn){
  if(!el) return;
  // ventanas bajas: una sola línea por fila (nombre, gráfico de 64 px y cifra; ver styles.css)
  const one = matchMedia("(min-width:1101px) and (max-height:820px)").matches;
  const box = d3.select(el), W = one ? 54 : Math.max(120, (el.clientWidth || 240) - 4), H = one ? 16 : 22;
  const item = box.selectAll(".vrow2").data(rows, d => d.id).join(enter => {
    const r = enter.append(onOpen ? "button" : "div").attr("class", "vrow2");
    if(onOpen) r.attr("type", "button");
    const top = r.append("span").attr("class", "vtop"); top.append("span").attr("class", "vk"); top.append("b").attr("class", "vv");
    if(onOpen) top.append("span").attr("class", "vgo").attr("aria-hidden", "true").text("↗");
    r.append("span").attr("class", "vch"); return r;
  });
  item.attr("title", d => d.tip).classed("on", d => !!(isOn && isOn(d))).classed("clk", !!onOpen);
  if(onOpen) item.on("click", (ev, d) => onOpen(d.id));
  item.select(".vk").text(d => d.k); item.select(".vv").text(d => d.v);
  item.select(".vch").each(function(d){
    const g = d3.select(this); g.selectAll("*").remove();
    if(!d.dom){ g.append("span").attr("class", "vdesc").text(d.desc || ""); return; }
    const x = d3.scaleLinear().domain(d.dom).range([4, W-4]).clamp(true), svg = g.append("svg").attr("width", W).attr("height", H).attr("aria-hidden", "true");
    svg.append("line").attr("x1", x(d.dom[0])).attr("x2", x(d.dom[1])).attr("y1", 9).attr("y2", 9).attr("stroke", C.rule2).attr("stroke-width", 1);
    [d.dom[0], d.dom[1]].filter(v => !(d.ref != null && d.refLab && Math.abs(x(v) - x(d.ref)) < 26)).forEach(v => svg.append("text").attr("class", "vax").attr("x", x(v)).attr("y", 21).attr("text-anchor", v === d.dom[0] ? "start" : "end").text(L.format("~g")(v)));
    if(d.band) svg.append("rect").attr("x", x(d.band[0])).attr("width", Math.max(1, x(d.band[1])-x(d.band[0]))).attr("y", 5).attr("height", 8).attr("fill", C.ink).attr("opacity", .12);
    if(d.ref != null){ svg.append("line").attr("x1", x(d.ref)).attr("x2", x(d.ref)).attr("y1", 2).attr("y2", 16).attr("stroke", C.muted).attr("stroke-dasharray", "2 2");
      if(d.refLab) svg.append("text").attr("class", "vax").attr("x", x(d.ref)).attr("y", 21).attr("text-anchor", "middle").text(d.refLab); }
    (d.marks || []).forEach(m => svg.append("circle").attr("cx", x(m.v)).attr("cy", 9).attr("r", m.open ? 3.4 : 4)
      .attr("fill", m.open ? C.panel : C.ink).attr("stroke", C.ink).attr("stroke-width", 1.3).append("title").text(m.lab ? `${m.lab}: ${L.format(".2f")(m.v)}` : ""));
  });
}

// ---------- tooltip ----------
const tipEl = $("tooltip");
function showTip(e, html){ tipEl.innerHTML = html; tipEl.style.opacity = 1; moveTip(e); }
function moveTip(e){
  const pad = 14, w = tipEl.offsetWidth, h = tipEl.offsetHeight;
  let x = e.clientX+pad, y = e.clientY+pad;
  if(x+w > innerWidth-8) x = e.clientX-w-pad;
  if(y+h > innerHeight-8) y = e.clientY-h-pad;
  tipEl.style.transform = `translate(${Math.max(8, x)}px,${Math.max(8, y)}px)`;
}
const hideTip = () => { tipEl.style.opacity = 0; };
// calidad del EEG de una persona (tools/build_quality.py): épocas usadas, canales interpolados y parpadeos, NS y SD
function qualRows(id){
  const q = QUAL && QUAL.persons[id]; if(!q) return "";
  const one = c => q[c] ? `${q[c].epochs ?? "?"} ep${q[c].ica_removed != null ? ` · ${q[c].ica_removed} ICA` : ""} · ${q[c].interpolated.length ? `interp. ${q[c].interpolated.join(", ")}` : "no interp."}${q[c].blinks_per_min != null ? ` · ${q[c].blinks_per_min} blinks/min` : ""}` : "excluded";
  return `<div class="m" style="margin-top:4px">EEG quality</div>` + trow("Normal Sleep", one("NS")) + trow("Sleep Deprivation", one("SD"));
}
const trow = (k, v, col) => `<div class="row"><span>${col ? `<i class="lk" style="background:${col}"></i>` : ""}${k}</span><b>${v}</b></div>`;

// ---------- control segmentado ----------
function setupSeg(id, onPick){
  const seg = $(id), btns = [...seg.querySelectorAll("button")];
  btns.forEach(b => b.addEventListener("click", () => { if(b.getAttribute("aria-pressed") === "true") return; onPick(b.dataset.v); }));
  return {set(v){ btns.forEach(b => b.setAttribute("aria-pressed", b.dataset.v === v)); }};
}
