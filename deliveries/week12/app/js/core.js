/* BATIMIX · core: datos, estado compartido, bus de eventos, paleta, formato y estadística.
   Todas las vistas leen de aquí; ninguna vista habla directamente con otra (todo pasa por el bus).
   Semana 12: sin animaciones; los cambios de estado se dibujan en el acto. */

// ---------- datos (los asigna main.js tras cargar data/*.json) ----------
let P = [], TOPO = {}, COORDS = {}, SUBEP = {}, EEG = [], EEG_IDS = [], ELEC = [], SUBTOPO = {}, MULTI = null;
const $ = id => document.getElementById(id);

// ---------- paleta: se lee de los tokens CSS (una sola fuente de verdad) ----------
const C = {};
function readPalette(){
  const cs = getComputedStyle(document.documentElement), v = n => cs.getPropertyValue(n).trim();
  Object.assign(C, {
    ns:v("--ns"), sd:v("--sd"), vuln:v("--vuln"), rest:v("--rest"), signeg:v("--signeg"), g1:v("--g1"), g2:v("--g2"),
    ink:v("--ink"), ink2:v("--ink2"), muted:v("--muted"), faint:v("--faint"), panel:v("--panel"), rule:v("--rule"), rule2:v("--rule2"),
    sigpos:v("--sigpos") || "#5EE6A8", edot:v("--edot") || "rgba(232,234,240,.45)", halo:v("--halo") || "#9fb4ff",
    // NS y SD: secuencial (inferno en el tema oscuro, o la rampa del tema si la define); Δ: divergente con cero neutro
    seq:(r => r ? d3.interpolateRgbBasis(r.split(",").map(s => s.trim())) : t => d3.interpolateInferno(.1+.86*Math.max(0, Math.min(1, t))))(v("--ramp-seq")),
    div:d3.interpolateRgbBasis(v("--ramp-div").split(",").map(s => s.trim())),
  });
}

// ---------- formato (signo menos tipográfico) ----------
const L = d3.formatLocale({decimal:".", thousands:" ", grouping:[3], currency:["",""], minus:"−"});
const f2 = L.format(".2f"), f3 = L.format(".3f"), fpc = L.format("+.1%");
const fsr = v => v == null || isNaN(v) ? "n/d" : (Math.abs(v) < 1 ? L.format("+.3r")(v) : L.format("+.1f")(v));
const fr = v => v == null || isNaN(v) ? "n/d" : (Math.abs(v) < 1 ? L.format(".3r")(v) : L.format(".1f")(v));
const fp = p => p == null ? "n/d" : (p < 0.001 ? "< 0.001" : L.format(".3f")(p));
const fTick = (f) => v => Math.abs(v) < 1e-12 ? "0" : f(v);   // "0" en vez de "+0" o "−0.00"

// ---------- marcadores, regiones ----------
const MK = {
  d_pvt:   {name:"PVT · mediana del TR",      short:"PVT TR", axis:"Δ PVT, mediana del tiempo de reacción (ms)", ax2:"Δ TR (ms)",        worse: 1},
  d_pvtl:  {name:"PVT · lapsos",              short:"lapsos", axis:"Δ PVT, lapsos (número)",                     ax2:"Δ lapsos",         worse: 1},
  d_pvtsd: {name:"PVT · variabilidad del TR", short:"DE TR",  axis:"Δ PVT, desviación estándar del TR (ms)",     ax2:"Δ DE TR (ms)",     worse: 1},
  d_kss:   {name:"KSS · somnolencia",         short:"KSS",    axis:"Δ KSS, somnolencia (puntos)",                ax2:"Δ KSS (puntos)",   worse: 1},
  d_sss:   {name:"SSS · somnolencia",         short:"SSS",    axis:"Δ SSS, somnolencia (puntos)",                ax2:"Δ SSS (puntos)",   worse: 1},
  d_panasP:{name:"PANAS · afecto positivo",   short:"PANAS+", axis:"Δ PANAS, afecto positivo (puntos)",          ax2:"Δ PANAS+ (puntos)",worse:-1},
  d_panasN:{name:"PANAS · afecto negativo",   short:"PANAS−", axis:"Δ PANAS, afecto negativo (puntos)",          ax2:"Δ PANAS− (puntos)",worse: 1},
};
const ROI = {
  front:{name:"frontal",         var:"d_front_var", mean:"d_front_pow", pref:"f"},
  ct:   {name:"centro-temporal", var:"d_ct_var",    mean:"d_ct_pow",    pref:"c"},
};
const METN = {var:"σθ", mean:"μθ"};

