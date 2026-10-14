/* BATIMIX · core: datos, estado compartido, bus de eventos, paleta, formato, estadística y motion.
   Todas las vistas leen de aquí; ninguna vista habla directamente con otra (todo pasa por el bus). */

// ---------- datos (los asigna main.js tras cargar data/*.json) ----------
let P = [], TOPO = {}, COORDS = {}, SUBEP = {}, EEG = [], EEG_IDS = [], ELEC = [];

const $ = id => document.getElementById(id);

// ---------- motion (valores de la skill animate) ----------
// Curva cúbica de Bézier resuelta por Newton-Raphson con bisección de respaldo.
function bezier(x1, y1, x2, y2){
  const cx = 3*x1, bx = 3*(x2-x1)-cx, ax = 1-cx-bx, cy = 3*y1, by = 3*(y2-y1)-cy, ay = 1-cy-by;
  const sx = t => ((ax*t+bx)*t+cx)*t, sy = t => ((ay*t+by)*t+cy)*t, dx = t => (3*ax*t+2*bx)*t+cx;
  return x => {
    if(x <= 0) return 0; if(x >= 1) return 1;
    let t = x;
    for(let i = 0; i < 8; i++){ const e = sx(t)-x; if(Math.abs(e) < 1e-6) return sy(t); const d = dx(t); if(Math.abs(d) < 1e-6) break; t -= e/d; }
    let lo = 0, hi = 1; t = x;
    for(let i = 0; i < 24; i++){ if(sx(t) < x) lo = t; else hi = t; t = (lo+hi)/2; }
    return sy(t);
  };
}
const EASE_OUT = bezier(0.23, 1, 0.32, 1);        // entradas, fundidos, respuesta del sistema
const EASE_IN_OUT = bezier(0.77, 0, 0.175, 1);    // datos que se desplazan en pantalla
const REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches;
const T_MOVE = REDUCE ? 0 : 280;   // morph de posiciones (puntos, ejes, líneas): bajo 300 ms
const T_FADE = 160;                // opacidad: se conserva aun con movimiento reducido
const T_HOVER = 120;

// ---------- paleta: se lee de los tokens CSS, para que claro/oscuro sea una sola fuente ----------
const C = {};
function readPalette(){
  const cs = getComputedStyle(document.documentElement), v = n => cs.getPropertyValue(n).trim();
  const ramp = n => v(n).split(",").map(s => s.trim());
  Object.assign(C, {
    ns: v("--ns"), sd: v("--sd"), rest: v("--rest"), na: v("--na"), sdText: v("--sd-text"),
    ink: v("--ink"), ink2: v("--ink2"), muted: v("--muted"), panel: v("--panel"), rule: v("--rule"), rule2: v("--rule2"),
    sexF: v("--sex-f"), sexM: v("--sex-m"),
    seq: d3.interpolateRgbBasis(ramp("--ramp-seq")), div: d3.interpolateRgbBasis(ramp("--ramp-div")),
    age: d3.interpolateRgb(...ramp("--ramp-age")), psqi: d3.interpolateRgb(...ramp("--ramp-psqi")),
  });
}

// ---------- formato (signo menos tipográfico) ----------
const L = d3.formatLocale({decimal:".", thousands:" ", grouping:[3], currency:["",""], minus:"−"});
const f2 = L.format(".2f"), f3 = L.format(".3f"), fpc = L.format("+.1%");
const fsr = v => v == null || isNaN(v) ? "n/d" : (Math.abs(v) < 1 ? L.format("+.3r")(v) : L.format("+.1f")(v));
const fr = v => v == null || isNaN(v) ? "n/d" : (Math.abs(v) < 1 ? L.format(".3r")(v) : L.format(".1f")(v));
const fp = p => p == null ? "n/d" : (p < 0.001 ? "< 0.001" : L.format(".3f")(p));

// ---------- marcadores, regiones, moderadores ----------
const MK = {
  d_pvt:   {name:"PVT · tiempo de reacción", short:"PVT",    axis:"Δ PVT, mediana del tiempo de reacción (ms)", worse: 1, worseTxt:"más lento"},
  d_kss:   {name:"KSS · somnolencia",        short:"KSS",    axis:"Δ KSS, somnolencia (puntos)",                worse: 1, worseTxt:"más somnoliento"},
  d_sss:   {name:"SSS · somnolencia",        short:"SSS",    axis:"Δ SSS, somnolencia (puntos)",                worse: 1, worseTxt:"más somnoliento"},
  d_panasP:{name:"PANAS · afecto positivo",  short:"PANAS+", axis:"Δ PANAS, afecto positivo (puntos)",          worse:-1, worseTxt:"con menos afecto positivo"},
  d_panasN:{name:"PANAS · afecto negativo",  short:"PANAS−", axis:"Δ PANAS, afecto negativo (puntos)",          worse: 1, worseTxt:"con más afecto negativo"},
};
const ROI = {
  front:{name:"frontal",         var:"d_front_var", pow:"d_front_pow", pref:"f"},
  ct:   {name:"centro-temporal", var:"d_ct_var",    pow:"d_ct_pow",    pref:"c"},
};
let AGE_DOM = [18, 30], PSQI_DOM = [0, 12];
const MOD = {
  none:  {cats:() => [["Cuadrante vulnerable", C.sd], ["Resto", C.rest]], col:d => S.vuln.has(d.id) ? C.sd : C.rest},
  age:   {ramp:() => t => C.age(t), dom:() => AGE_DOM, label:"edad (años)", col:d => d.age != null ? C.age((d.age-AGE_DOM[0])/(AGE_DOM[1]-AGE_DOM[0])) : C.na},
  psqi:  {ramp:() => t => C.psqi(t), dom:() => PSQI_DOM, label:"PSQI (mayor = peor sueño)", na:true, col:d => d.psqi != null ? C.psqi((d.psqi-PSQI_DOM[0])/(PSQI_DOM[1]-PSQI_DOM[0])) : C.na},
  gender:{cats:() => [["Mujer", C.sexF], ["Hombre", C.sexM]], col:d => d.gender === "F" ? C.sexF : C.sexM},
  order: {cats:() => [["NS primero", C.ns], ["SD primero", C.sd]], col:d => d.order === "NS->SD" ? C.ns : C.sd},
};

