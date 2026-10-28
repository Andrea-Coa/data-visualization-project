/* Vista 4 · Multiverso (tarea T8, diferencial de la Semana 12).
   Izquierda: curva de especificación (Simonsohn, Simmons y Nelson, 2020): los 448 análisis ordenados por r, sobre la
   franja que produciría el azar (2000 permutaciones) y la referencia de Cui et al. (2026). Sin bigotes: el IC va en el tooltip.
   Derecha: qué decisión mueve el resultado: una fila por opción con la mediana de r (punto) y su rango intercuartil (barra).
   Clic en una fila = filtra la curva; clic en un análisis de la curva (o flechas + Enter) = se carga en la dispersión.
   Datos: data/multiverse.json, generado por tools/build_multiverse.py. */
const multi = (() => {
  const el = $("curve");
  let svg, W, H, specs = [], rows = [], F = {}, cx, cy, colW, curveG, guide, rowsG, built = false, cursor = -1, A;
  const ORIG = {roi:"front", met:"var", delta:"abs", marker:"pvt_rt", corr:"spearman", out:"all"};
  const CUI = 0.55, POS = "#5EE6A8";
  const isOrig = s => Object.keys(ORIG).every(k => s[k] === ORIG[k]);
  const match = s => Object.entries(F).every(([k, v]) => s[k] === v);
  const colOf = s => s.p < .05 ? (s.r > 0 ? POS : C.signeg) : C.ink2;
  const fR = v => Math.abs(v) < .005 ? "0.00" : L.format("+.2f")(v);
  // etiquetas cortas para la columna de decisiones (la etiqueta completa va en el tooltip)
  const SHORT = {front:"frontal", ct:"c-temporal", post:"posterior", all:"global", var:"σθ", mean:"μθ", abs:"absoluto", rel:"relativo",
    pvt_rt:"PVT mediana", pvt_lapses:"PVT lapsos", pvt_sd:"PVT DE", kss:"KSS", sss:"SSS", panasP:"PANAS+ inv.", panasN:"PANAS−", spearman:"Spearman", pearson:"Pearson", z25:"sin atípicos"};
  const short = (dim, key) => dim === "out" && key === "all" ? "todos" : (SHORT[key] || key);

  function build(){
    d3.select(el).selectAll("*").remove();
    specs = MULTI.specs;
    W = el.clientWidth || 640; H = Math.round(Math.max(240, el.clientHeight || 320));
    svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("height", H).style("height", H+"px").attr("tabindex", 0).attr("role", "img")
      .attr("aria-label", `Curva de ${specs.length} análisis ordenados por r frente a la franja del azar, y mediana de r por decisión`);
    // escritorio: curva y decisiones lado a lado; pantalla angosta: decisiones debajo de la curva
    const stack = W < 560, split = Math.round(W*.57), cutY = Math.round(H*.46);
    A = stack ? {l:40, r:W-8, t:22, b:cutY-24} : {l:40, r:split-8, t:22, b:H-24};       // área de la curva
    const D = stack ? {l:0, lab:146, r:W-6, t:cutY+22, b:H-20} : {l:split+18, lab:146, r:W-6, t:20, b:H-20};  // decisiones, eje abajo
    // ---- curva ----
    cy = d3.scaleLinear().domain([-.5, .65]).range([A.b, A.t]);
    colW = (A.r-A.l)/specs.length; cx = i => A.l+(i+.5)*colW;
    const glow = addGlow(svg, "mglow", 1.8);
    const g = svg.append("g");
    g.append("g").attr("class", "gridl").attr("transform", `translate(${A.l},0)`).call(d3.axisLeft(cy).ticks(5).tickSize(-(A.r-A.l)).tickFormat(""));
    g.append("g").attr("class", "axis").attr("transform", `translate(${A.l},0)`).call(d3.axisLeft(cy).ticks(5).tickSizeOuter(0).tickFormat(fTick(L.format("+.1~f")))).call(a => a.select(".domain").remove());
    g.append("text").attr("class", "atitle").attr("x", A.l-30).attr("y", 11).text("r de cada análisis, ↑ peor");
    const nb = MULTI.nullBand;
    g.append("path").attr("class", "null-band").attr("d", d3.area().x((v, i) => cx(i)).y0((v, i) => cy(nb.lo[i])).y1((v, i) => cy(nb.hi[i])).curve(d3.curveMonotoneX)(nb.lo));
    g.append("line").attr("class", "zero").attr("x1", A.l).attr("x2", A.r).attr("y1", cy(0)).attr("y2", cy(0));
    g.append("line").attr("class", "ref-line").attr("x1", A.l).attr("x2", A.r).attr("y1", cy(CUI)).attr("y2", cy(CUI));
    g.append("text").attr("class", "alab").attr("x", A.l+6).attr("y", cy(CUI)-5).text("Cui et al. (2026): 0.55");
    g.append("text").attr("class", "alab").attr("x", A.r-4).attr("y", cy(nb.lo[Math.round(specs.length*.62)])+14).attr("text-anchor", "end").text("franja del azar (95 %)");
    g.append("text").attr("class", "alab").attr("x", A.r).attr("y", A.b+18).attr("text-anchor", "end").text(`${specs.length} análisis, de menor a mayor r →`);
    curveG = g.append("g");
    guide = g.append("line").attr("stroke", C.ink).attr("stroke-opacity", .4).attr("y1", A.t).attr("y2", A.b).style("opacity", 0).style("pointer-events", "none");
    svg.append("rect").attr("x", A.l).attr("y", A.t).attr("width", A.r-A.l).attr("height", A.b-A.t).attr("fill", "transparent").style("cursor", "pointer")
      .on("pointermove", ev => moveTo(idx(ev), ev)).on("pointerleave", () => { guide.style("opacity", 0); hideTip(); })
      .on("click", ev => toggleSpec(specs[idx(ev)]));
    // ---- decisiones: mediana e IQR de r por opción ----
    rows = []; MULTI.dims.forEach(d => d.opts.forEach((o, i) => {
      const rs = specs.filter(s => s[d.key] === o.key).map(s => s.r).sort(d3.ascending);
      rows.push({dim:d.key, dimLabel:d.label, opt:o.key, label:o.label, first:i === 0, med:d3.quantileSorted(rs, .5), q1:d3.quantileSorted(rs, .25), q3:d3.quantileSorted(rs, .75)});
    }));
    const RH = (D.b-D.t-4)/rows.length;
    const dx = d3.scaleLinear().domain([Math.min(-.15, d3.min(rows, r => r.q1)), Math.max(.15, d3.max(rows, r => r.q3))]).nice().range([D.l+D.lab, D.r-4]);
    g.append("text").attr("class", "atitle").attr("x", D.l).attr("y", D.t-9).text("Mediana de r por decisión");
    g.append("g").attr("class", "axis").attr("transform", `translate(0,${D.b})`).call(d3.axisBottom(dx).ticks(3).tickSize(3).tickFormat(fTick(L.format("+.1~f")))).call(a => a.select(".domain").remove());
    g.append("line").attr("class", "zero").attr("x1", dx(0)).attr("x2", dx(0)).attr("y1", D.t+2).attr("y2", D.b);
    rowsG = g.append("g");
    rows.forEach((r, k) => {
      r.y = D.t+2+k*RH+RH/2;
      if(r.first && k > 0) rowsG.append("line").attr("class", "sep").attr("x1", D.l).attr("x2", D.r).attr("y1", r.y-RH/2).attr("y2", r.y-RH/2);
      if(r.first) rowsG.append("text").attr("class", "mdim").attr("x", D.l).attr("y", r.y+3.5).text(r.dimLabel);
      r.hit = rowsG.append("rect").attr("class", "mhit").attr("x", D.l).attr("y", r.y-RH/2).attr("width", D.r-D.l).attr("height", RH)
        .attr("tabindex", 0).attr("role", "button").attr("aria-label", `Filtrar: ${r.dimLabel} ${r.label}, mediana ${fR(r.med)}`);
      r.lab = rowsG.append("text").attr("class", "mlabel").attr("x", D.l+D.lab-8).attr("y", r.y+3.5).attr("text-anchor", "end").text(short(r.dim, r.opt)).style("pointer-events", "none");
      r.bar = rowsG.append("line").attr("x1", dx(r.q1)).attr("x2", dx(r.q3)).attr("y1", r.y).attr("y2", r.y).attr("stroke-width", 2).attr("stroke-linecap", "round").style("pointer-events", "none");
      r.dot = rowsG.append("circle").attr("cx", dx(r.med)).attr("cy", r.y).attr("r", 3.6).style("pointer-events", "none");
      const toggle = () => { F[r.dim] === r.opt ? delete F[r.dim] : (F[r.dim] = r.opt); paint(); };
      r.hit.on("click", toggle).on("keydown", e => { if(e.key === "Enter" || e.key === " "){ e.preventDefault(); toggle(); } })
        .on("pointerenter", e => showTip(e, `<div class="h">${r.dimLabel}: ${r.label}</div>${trow("mediana r", fR(r.med))}${trow("rango intercuartil", `${fR(r.q1)} a ${fR(r.q3)}`)}`))
        .on("pointermove", e => moveTip(e)).on("pointerleave", hideTip);
    });
    svg.on("keydown", e => {
      if(e.target !== svg.node()) return;
      if(e.key === "ArrowRight" || e.key === "ArrowLeft"){ e.preventDefault(); cursor = Math.max(0, Math.min(specs.length-1, (cursor < 0 ? specs.findIndex(isOrig) : cursor)+(e.key === "ArrowRight" ? 1 : -1))); moveTo(cursor); }
      if(e.key === "Enter" && cursor >= 0){ e.preventDefault(); toggleSpec(specs[cursor]); }
    });
    built = true;
  }
  const idx = ev => Math.max(0, Math.min(specs.length-1, Math.floor((d3.pointer(ev, svg.node())[0]-A.l)/colW)));
  function moveTo(i, ev){
    cursor = i; guide.attr("x1", cx(i)).attr("x2", cx(i)).style("opacity", 1);
    const r = svg.node().getBoundingClientRect();
    showTip(ev || {clientX:r.left+cx(i)/W*r.width, clientY:r.top+cy(specs[i].r)/H*r.height}, tipFor(specs[i]));
  }
  const toggleSpec = s => setSpec(S.spec === s ? null : s);
  function paint(){
    if(!built) return;
    const any = Object.keys(F).length > 0, ch = S.spec;
    curveG.selectAll("circle.s").data(specs).join("circle").attr("class", "s").attr("cx", (s, i) => cx(i)).attr("cy", s => cy(s.r))
      .attr("r", s => any && match(s) ? 2.4 : 1.7).attr("fill", colOf).attr("fill-opacity", s => any && !match(s) ? .12 : .95).style("pointer-events", "none");
    // anillos: análisis inicial (siempre) y análisis cargado en la dispersión
    const rings = [{s:specs.find(isOrig), c:C.ink}].concat(ch ? [{s:ch, c:C.vuln}] : []);
    curveG.selectAll("circle.ring").data(rings).join("circle").attr("class", "ring").attr("cx", d => cx(specs.indexOf(d.s))).attr("cy", d => cy(d.s.r)).attr("r", 5.5)
      .attr("fill", "none").attr("stroke", d => d.c).attr("stroke-width", 1.6).style("pointer-events", "none");
    // "análisis inicial" se rotula por encima de la curva (zona vacía), con una guía corta hasta su anillo
    const oi = specs.findIndex(isOrig), oy = cy(specs[oi].r), ly = Math.max(A.t+12, oy-26);
    curveG.selectAll("line.lead").data([oi]).join("line").attr("class", "lead").attr("x1", cx(oi)).attr("x2", cx(oi)).attr("y1", oy-6).attr("y2", ly+3).attr("stroke", C.muted);
    curveG.selectAll("text.lead").data([oi]).join("text").attr("class", "ab lead").style("font-size", "10.5px").attr("x", cx(oi)).attr("y", ly).attr("text-anchor", "middle").text("análisis inicial");
    rows.forEach(r => {
      const on = F[r.dim] === r.opt, dim = any && F[r.dim] && !on;
      r.lab.classed("on", on); r.hit.classed("on", on);
      r.bar.attr("stroke", on ? C.vuln : C.rule2).attr("opacity", dim ? .4 : 1);
      r.dot.attr("fill", on ? C.vuln : C.ink).attr("opacity", dim ? .4 : 1);
    });
    if(typeof updateStatus === "function") updateStatus();
    header(any);
  }
  function header(any){
    const J = MULTI.joint, minP = Math.min(J.median.p, J.sigPos.p, J.stouffer.p);
    if(any){
      const sel = specs.filter(match), sig = sel.filter(s => s.p < .05 && s.r > 0).length;
      setTitle("t-multi", "T8", `${Object.entries(F).map(([k, v]) => short(k, v)).join(" + ")}: ${sig ? `${sig} de ${sel.length} análisis lo apoyan` : "ningún análisis lo apoya"}`, `mediana r ${fR(d3.median(sel, s => s.r))}`);
    } else {
      const V = MULTI.jointVar;
      setTitle("t-multi", "T8", minP >= .05 ? "Ningún análisis rescata el efecto" : "El efecto resiste el multiverso",
        `${specs.length} análisis, p ≥ ${L.format(".2f")(minP)}`);
    }
    d3.select("#k-multi").html(`<span class="k"><i class="dot" style="background:${POS}"></i>p &lt; 0.05, r &gt; 0</span><span class="k"><i class="dot" style="background:var(--signeg)"></i>p &lt; 0.05, r &lt; 0</span>` +
      `<span class="k"><i class="dot" style="background:var(--ink2)"></i>n.s.</span><span class="k"><i class="ln" style="background:var(--ink2)"></i>RIC</span>`);
  }
  function tipFor(s){
    return `<div class="h">r = ${fR(s.r)} <span class="m">IC [${fR(s.lo)}, ${fR(s.hi)}], n = ${s.n}, p = ${fp(s.p)}</span></div>` +
      MULTI.dims.map(d => trow(d.label, mvLabel(d.key, s[d.key]))).join("") + (isOrig(s) ? `<div class="m" style="margin-top:3px">análisis inicial de la Semana 6</div>` : "");
  }
  // carga un análisis en la dispersión: x e y vienen del multiverso; los atípicos excluidos se dibujan huecos
  function setSpec(s){
    S.spec = s || null;
    if(s){
      const xs = MULTI.x[`${s.roi}|${s.met}|${s.delta}`], ys = MULTI.y[s.marker], at = new Map(MULTI.subjects.map((id, i) => [id, i]));
      P.forEach(d => { const i = at.get(d.id); d.mvx = i == null ? null : xs[i]; d.mvy = i == null ? null : ys[i]; d.mvout = false; });
      if(s.out === "z25"){
        const ok = P.filter(d => d.mvx != null && d.mvy != null), mx = d3.mean(ok, d => d.mvx), sx = d3.deviation(ok, d => d.mvx), my = d3.mean(ok, d => d.mvy), sy = d3.deviation(ok, d => d.mvy);
        ok.forEach(d => { d.mvout = Math.abs((d.mvx-mx)/sx) > 2.5 || Math.abs((d.mvy-my)/sy) > 2.5; });
      }
    }
    $("ysel").disabled = !!s;
    scatter.clearBrushVisual(); scatter.render(); bus.call("axes"); paint();
  }
  function init(){ if(!MULTI) return; build(); paint(); }
  return {init, setSpec, isFiltered:() => Object.keys(F).length > 0, specRank:s => specs.indexOf(s)+1,
    clear(){ F = {}; if(S.spec) setSpec(null); else paint(); }, render(){ if(MULTI){ build(); paint(); } }, rebuild(){}};
})();
