/* Vista 2 · Vulnerabilidad (tareas T3, T5 y T7).
   Arriba: dispersión del cambio theta (región y métrica del header) frente al marcador conductual elegido.
   Lazo libre = grupo; clic en un punto = la persona entra o sale de la selección (de 1 a n);
   Mayús + clic = persona A o B para comparar sus mapas. */
const scatter = (() => {
  const el = $("scatter");
  let svg, g, sx, sy, W, H, data = [], all = [], hitPts = [], delaunay = null, lassoPath, surface, ptsG, abG, plotB;
  let polygon = null, trail = [], pointerId = null, brushing = false, moved = false, beforeIds = null;
  // recuadro de ρ: posición elegida por quien lo arrastra (fracción del espacio libre), válida mientras no cambien los ejes
  // un clic (sin arrastre) lo comprime en un ícono "ρ" y otro clic lo devuelve; el estado se conserva entre dibujos
  let boxG, boxGeo = null, boxPos = null, boxAxes = null, boxDrag = null, qBottom = false, boxMin = false;
  const m = {t:16, r:0, l:38};   // sin margen derecho: el área del gráfico llega al borde del SVG   // arriba: espacio para el rótulo "vulnerable" sobre su cuadrante

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
      if(boxG && boxG.node().contains(ev.target)){ hover(null); hideTip(); svg.style("cursor", null); return; }
      const d = nearest(d3.pointer(ev, svg.node()));
      svg.style("cursor", d ? "pointer" : null); hover(d);
      if(d) showTip(ev, tipFor(d)); else hideTip();
    }).on("pointerup", finishLasso).on("pointercancel", cancelLasso)
      .on("pointerleave", () => { if(!brushing){ hover(null); hideTip(); svg.style("cursor", null); } })
      .on("click", ev => { if(ev.target !== surface.node() && !brushing && !(boxG && boxG.node().contains(ev.target))){ const d = nearest(d3.pointer(ev, svg.node())); if(d) pick(d, ev); } });
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
    const qy0 = st.w > 0 ? m.t : sy(st.ymed), qy1 = st.w > 0 ? sy(st.ymed) : plotB; qBottom = st.w < 0;
    g.insert("rect", ".lasso-surface").attr("class", "quad").attr("x", sx(st.xmed)).attr("width", W-m.r-sx(st.xmed)).attr("y", qy0).attr("height", Math.max(0, qy1-qy0));
    // el cuadrante se nombra en el gráfico (no en la leyenda): encima si está arriba, dentro de su borde inferior si está abajo
    g.insert("text", ".lasso-surface").attr("class", "qlab").attr("x", W-m.r).attr("y", st.w > 0 ? m.t-5 : plotB-5).attr("text-anchor", "end").text("vulnerable");
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
    boxG = g.append("g").attr("class", "sbox").attr("tabindex", 0).attr("role", "button");
    if(boxAxes !== xk+"|"+yk){ boxAxes = xk+"|"+yk; boxPos = null; }   // ejes nuevos: vuelve a buscar la esquina más libre
    boxDrag = null; dragBox();
    paint();
    title(); key(); statBox(); table();
  }
  // recuadro de lectura dentro del área del gráfico: etiquetas a la izquierda, valores alineados a la derecha
  // (una columna por grupo al comparar, con el color del grupo junto a su ρ; los nombres ya están en la leyenda)
  function statBox(){
    if(!boxG) return;
    const xk = S.xKey(), yk = yK(), G = cmpGroups(), pad = 8, lh = 15, gapL = 16, gapC = 22, dot = 11;
    const rs = G ? G.map(g => spearman(EEG.filter(d => g.set.has(d.id)), xk, yk))
      : [spearman(S.selected ? EEG.filter(d => S.selected.includes(d.id)) : EEG, xk, yk)];
    const na = r => isNaN(r.rho);
    const rows = [
      {lab:"Spearman ρ", cls:"v strong", vals:rs.map(r => na(r) ? "n/a" : f2(r.rho))},
      {lab:"95% CI", cls:"v", vals:rs.map(r => na(r) ? "n/a" : `${f2(r.lo)} to ${f2(r.hi)}`)},
      {lab:"n", cls:"v", vals:rs.map(r => String(r.n))},
    ];
    boxG.selectAll("*").remove();
    boxG.classed("min", boxMin).attr("aria-expanded", !boxMin)
      .attr("aria-label", boxMin ? "Correlation (minimized): press Enter to show it" : "Correlation: press Enter to minimize it; arrow keys move it");
    boxG.append("title").text(boxMin ? "Show the correlation" : "Click to minimize · drag to move");
    const bg = boxG.append("rect").attr("class", "sbox-bg").attr("rx", 5), tg = boxG.append("g");
    if(boxMin){
      // ícono de expandir: flecha hacia la esquina superior derecha
      const s = 22;
      tg.append("path").attr("class", "sbox-ico").attr("d", "M-3.5,3.5L3.5,-3.5M-1,-3.5H3.5V1");
      bg.attr("x", -s/2).attr("y", -s/2).attr("width", s).attr("height", s);
      return fitBox(s, s, -s/2, -s/2);
    }
    const labs = rows.map((r, i) => tg.append("text").attr("class", "m").attr("y", i*lh).text(r.lab));
    const vals = rows.map((r, i) => r.vals.map(v => tg.append("text").attr("class", r.cls).attr("y", i*lh).attr("text-anchor", "end").text(v)));
    const len = s => s.node().getComputedTextLength();
    const wl = d3.max(labs, len), wc = rs.map((_, c) => d3.max(vals, (r, i) => len(r[c])+(G && !i ? dot : 0)));
    let x = wl+gapL;
    wc.forEach((w, c) => {
      x += (c ? gapC : 0)+w;
      vals.forEach(r => r[c].attr("x", x));
      if(G) tg.append("circle").attr("cx", x-len(vals[0][c])-dot+4).attr("cy", -3.8).attr("r", 3.5).attr("fill", G[c].color);
    });
    const bb = tg.node().getBBox(), bw = bb.width+2*pad, bh = bb.height+2*pad-3;
    bg.attr("x", bb.x-pad).attr("y", bb.y-pad+1).attr("width", bw).attr("height", bh);
    fitBox(bw, bh, bb.x-pad, bb.y-pad+1);
  }
  // espacio libre para el recuadro (o el ícono) dentro del área del gráfico, y su posición en él
  function fitBox(bw, bh, ox, oy){
    const x0 = m.l+6, x1 = Math.max(x0, W-m.r-bw-6), y0 = m.t+6, y1 = Math.max(y0, plotB-bh-6);
    boxGeo = {x0, x1, y0, y1, ox, oy, bw, bh};
    placeBox(boxPos || freeCorner());
  }
  // se comprime y se expande desde la misma esquina superior izquierda (sin salirse del área del gráfico)
  function toggleBox(){
    const q = at(boxPos || freeCorner()), f = (v, a, b) => b > a ? Math.max(0, Math.min(1, (v-a)/(b-a))) : 0;
    boxMin = !boxMin; boxPos = {fx:0, fy:0}; statBox();
    boxPos = {fx:f(q.x, boxGeo.x0, boxGeo.x1), fy:f(q.y, boxGeo.y0, boxGeo.y1)}; placeBox(boxPos); hideTip();
  }
  // el reporte siempre lleva las cifras: si el recuadro está comprimido, se expande solo mientras se copia el SVG
  function withFullBox(fn){
    if(!boxMin || !boxG) return fn();
    boxMin = false; statBox();
    try { return fn(); } finally { boxMin = true; statBox(); }
  }
  const at = p => ({x:boxGeo.x0+p.fx*(boxGeo.x1-boxGeo.x0), y:boxGeo.y0+p.fy*(boxGeo.y1-boxGeo.y0)});
  const placeBox = p => { const q = at(p); boxG.attr("transform", `translate(${q.x-boxGeo.ox},${q.y-boxGeo.oy})`); };
  // sin posición elegida: la esquina que tapa menos puntos (abajo a la derecha no, si ahí va el rótulo "vulnerable")
  function freeCorner(){
    const cs = [{fx:0, fy:0}, {fx:0, fy:1}, {fx:1, fy:1}, {fx:1, fy:0}].filter(c => !(qBottom && c.fx === 1 && c.fy === 1));
    const hits = c => { const q = at(c); return hitPts.filter(h => h.x > q.x-6 && h.x < q.x+boxGeo.bw+6 && h.y > q.y-6 && h.y < q.y+boxGeo.bh+6).length; };
    return cs.reduce((a, c) => hits(c) < hits(a) ? c : a);
  }
  function dragBox(){
    const clamp = v => Math.max(0, Math.min(1, v)), span = k => (boxGeo[k+"1"]-boxGeo[k+"0"]) || 1;
    const move = (dx, dy, from) => { boxPos = {fx:clamp(from.fx+dx/span("x")), fy:clamp(from.fy+dy/span("y"))}; placeBox(boxPos); };
    boxG.on("pointerdown", ev => {
      if(ev.button !== 0 || !boxGeo) return;
      ev.preventDefault(); ev.stopPropagation(); hover(null); hideTip();
      const [px, py] = d3.pointer(ev, svg.node());
      boxDrag = {id:ev.pointerId, px, py, from:boxPos || freeCorner(), moved:false};
      boxG.node().setPointerCapture(ev.pointerId);
    }).on("pointermove", ev => {
      if(!boxDrag || ev.pointerId !== boxDrag.id) return;
      ev.stopPropagation(); const [px, py] = d3.pointer(ev, svg.node()), dx = px-boxDrag.px, dy = py-boxDrag.py;
      if(!boxDrag.moved && Math.hypot(dx, dy) < 3) return;   // por debajo de 3 px cuenta como clic, no como arrastre
      boxDrag.moved = true; boxG.classed("drag", true);
      move(dx, dy, boxDrag.from);
    }).on("pointerup", ev => {
      if(!boxDrag || ev.pointerId !== boxDrag.id) return;
      ev.stopPropagation(); const click = !boxDrag.moved; boxDrag = null; boxG.classed("drag", false);
      if(click) toggleBox();
    }).on("pointercancel", ev => {
      if(boxDrag && ev.pointerId === boxDrag.id){ boxDrag = null; boxG.classed("drag", false); }
    }).on("keydown", ev => {
      if(ev.key === "Enter" || ev.key === " "){ ev.preventDefault(); toggleBox(); return; }
      const d = {ArrowLeft:[-10, 0], ArrowRight:[10, 0], ArrowUp:[0, -10], ArrowDown:[0, 10]}[ev.key];
      if(!d || !boxGeo) return; ev.preventDefault(); move(d[0], d[1], boxPos || freeCorner());
    });
  }
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
  // título: qué se cruza; ρ, IC y n van en el recuadro dentro del gráfico y la lectura en el ícono ⓘ
  function title(){
    const head = "Δθ vs. Δ behavior";
    const info = notes("One point per person: Δθ (deprivation − normal) vs. Δ of the behavioral marker. Shaded: vulnerable quadrant (both above the median).",
      "Box: Spearman ρ, 95% CI and n (drag to move, click to minimize). Click: select a person; drag: lasso.");
    // el título no cambia con la selección (los anillos y la leyenda ya la muestran): así la caja no cambia de alto
    setTitle("t-sc", cmpGroups() ? `${head}: two groups` : head, "", info);
  }
  function key(){
    const G = cmpGroups();
    d3.select("#k-sc").html((G ? G.map(g => `<span class="k"><i class="dot" style="background:${g.color}"></i>${g.name}</span>`).join("") : "")
      + (S.selected ? `<span class="k"><i class="ring"></i>your selection</span>` : ""));
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
  bus.on("pin.sc", () => { paint(); key(); table(); });
  bus.on("select.sc", () => { paint(); key(); title(); statBox(); table(); });
  return {render, paint, clearBrushVisual, stats, withFullBox, rebuild(){ clearBrushVisual(); }};
})();
