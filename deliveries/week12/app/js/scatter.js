/* Vista 2 · Vulnerabilidad (tareas T3, T5 y T7).
   Arriba: dispersión del cambio theta (región y métrica del header) frente al marcador conductual elegido.
   Lazo libre = grupo; clic en un punto = la persona entra o sale de la selección (de 1 a n);
   Mayús + clic = persona A o B para comparar sus mapas. */
const scatter = (() => {
  const el = $("scatter");
  let svg, g, sx, sy, W, H, data = [], all = [], hitPts = [], delaunay = null, lassoPath, surface, ptsG, abG, plotB;
  let polygon = null, trail = [], pointerId = null, brushing = false, moved = false, beforeIds = null;
  // rótulo "vulnerable" (la leyenda no se coloca encima) y leyenda flotante (floatLegend, en core.js)
  let qLab = null;
  const leg = floatLegend();
  const m = {t:8, r:0, l:38};   // sin margen derecho: el área del gráfico llega al borde del SVG

  function build(){
    d3.select(el).selectAll("*").remove();
    // el SVG nunca es más alto que su panel: si no, el título del eje x invade el panel de abajo
    // área de datos cuadrada: el lado es el menor entre el ancho y el alto disponibles, y el SVG se centra en el panel
    const aw = el.clientWidth || 600, ah = Math.round(Math.max(170, el.clientHeight || 400)), bottom = 32;
    const side = Math.max(120, Math.min(aw-m.l-m.r, ah-m.t-bottom));
    W = side+m.l+m.r; H = side+m.t+bottom;
    plotB = H-bottom;   // debajo: marcas y título del eje x
    svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("height", H).style("height", H+"px").style("width", W+"px").style("margin", "0 auto").attr("role", "img")
      .attr("aria-label", "Scatter of the theta change against the behavioral marker; the data are listed in About");
    g = svg.append("g");
    sx = d3.scaleLinear().range([m.l, W-m.r]); sy = d3.scaleLinear().range([plotB, m.t]);
    surface = g.append("rect").attr("class", "lasso-surface").attr("x", m.l).attr("y", m.t).attr("width", W-m.l-m.r).attr("height", plotB-m.t);
    surface.on("pointerdown", ev => {
      if(ev.button !== 0 || ev.isPrimary === false || brushing) return;
      ev.preventDefault(); pointerId = ev.pointerId; brushing = true; moved = false;
      trail = [plotPoint(ev)]; beforeIds = S.selected ? [...S.selected] : null;
      surface.node().setPointerCapture(pointerId); hover(null); hideTip();
    }).on("lostpointercapture", cancelLasso);
    svg.on("pointermove", ev => {
      if(brushing){ if(ev.pointerId === pointerId){ sample(ev); if(moved){ drawLasso(trail); if(trail.length >= 3) applyLasso(trail, true); } } return; }
      if(leg.owns(ev.target)){ hover(null); hideTip(); svg.style("cursor", null); return; }
      const d = nearest(d3.pointer(ev, svg.node()));
      svg.style("cursor", d ? "pointer" : null); hover(d);
      if(d) showTip(ev, tipFor(d)); else hideTip();
    }).on("pointerup", finishLasso).on("pointercancel", cancelLasso)
      .on("pointerleave", () => { if(!brushing){ hover(null); hideTip(); svg.style("cursor", null); } })
      .on("click", ev => { if(ev.target !== surface.node() && !brushing && !leg.owns(ev.target)){ const d = nearest(d3.pointer(ev, svg.node())); if(d) pick(d, ev); } });
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
      if(hit) pick(hit, ev); else { clearBrushVisual(); setSelected(null); }
      return;
    }
    polygon = trail.length >= 3 ? trail.slice() : null;
    if(!polygon || !applyLasso(polygon, false)){ polygon = null; setSelected(null); }
    drawLasso(polygon); trail = [];
  }
  // clic: entra o sale de la selección; Mayús + clic: persona A o B (comparación de dos mapas)
  function pick(d, ev){ if(ev && ev.shiftKey){ pin(d); return; } clearBrushVisual(); togglePick(d); }
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
    quadLabel(sx(st.xmed), W-m.r, qy0, qy1, st.w > 0, st.rows.map(d => [sx(d[xk]), sy(d[yk])]));
    g.insert("line", ".lasso-surface").attr("class", "zero").attr("x1", sx(0)).attr("x2", sx(0)).attr("y1", m.t).attr("y2", plotB);
    g.insert("line", ".lasso-surface").attr("class", "zero").attr("x1", m.l).attr("x2", W-m.r).attr("y1", sy(0)).attr("y2", sy(0));
    g.insert("line", ".lasso-surface").attr("class", "median").attr("x1", sx(st.xmed)).attr("x2", sx(st.xmed)).attr("y1", m.t).attr("y2", plotB);
    g.insert("line", ".lasso-surface").attr("class", "median").attr("x1", m.l).attr("x2", W-m.r).attr("y1", sy(st.ymed)).attr("y2", sy(st.ymed));
    g.append("g").attr("class", "axis").attr("transform", `translate(0,${plotB})`).call(d3.axisBottom(sx).ticks(Math.max(4, Math.round(W/110))).tickSizeOuter(0).tickFormat(fTick(L.format("~r"))));
    g.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(sy).ticks(5).tickSize(3).tickPadding(3).tickSizeOuter(0).tickFormat(fTick(L.format("~r")))).call(a => a.select(".domain").remove());
    const yt = mkY(), plotH = plotB-m.t;
    g.append("text").attr("class", "atitle sc-at").attr("text-anchor", "middle").attr("transform", "rotate(-90)").attr("x", -(m.t+plotB)/2).attr("y", 9).text(yt.axis.length*5.9 < plotH ? yt.axis : yt.ax2);
    g.append("text").attr("class", "atitle sc-at").attr("text-anchor", "middle").attr("x", (m.l+W-m.r)/2).attr("y", H-3)
      .text(`${xName()}, Deprivation − Normal`);
    lassoPath = g.append("path").attr("class", "lasso-selection");
    ptsG = g.append("g").style("pointer-events", "none");   // puntos nítidos: el brillo solo va en las series
    abG = g.append("g").style("pointer-events", "none");
    hitPts = data.map(d => ({d, x:sx(d[xk]), y:sy(d[yk])}));
    delaunay = d3.Delaunay.from(hitPts, h => h.x, h => h.y);
    ptsG.selectAll("circle").data(data, d => d.id).join("circle").attr("cx", d => sx(d[xk])).attr("cy", d => sy(d[yk])).attr("r", 4);
    // ejes nuevos (key): la leyenda vuelve a buscar la esquina más libre
    leg.mount({svg, parent:g, area:{x0:m.l, x1:W-m.r, y0:m.t, y1:plotB}, items:legendItems(), marks:hitPts.map(h => [h.x, h.y]), avoid:qLab, key:xk+"|"+yk});
    paint();
    title(); table();
  }
  // el cuadrante vulnerable se nombra dentro de él, en la esquina con menos puntos; a igualdad, la exterior
  // (lejos de las medianas: arriba a la derecha, o abajo a la derecha cuando "peor" es bajar, como en PANAS+)
  function quadLabel(x0, x1, y0, y1, top, pts){
    const lab = g.insert("text", ".lasso-surface").attr("class", "qlab").attr("x", 0).attr("y", 0).text("vulnerable");
    let bb = lab.node().getBBox(), pad = 5;
    // cuadrante angosto (pantallas chicas): la letra se achica hasta caber, nunca a menos de 8 px
    if(x1-x0 < bb.width+2*pad || y1-y0 < bb.height+2*pad){
      pad = 3; const k = Math.min((x1-x0-2*pad)/bb.width, (y1-y0-2*pad)/bb.height);
      lab.style("font-size", Math.max(8, 10.5*Math.min(1, k))+"px"); bb = lab.node().getBBox();
    }
    const w = bb.width, h = bb.height, outer = top ? y0+pad : y1-pad-h, inner = top ? y1-pad-h : y0+pad;
    const cs = [[x1-pad-w, outer], [x0+pad, outer], [x1-pad-w, inner], [x0+pad, inner]];
    const hits = ([x, y]) => pts.filter(([px, py]) => px > x-5 && px < x+w+5 && py > y-5 && py < y+h+5).length;
    // si ni así cabe, va en la esquina exterior, sin salirse del área del gráfico
    const fits = x1-x0 >= w+2*pad && y1-y0 >= h+2*pad;
    let [x, y] = fits ? cs.reduce((a, c) => hits(c) < hits(a) ? c : a) : cs[0];
    x = Math.max(m.l+pad, Math.min(W-m.r-pad-w, x)); y = Math.max(m.t+pad, Math.min(plotB-pad-h, y));
    lab.attr("x", x).attr("y", y-bb.y);
    qLab = {x0:x, y0:y, x1:x+w, y1:y+h};
  }
  // leyenda dentro del área del gráfico: los grupos de la comparación (con su color) y la selección (anillo).
  // Sin comparación ni selección no hay nada que explicar y no se dibuja
  const legendItems = () => { const G = cmpGroups();
    return (G ? G.map(g => ({mark:"dot", c:g.color, t:g.name})) : []).concat(S.selected ? [{mark:"ring", c:C.ink, t:"your selection"}] : []); };
  function paint(){
    if(!ptsG) return;
    const ss = S.selected ? new Set(S.selected) : null, hv = S.hovered, xk = S.xKey(), yk = yK(), G = cmpGroups();
    // color: grupos de la comparación > cuadrante vulnerable (ámbar) > resto. La selección no cambia el color:
    // se marca con un anillo, para que cada persona conserve lo que su color dice de ella
    const col = d => G ? (G[0].set.has(d.id) ? C.g1 : (G[1].set.has(d.id) ? C.g2 : C.faint)) : (S.vuln.has(d.id) ? C.vuln : C.rest);
    ptsG.selectAll("circle").attr("fill", col).attr("stroke", C.panel).attr("stroke-width", 1)
      .attr("opacity", .95).attr("r", d => hv && hv.id === d.id ? 5.5 : 4);   // los no elegidos siguen visibles para poder sumarlos
    ptsG.selectAll("circle").filter(d => ss && ss.has(d.id)).raise();
    // anillo sobre cada persona elegida (con su código hasta 6, para saber quién es quién) y letra para A y B
    const at = id => hitPts.find(o => o.d.id === id), lab = ss && ss.size <= 6;
    const marks = (S.selected || []).map(id => { const h = at(id), p = S.pair.findIndex(d => d.id === id);
      return h ? {id, L:p >= 0 ? "AB"[p] : (lab ? id.replace("sub-", "S") : ""), x:h.x, y:h.y} : null; })
      .concat(S.pair.filter(d => !(ss && ss.has(d.id))).map(d => { const h = at(d.id), i = S.pair.indexOf(d); return h ? {id:d.id, L:"AB"[i], x:h.x, y:h.y} : null; }))
      .filter(Boolean);
    abG.selectAll("circle").data(marks, d => d.id).join("circle").attr("cx", d => d.x).attr("cy", d => d.y).attr("r", 6.5).attr("fill", "none").attr("stroke", C.ink).attr("stroke-width", 1.6);
    abG.selectAll("text").data(marks, d => d.id).join("text").attr("class", "ab").attr("x", d => d.x+(d.x > W-40 ? -10 : 10)).attr("y", d => d.y+4)
      .attr("text-anchor", d => d.x > W-40 ? "end" : "start").text(d => d.L);
  }
  // la vista no muestra título ni leyenda sobre el gráfico: la lectura va en el ícono ⓘ de la cabecera y la leyenda
  // en el recuadro. El título (oculto) guarda ρ, IC 95% y n para la figura del reporte
  function title(){
    const head = "Δθ vs. Δ behavior", G = cmpGroups(), xk = S.xKey(), yk = yK();
    const info = notes("One point per person: Δθ (deprivation − normal) vs. Δ of the behavioral marker. Shaded: vulnerable quadrant (both above the median).",
      "Legend box: comparison groups and your selection (drag to move, click to minimize). Click: select a person; drag: lasso.");
    const rho = rows => { const r = spearman(rows, xk, yk); return isNaN(r.rho) ? `n = ${r.n}` : `Spearman ρ = ${f2(r.rho)} [${f2(r.lo)}, ${f2(r.hi)}], n = ${r.n}`; };
    const sub = G ? G.map(g => `${g.name}: ${rho(EEG.filter(d => g.set.has(d.id)))}`).join("; ")
      : rho(S.selected ? EEG.filter(d => S.selected.includes(d.id)) : EEG);
    setTitle("t-sc", G ? `${head}: two groups` : (S.selected ? `${head}: your selection` : head), nb(sub), info);
  }
  function tipFor(d){
    const xk = S.xKey(), yk = yK(), L2 = pairLetter(d);
    return `<div class="h">${d.id}${L2 ? ` (${L2})` : ""} <span class="m">${d.gender === "F" ? "woman" : "man"}${d.age != null ? ", "+d.age+" y" : ""}</span></div>` +
      trow(xName(), fsr(d[xk])) + trow(mkY().ax2, d[yk] != null ? fsr(d[yk]) : "no data") + (d.psqi != null ? trow("PSQI", d.psqi) : "") + qualRows(d.id);
  }
  const rowClass = (d, ss) => [ss && ss.has(d.id) ? "sel" : "", ss && !ss.has(d.id) ? "dim" : "", pairLetter(d) ? "pin" : ""].join(" ");
  function table(){
    const xk = S.xKey(), yk = yK(), ss = S.selected ? new Set(S.selected) : null, tb = d3.select("#dtable");
    tb.html(`<thead><tr><th>Participant</th><th>Sex</th><th>Age</th><th>PSQI</th><th>${xName()}</th><th>${mkY().ax2}</th><th>Profile</th></tr></thead><tbody></tbody>`);
    tb.select("tbody").selectAll("tr").data(all.slice().sort((a, b) => b[xk]-a[xk]), d => d.id).join("tr")
      .attr("tabindex", 0).attr("class", d => rowClass(d, ss))
      .on("click", (e, d) => pin(d)).on("keydown", (e, d) => { if(e.key === "Enter" || e.key === " "){ e.preventDefault(); pin(d); } })
      .html(d => `<td>${d.id}${pairLetter(d) ? ` (${pairLetter(d)})` : ""}</td><td>${d.gender === "F" ? "woman" : "man"}</td><td>${d.age ?? "n/a"}</td><td>${d.psqi ?? "n/a"}</td><td>${fsr(d[xk])}</td><td>${d[yk] != null ? fsr(d[yk]) : "no data"}</td><td>${S.vuln.has(d.id) ? "vulnerable" : ""}</td>`);
  }
  bus.on("hover.sc", () => paint());
  bus.on("pin.sc", () => { paint(); table(); });
  bus.on("select.sc", () => { paint(); title(); leg.update(legendItems()); table(); });
  return {render, paint, clearBrushVisual, stats, withFullBox:fn => leg.withFull(fn), rebuild(){ clearBrushVisual(); }};
})();