// ---------- estado + bus ----------
const bus = d3.dispatch("hover", "pin", "select", "axes");
const S = {
  y:"d_pvt", roi:"front", met:"var",
  hovered:null, pair:[], selected:null, group:"all", vuln:new Set(), spec:null, elec:null, win:null, cmp:"none",
  // origen del eje x de la dispersión: análisis del multiverso > ventana de tiempo > electrodo > región
  xKey(){ return this.spec ? "mvx" : (this.win ? "wx" : (this.elec ? "ex" : ROI[this.roi][this.met])); },
};
const winTxt = w => `${w[0]*4} a ${(w[1]+1)*4} s`;
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
      d.wx = S.met === "var" ? d3.deviation(sd)-d3.deviation(ns) : d3.mean(sd)-d3.mean(ns);
    });
  }
}
// ρ de Spearman entre el cambio en un electrodo y el marcador del eje Y (sobre el grupo activo)
function elecRho(e, met){
  const rows = activeIds().map(id => { const t = SUBTOPO[id] && SUBTOPO[id][e], p = P.find(d => d.id === id); return t && p && p[S.y] != null ? {x:met === "var" ? t.dVar : t.dMean, y:p[S.y]} : null; }).filter(Boolean);
  return spearman(rows, "x", "y");
}
const yK = () => S.spec ? "mvy" : S.y;
function mvLabel(dim, key){ const d = MULTI && MULTI.dims.find(x => x.key === dim); const o = d && d.opts.find(x => x.key === key); return o ? o.label : key; }
function mkY(){
  if(!S.spec) return MK[S.y];
  const lab = mvLabel("marker", S.spec.marker);
  return {name:lab, short:lab, axis:`Δ ${lab}, ↑ peor`, ax2:`Δ ${lab}`, worse:1};
}
function xName(){
  if(S.spec) return `Δ ${METN[S.spec.met]} ${mvLabel("roi", S.spec.roi)}`;
  if(S.win) return `Δ${METN[S.met]} ${ROI[S.roi].name}, ${winTxt(S.win)}`;
  if(S.elec) return `Δ${METN[S.met]} en ${S.elec}`;
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
// lazo: una selección libre; anula la comparación de grupos (son modos excluyentes)
function setSelected(ids, opts = {}){
  S.selected = ids && ids.length ? ids : null;
  S.group = S.selected ? "lasso" : "all";
  if(S.selected && !opts.live) S.cmp = "none";
  bus.call("select", null, {live: !!opts.live});
}
const activeIds = () => S.selected || EEG_IDS;
// Comparaciones de dos grupos (tarea T7): cada moderador se ve lado a lado, con dos colores propios,
// en las cuatro vistas a la vez (filas de mapas, ρ por grupo, Δ por época por grupo)
const COMPARES = [
  {k:"none",  name:"Sin comparación"},
  {k:"sex",   name:"Mujeres vs hombres", g:[["Mujeres", d => d.gender === "F"], ["Hombres", d => d.gender === "M"]]},
  {k:"order", name:"Orden de sesión", g:[["Normal primero", d => d.order === "NS->SD"], ["Privación primero", d => d.order === "SD->NS"]]},
  {k:"psqi",  name:"Sueño habitual (PSQI)", g:[["PSQI > 5", d => d.psqi != null && d.psqi > 5], ["PSQI ≤ 5", d => d.psqi != null && d.psqi <= 5]]},
  {k:"vuln",  name:"Vulnerables vs resto", g:[["Vulnerables", d => S.vuln.has(d.id)], ["Resto", d => !S.vuln.has(d.id)]]},
];
function cmpGroups(){
  const c = COMPARES.find(c => c.k === S.cmp); if(!c || !c.g) return null;
  return c.g.map(([name, f], i) => { const ids = EEG.filter(f).map(d => d.id); return {name, ids, set:new Set(ids), color:i ? C.g2 : C.g1}; });
}
const groupName = () => S.selected ? "Tu selección" : "";
// adjetivo de deterioro por marcador, para titulares breves ("Más inestable ≠ más lento")
const ADJ = {d_pvt:"lento", d_pvtl:"distraído", d_pvtsd:"irregular", d_kss:"somnoliento", d_sss:"somnoliento", d_panasP:"desanimado", d_panasN:"irritable"};
// título de panel: etiqueta de tarea, titular breve y cifras de respaldo en tono apagado
function setTitle(id, task, head, sub){ $(id).innerHTML = `<span class="task">${task}</span>${head}${sub ? ` <span class="m">${sub}</span>` : ""}`; }
const nb = s => s.replace(/ = /g, "\u00a0=\u00a0");   // "ρ = −0.10" nunca se parte en dos líneas

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
function epochStats(ids, pref, cond){
  const mean = [], sem = [], n = [];
  for(let i = 0; i < 75; i++){
    const v = [];
    for(const id of ids){ const s = SUBEP[id], a = s && s[pref+"_"+cond]; if(a && a[i] != null) v.push(a[i]); }
    mean.push(v.length ? d3.mean(v) : null); sem.push(v.length > 1 ? d3.deviation(v)/Math.sqrt(v.length) : 0); n.push(v.length);
  }
  return {mean, sem, n:d3.max(n)};
}
// Δ (SD menos NS) por época, persona a persona, con su error estándar
function epochDiffStats(ids, pref){
  const mean = [], sem = []; let nMax = 0;
  for(let i = 0; i < 75; i++){
    const v = [];
    for(const id of ids){ const s = SUBEP[id]; if(!s) continue; const a = s[pref+"_NS"], b = s[pref+"_SD"]; if(a && b && a[i] != null && b[i] != null) v.push(b[i]-a[i]); }
    mean.push(v.length ? d3.mean(v) : null); sem.push(v.length > 1 ? d3.deviation(v)/Math.sqrt(v.length) : 0); nMax = Math.max(nMax, v.length);
  }
  return {mean, sem, n:nMax};
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

// ---------- brillo suave (filtro SVG estático) para líneas y puntos clave: estética de instrumento ----------
function addGlow(svg, id, sd = 2){
  const f = svg.append("defs").append("filter").attr("id", id).attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
  f.append("feGaussianBlur").attr("stdDeviation", sd).attr("result", "b");
  const mg = f.append("feMerge"); mg.append("feMergeNode").attr("in", "b"); mg.append("feMergeNode").attr("in", "SourceGraphic");
  return `url(#${id})`;
}

// ---------- control segmentado ----------
function setupSeg(id, onPick){
  const seg = $(id), btns = [...seg.querySelectorAll("button")];
  btns.forEach(b => b.addEventListener("click", () => { if(b.getAttribute("aria-pressed") === "true") return; onPick(b.dataset.v); }));
  return {set(v){ btns.forEach(b => b.setAttribute("aria-pressed", b.dataset.v === v)); }};
}