// ---------- estado + bus ----------
const bus = d3.dispatch("hover", "pin", "select", "axes", "color", "theme");
const S = {
  y:"d_pvt", roi:"front", mod:"none", met:"var", cond:"D", dcond:"both", q:"explore",
  hovered:null, pinned:null, selected:null, vuln:new Set(),
  xKey(){ return ROI[this.roi].var; },
};
function hover(d){ if(S.hovered === (d || null)) return; S.hovered = d || null; bus.call("hover", null, S.hovered); }
function pin(d){ S.pinned = (d && S.pinned && S.pinned.id === d.id) ? null : (d || null); bus.call("pin", null, S.pinned); }
function setSelected(ids, opts = {}){ S.selected = ids && ids.length ? ids : null; bus.call("select", null, {live: !!opts.live}); }
const activeIds = () => S.selected || EEG_IDS;

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
const fRho = s => isNaN(s.rho) ? "n/d" : `ρ = ${f2(s.rho)} <span class="m">[${f2(s.lo)}, ${f2(s.hi)}]</span>`;
// Benjamini–Hochberg: q-valores para las 61 pruebas t por electrodo
function bh(ps){
  const m = ps.length, o = ps.map((p, i) => [p, i]).sort((a, b) => a[0]-b[0]), q = new Array(m);
  let mn = 1;
  for(let k = m-1; k >= 0; k--){ mn = Math.min(mn, o[k][0]*m/(k+1)); q[o[k][1]] = mn; }
  return q;
}
const pOf = (t, met) => met === "var" ? t.sigVar : t.sigMean;
const qOf = (t, met) => met === "var" ? t.qVar : t.qMean;
const sigCount = met => ({p: ELEC.filter(e => pOf(TOPO[e], met) < .05).length, q: ELEC.filter(e => qOf(TOPO[e], met) < .05).length});
function epochStats(ids, pref, cond){
  const mean = [], sem = [], n = [];
  for(let i = 0; i < 75; i++){
    const v = [];
    for(const id of ids){ const s = SUBEP[id], a = s && s[pref+"_"+cond]; if(a && a[i] != null) v.push(a[i]); }
    mean.push(v.length ? d3.mean(v) : null); sem.push(v.length > 1 ? d3.deviation(v)/Math.sqrt(v.length) : 0); n.push(v.length);
  }
  return {mean, sem, n:d3.max(n)};
}
function slopePerMin(arr){
  const pts = arr.map((v, i) => [(i*4+2)/60, v]).filter(p => p[1] != null);
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
const trow = (k, v, col) => `<div class="row"><span>${col ? `<i class="lk" style="background:${col}"></i>` : ""}${k}</span><b>${v}</b></div>`;

// ---------- control segmentado con indicador por clip-path ----------
// El indicador pinta solo el fondo; cada botón mantiene una única etiqueta.
function setupSeg(id, onPick){
  const seg = $(id), btns = [...seg.querySelectorAll("button")];
  const copy = document.createElement("div"); copy.className = "seg-active"; copy.setAttribute("aria-hidden", "true");
  seg.appendChild(copy);
  function place(animate){
    const on = btns.find(b => b.getAttribute("aria-pressed") === "true"); if(!on) return;
    const W = copy.offsetWidth, l = on.offsetLeft-2, r = W-(l+on.offsetWidth);
    seg.classList.toggle("noanim", !animate);
    copy.style.clipPath = `inset(0 ${Math.max(0, r)}px 0 ${Math.max(0, l)}px round 999px)`;
    if(!animate) requestAnimationFrame(() => seg.classList.remove("noanim"));
  }
  btns.forEach(b => b.addEventListener("click", () => { if(b.getAttribute("aria-pressed") === "true") return; onPick(b.dataset.v); }));
  const api = {
    set(v, animate = true){ btns.forEach(b => b.setAttribute("aria-pressed", b.dataset.v === v)); place(animate); },
    place,
  };
  SEGS.push(api);
  return api;
}
const SEGS = [];
