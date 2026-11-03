/* BATIMIX · core: datos, estado compartido, bus de eventos, paleta, formato y estadística.
   Todas las vistas leen de aquí; ninguna vista habla directamente con otra (todo pasa por el bus).
   Semana 12: sin animaciones; los cambios de estado se dibujan en el acto. */

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
// los 61 electrodos en tres regiones (las dos primeras son las regiones del header); el mapa de calor y el selector
// de electrodo los ordenan igual: por región y, dentro de ella, de adelante hacia atrás y de izquierda a derecha
const EL_FRONTAL = ["Fp1", "Fp2", "Fpz", "AF3", "AF4", "AF7", "AF8", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "Fz"];
const EL_CT = ["FC1", "FC2", "FC3", "FC4", "FC5", "FC6", "FT7", "FT8", "C1", "C2", "C3", "C4", "C5", "C6", "Cz", "T7", "T8",
  "CP1", "CP2", "CP3", "CP4", "CP5", "CP6", "CPz", "TP7", "TP8", "TP9", "TP10"];
const REG = ["Frontal", "Centrotemporal", "Posterior"];
const regionOf = e => EL_FRONTAL.includes(e) ? 0 : (EL_CT.includes(e) ? 1 : 2);
const electrodes = () => ELEC.slice().sort((a, b) => regionOf(a)-regionOf(b) || COORDS[b][1]-COORDS[a][1] || COORDS[a][0]-COORDS[b][0]);

// ---------- estado + bus ----------
const bus = d3.dispatch("hover", "pin", "select", "axes");
const S = {
  y:"d_pvt", roi:"front", met:"var",
  hovered:null, pair:[], selected:null, group:"all", vuln:new Set(), elec:null, win:null, cmp:"none", showD:true,   // la matriz siempre muestra NS, SD y Δ (6 mapas)
  // origen del eje x de la dispersión: ventana de tiempo > electrodo > región
  xKey(){ return this.win ? "wx" : (this.elec ? "ex" : ROI[this.roi][this.met]); },
};
const winTxt = w => `${w[0]*4}–${(w[1]+1)*4} s`;
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
  {k:"vuln",  name:"Vulnerable vs rest", g:[["Vulnerable", d => S.vuln.has(d.id)], ["Rest", d => !S.vuln.has(d.id)]]},
];
function cmpGroups(){
  const c = COMPARES.find(c => c.k === S.cmp); if(!c || !c.g) return null;
  return c.g.map(([name, f], i) => { const ids = EEG.filter(f).map(d => d.id); return {name, ids, set:new Set(ids), color:i ? C.g2 : C.g1}; });
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
  const at = () => { const r = i.getBoundingClientRect(); return {clientX:r.right, clientY:r.bottom}; };
  i.onpointerenter = e => showTip(e, info); i.onpointermove = e => moveTip(e); i.onpointerleave = hideTip;
  i.onfocus = () => showTip(at(), info); i.onblur = hideTip;
  i.onclick = e => showTip(e, info);   // también con clic o toque (pantallas táctiles, trackpads)
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
const pOf = (t, met) => met === "var" ? t.sigVar : t.sigMean;
const qOf = (t, met) => met === "var" ? t.qVar : t.qMean;
const sigCount = met => ({p: ELEC.filter(e => pOf(TOPO[e], met) < .05).length, q: ELEC.filter(e => qOf(TOPO[e], met) < .05).length});
// σθ móvil: desviación estándar de la θ regional en una ventana deslizante de ROLL_W épocas (10 × 4 s = 40 s; la
// potencia espectral del EEG en reposo alcanza su confiabilidad máxima hacia los 40 s: Gudmundsson et al., 2007).
// Mismo divisor que σθ en el pipeline (np.std, n). Ojo: σθ de la dispersión promedia las DE de cada electrodo de la
// región; aquí se usa la serie ya promediada por región (subject_epochs.json), así que la escala es menor: sirve
// para ver la forma en el tiempo, no para comparar cifras con la dispersión.
const ROLL_W = 10;
const sdPop = a => { const m = d3.mean(a); return Math.sqrt(d3.mean(a, v => (v-m)**2)); };
function rollSD(arr){
  const out = [];
  for(let i = 0; i+ROLL_W <= 75; i++){ const v = arr.slice(i, i+ROLL_W).filter(x => x != null); out.push(v.length >= ROLL_W*.8 ? sdPop(v) : null); }
  return out;
}
// eje del tiempo (segundos) de cada punto: centro de la época, o centro de la ventana móvil
const seriesX = met => met === "var" ? d3.range(75-ROLL_W+1).map(i => i*4+ROLL_W*2) : d3.range(75).map(i => i*4+2);
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
