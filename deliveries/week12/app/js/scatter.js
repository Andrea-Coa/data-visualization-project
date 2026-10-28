/* Vista 2 · Vulnerabilidad (tareas T3, T5 y T7).
   Arriba: dispersión del cambio theta (región y métrica del header) frente al marcador conductual elegido.
   Abajo: franja con las 68 personas sobre el mismo eje x, con el conteo de quienes suben y bajan (hallazgo 1),
   incluidas las que no tienen el marcador. Lazo libre = grupo; clic en un punto = persona A, segundo clic = B.
   Con un análisis del multiverso cargado (S.spec), los ejes vienen de ese análisis. */
const scatter = (() => {
  const el = $("scatter");
  let svg, g, sx, sy, W, H, data = [], all = [], hitPts = [], delaunay = null, lassoPath, surface, ptsG, stripG, abG, plotB, stripY;
  let polygon = null, trail = [], pointerId = null, brushing = false, moved = false, beforeIds = null;
  const m = {t:8, r:16, l:56}, STRIP = 50;

  function build(){
    d3.select(el).selectAll("*").remove();
    W = el.clientWidth || 600; H = Math.round(Math.max(260, el.clientHeight || 400));
    plotB = H-34-STRIP-26; stripY = plotB+42;   // 42 px: las marcas del eje x y el conteo nunca se tocan
    svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("height", H).style("height", H+"px").attr("role", "img")
      .attr("aria-label", "Dispersión del cambio theta frente al marcador conductual y franja con las 68 personas; los datos están en Acerca de");
    const glow = addGlow(svg, "sglow", 1.6);
    g = svg.append("g");
    sx = d3.scaleLinear().range([m.l, W-m.r]); sy = d3.scaleLinear().range([plotB, m.t]);
    g.attr("data-glow", glow);
    surface = g.append("rect").attr("class", "lasso-surface").attr("x", m.l).attr("y", m.t).attr("width", W-m.l-m.r).attr("height", plotB-m.t);
    surface.on("pointerdown", ev => {
      if(ev.button !== 0 || ev.isPrimary === false || brushing) return;
      ev.preventDefault(); pointerId = ev.pointerId; brushing = true; moved = false;
      trail = [plotPoint(ev)]; beforeIds = S.selected ? [...S.selected] : null;
      surface.node().setPointerCapture(pointerId); hover(null); hideTip();
    }).on("lostpointercapture", cancelLasso);
    svg.on("pointermove", ev => {
      if(brushing){ if(ev.pointerId === pointerId){ sample(ev); if(moved){ drawLasso(trail); if(trail.length >= 3) applyLasso(trail, true); } } return; }
      const d = nearest(d3.pointer(ev, svg.node()));
      svg.style("cursor", d ? "pointer" : null); hover(d);
      if(d) showTip(ev, tipFor(d)); else hideTip();
    }).on("pointerup", finishLasso).on("pointercancel", cancelLasso)
      .on("pointerleave", () => { if(!brushing){ hover(null); hideTip(); svg.style("cursor", null); } })
      .on("click", ev => { if(ev.target !== surface.node() && !brushing){ const d = nearest(d3.pointer(ev, svg.node())); if(d) pin(d); } });
    polygon = null;
  }
  const plotPoint = ev => { const [x, y] = d3.pointer(ev, svg.node()); return [Math.max(m.l, Math.min(W-m.r, x)), Math.max(m.t, Math.min(plotB, y))]; };
  function sample(ev){
    const p = plotPoint(ev), first = trail[0], last = trail[trail.length-1];
    if(Math.hypot(p[0]-first[0], p[1]-first[1]) >= 4) moved = true;
    if(Math.hypot(p[0]-last[0], p[1]-last[1]) >= 2) trail.push(p);
  }
  const drawLasso = pts => lassoPath.attr("d", pts && pts.length > 1 ? d3.line()(pts)+"Z" : null);
  function releasePointer(){ const id = pointerId; pointerId = null; brushing = false; if(id != null && surface.node().hasPointerCapture(id)) surface.node().releasePointerCapture(id); }
  function finishLasso(ev){
    if(!brushing || ev.pointerId !== pointerId) return;
    sample(ev); releasePointer();
    if(!moved){
      const hit = nearest(plotPoint(ev));
      if(hit) pin(hit); else { clearBrushVisual(); setSelected(null); }
      return;
    }
    polygon = trail.length >= 3 ? trail.slice() : null;
    if(!polygon || !applyLasso(polygon, false)){ polygon = null; setSelected(null); }
    drawLasso(polygon); trail = [];
  }
  function cancelLasso(ev){ if(!brushing || ev.pointerId !== pointerId) return; releasePointer(); trail = []; drawLasso(polygon); setSelected(beforeIds); }
  function applyLasso(points, live){
    const xk = S.xKey(), yk = yK();
    const ids = data.filter(d => d3.polygonContains(points, [sx(d[xk]), sy(d[yk])])).map(d => d.id);
    setSelected(ids, {live}); return ids.length;
  }
  function nearest(p){
    if(!delaunay) return null; const i = delaunay.find(p[0], p[1]); if(i < 0) return null; const h = hitPts[i];
    return Math.hypot(h.x-p[0], h.y-p[1]) <= 12 ? h.d : null;
  }
  function clearBrushVisual(){ if(!lassoPath) return; releasePointer(); polygon = null; trail = []; drawLasso(null); hideTip(); }
  // cuadrante vulnerable: sobre la mediana del cambio theta y peor que la mediana del marcador (PANAS+ invierte)
  function stats(){
    const xk = S.xKey(), yk = yK(), rows = P.filter(d => d[xk] != null && d[yk] != null);
    const xmed = d3.median(rows, d => d[xk]), ymed = d3.median(rows, d => d[yk]), w = mkY().worse;
    return {rows, xmed, ymed, w, vuln:new Set(rows.filter(d => d[xk] > xmed && w*(d[yk]-ymed) > 0).map(d => d.id))};
  }
  function render(){
    build();
    const xk = S.xKey(), yk = yK(), st = stats(); data = st.rows; S.vuln = st.vuln;
    all = P.filter(d => d[xk] != null);
    const xe = d3.extent(all, d => d[xk]), ye = d3.extent(data, d => d[yk]);
    const xp = (xe[1]-xe[0])*.06 || .01, yp = (ye[1]-ye[0])*.08 || 1;
    sx.domain([Math.min(xe[0]-xp, 0), Math.max(xe[1]+xp, 0)]).nice(); sy.domain([Math.min(ye[0]-yp, 0), Math.max(ye[1]+yp, 0)]).nice();
    g.insert("g", ":first-child").attr("class", "gridl").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(sy).ticks(5).tickSize(-(W-m.l-m.r)).tickFormat(""));
    const qy0 = st.w > 0 ? m.t : sy(st.ymed), qy1 = st.w > 0 ? sy(st.ymed) : plotB;
    g.insert("rect", ".lasso-surface").attr("class", "quad").attr("x", sx(st.xmed)).attr("width", W-m.r-sx(st.xmed)).attr("y", qy0).attr("height", Math.max(0, qy1-qy0));
    g.insert("line", ".lasso-surface").attr("class", "zero").attr("x1", sx(0)).attr("x2", sx(0)).attr("y1", m.t).attr("y2", stripY+STRIP/2+14);
    g.insert("line", ".lasso-surface").attr("class", "zero").attr("x1", m.l).attr("x2", W-m.r).attr("y1", sy(0)).attr("y2", sy(0));
    g.insert("line", ".lasso-surface").attr("class", "median").attr("x1", sx(st.xmed)).attr("x2", sx(st.xmed)).attr("y1", m.t).attr("y2", plotB);
    g.insert("line", ".lasso-surface").attr("class", "median").attr("x1", m.l).attr("x2", W-m.r).attr("y1", sy(st.ymed)).attr("y2", sy(st.ymed));
    g.append("text").attr("class", "alab").attr("x", m.l+4).attr("y", sy(st.ymed)-4).text("mediana").style("pointer-events", "none");
    g.append("g").attr("class", "axis").attr("transform", `translate(0,${plotB})`).call(d3.axisBottom(sx).ticks(Math.max(4, Math.round(W/110))).tickSizeOuter(0).tickFormat(fTick(L.format("~r"))));
    g.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(sy).ticks(5).tickSizeOuter(0).tickFormat(fTick(L.format("~r")))).call(a => a.select(".domain").remove());
    const yt = mkY(), plotH = plotB-m.t;
    g.append("text").attr("class", "atitle").attr("text-anchor", "middle").attr("transform", "rotate(-90)").attr("x", -(m.t+plotB)/2).attr("y", 14).text(yt.axis.length*6.2 < plotH ? yt.axis : yt.ax2);
    g.append("text").attr("class", "atitle").attr("text-anchor", "middle").attr("x", (m.l+W-m.r)/2).attr("y", H-4)
      .text(`${xName()}${S.spec ? ` (${mvLabel("delta", S.spec.delta)})` : ""}, SD − NS`);
    lassoPath = g.append("path").attr("class", "lasso-selection");
    ptsG = g.append("g").style("pointer-events", "none");   // puntos nítidos: el brillo solo va en las series
    // franja de las 68 personas: enjambre sobre el mismo eje x
    stripG = g.append("g").style("pointer-events", "none");
    const sim = all.map(d => ({d, x:sx(d[xk]), y:stripY+STRIP/2, tx:sx(d[xk])}));
    const fs = d3.forceSimulation(sim).force("x", d3.forceX(o => o.tx).strength(1)).force("y", d3.forceY(stripY+STRIP/2).strength(.12)).force("c", d3.forceCollide(3.6)).stop();
    for(let i = 0; i < 200; i++) fs.tick();
    sim.forEach(o => { o.y = Math.max(stripY+4, Math.min(stripY+STRIP-4, o.y)); });
    const up = all.filter(d => d[xk] > 0).length, dn = all.filter(d => d[xk] < 0).length;
    const wUp = S.met === "var" && !S.spec ? "más inestables" : "suben", wDn = S.met === "var" && !S.spec ? "más estables" : "bajan";
    g.append("text").attr("class", "ann").attr("x", sx(0)-8).attr("y", stripY-4).attr("text-anchor", "end").text(`← ${dn} ${wDn}`);
    g.append("text").attr("class", "ann").attr("x", sx(0)+8).attr("y", stripY-4).text(`${up} ${wUp} →`);
    abG = g.append("g").style("pointer-events", "none");
    hitPts = data.map(d => ({d, x:sx(d[xk]), y:sy(d[yk])})).concat(sim.map(o => ({d:o.d, x:o.x, y:o.y, strip:true})));
    delaunay = d3.Delaunay.from(hitPts, h => h.x, h => h.y);
    ptsG.selectAll("circle").data(data, d => d.id).join("circle").attr("cx", d => sx(d[xk])).attr("cy", d => sy(d[yk])).attr("r", 5.5);
    stripG.selectAll("circle").data(sim, o => o.d.id).join("circle").attr("cx", o => o.x).attr("cy", o => o.y).attr("r", 3);
    paint();
    title(); key(); table();
  }
  function paint(){
    if(!ptsG) return;
    const ss = S.selected ? new Set(S.selected) : null, hv = S.hovered, xk = S.xKey(), yk = yK(), G = cmpGroups();
    // color: grupos de la comparación > selección con lazo (cian) > cuadrante vulnerable (ámbar) > resto
    const col = d => G ? (G[0].set.has(d.id) ? C.g1 : (G[1].set.has(d.id) ? C.g2 : C.faint)) : (ss && ss.has(d.id) ? C.ns : (S.vuln.has(d.id) ? C.vuln : C.rest));
    ptsG.selectAll("circle").attr("fill", d => S.spec && d.mvout ? "none" : col(d)).attr("stroke", d => S.spec && d.mvout ? C.ink2 : C.panel).attr("stroke-width", 1)
      .attr("opacity", d => ss && !ss.has(d.id) ? .22 : .95).attr("r", d => hv && hv.id === d.id ? 7.5 : 5.5);
    ptsG.selectAll("circle").filter(d => ss && ss.has(d.id)).raise();
    stripG.selectAll("circle").attr("fill", o => col(o.d))
      .attr("opacity", o => ss && !ss.has(o.d.id) ? .25 : .85).attr("r", o => hv && hv.id === o.d.id ? 5 : 3);
    // A y B: anillo y letra sobre su punto (en la dispersión si tiene marcador, si no en la franja)
    const marks = S.pair.map((d, i) => {
      const inPlot = data.find(o => o.id === d.id), h = hitPts.find(o => o.d.id === d.id && (inPlot ? !o.strip : o.strip));
      return h ? {id:d.id, L:"AB"[i], x:h.x, y:h.y} : null;
    }).filter(Boolean);
    abG.selectAll("circle").data(marks, d => d.id).join("circle").attr("cx", d => d.x).attr("cy", d => d.y).attr("r", 8.5).attr("fill", "none").attr("stroke", C.ink).attr("stroke-width", 2);
    abG.selectAll("text").data(marks, d => d.id).join("text").attr("class", "ab").attr("x", d => d.x+(d.x > W-40 ? -12 : 12)).attr("y", d => d.y+4)
      .attr("text-anchor", d => d.x > W-40 ? "end" : "start").text(d => d.L);
  }
  // titular breve: "Más inestable ≠ más lento" si el IC incluye el cero; las cifras van en tono apagado
  function title(){
    const xk = S.xKey(), yk = yK(), adj = S.spec ? "deteriorado" : ADJ[S.y], subj = (S.met === "var" && !S.spec) ? "inestable" : "theta";
    const head = r => isNaN(r.rho) ? "Pocos datos para concluir" : (r.lo <= 0 && r.hi >= 0 ? `Más ${subj} ≠ más ${adj}` : (r.rho > 0 ? `Más ${subj}, más ${adj}` : `Más ${subj}, menos ${adj}`));
    if(S.spec){
      const s = S.spec, r = {rho:s.r, lo:s.lo, hi:s.hi};
      setTitle("t-sc", "T8", head(r), nb(`${mvLabel("corr", s.corr)} r = ${f2(s.r)} [${f2(s.lo)}, ${f2(s.hi)}], n = ${s.n}`));
      return;
    }
    const G = cmpGroups();
    if(G){
      const rs = G.map(g => spearman(EEG.filter(d => g.set.has(d.id)), xk, yk));
      const none = rs.every(r => isNaN(r.rho) || (r.lo <= 0 && r.hi >= 0));
      setTitle("t-sc", "T5 · T7", none ? `${head({rho:0, lo:-1, hi:1})} en ningún grupo` : "Los grupos se separan", "");   // el ρ de cada grupo va en su leyenda
      return;
    }
    const rows = S.selected ? EEG.filter(d => S.selected.includes(d.id)) : EEG, r = spearman(rows, xk, yk), h = head(r);
    setTitle("t-sc", "T3 · T5", S.selected ? `Tu selección: ${h.charAt(0).toLowerCase()+h.slice(1)}` : h,
      nb(isNaN(r.rho) ? `n = ${r.n}` : `ρ = ${f2(r.rho)} [${f2(r.lo)}, ${f2(r.hi)}], n = ${r.n}`));
  }
  function key(){
    const G = cmpGroups();
    const rg = G ? G.map(g => spearman(EEG.filter(d => g.set.has(d.id)), S.xKey(), yK())) : [];
    d3.select("#k-sc").html(G ? G.map((g, i) => `<span class="k"><i class="dot" style="background:${g.color}"></i>${g.name} ${nb(`ρ = ${isNaN(rg[i].rho) ? "n/d" : f2(rg[i].rho)}, n = ${rg[i].n}`)}</span>`).join("")
      : `<span class="k"><i class="dot" style="background:var(--vuln)"></i>cuadrante vulnerable</span>` + (S.selected ? `<span class="k"><i class="dot" style="background:var(--ns)"></i>tu selección</span>` : ""));
  }
  function tipFor(d){
    const xk = S.xKey(), yk = yK(), L2 = pairLetter(d);
    return `<div class="h">${d.id}${L2 ? ` (${L2})` : ""} <span class="m">${d.gender === "F" ? "mujer" : "hombre"}${d.age != null ? ", "+d.age+" años" : ""}</span></div>` +
      trow(xName(), fsr(d[xk])) + trow(mkY().ax2, d[yk] != null ? fsr(d[yk]) : "sin dato") + (d.psqi != null ? trow("PSQI", d.psqi) : "");
  }
  const rowClass = (d, ss) => [ss && ss.has(d.id) ? "sel" : "", ss && !ss.has(d.id) ? "dim" : "", pairLetter(d) ? "pin" : ""].join(" ");
  function table(){
    const xk = S.xKey(), yk = yK(), ss = S.selected ? new Set(S.selected) : null, tb = d3.select("#dtable");
    tb.html(`<thead><tr><th>Participante</th><th>Sexo</th><th>Edad</th><th>PSQI</th><th>${xName()}</th><th>${mkY().ax2}</th><th>Perfil</th></tr></thead><tbody></tbody>`);
    tb.select("tbody").selectAll("tr").data(all.slice().sort((a, b) => b[xk]-a[xk]), d => d.id).join("tr")
      .attr("tabindex", 0).attr("class", d => rowClass(d, ss))
      .on("click", (e, d) => pin(d)).on("keydown", (e, d) => { if(e.key === "Enter" || e.key === " "){ e.preventDefault(); pin(d); } })
      .html(d => `<td>${d.id}${pairLetter(d) ? ` (${pairLetter(d)})` : ""}</td><td>${d.gender === "F" ? "mujer" : "hombre"}</td><td>${d.age ?? "n/d"}</td><td>${d.psqi ?? "n/d"}</td><td>${fsr(d[xk])}</td><td>${d[yk] != null ? fsr(d[yk]) : "sin dato"}</td><td>${S.vuln.has(d.id) ? "vulnerable" : ""}</td>`);
  }
  bus.on("hover.sc", () => paint());
  bus.on("pin.sc", () => { paint(); key(); table(); });
  bus.on("select.sc", () => { paint(); key(); if(!S.spec) title(); table(); });
  return {render, paint, clearBrushVisual, stats, rebuild(){ clearBrushVisual(); }};
})();
