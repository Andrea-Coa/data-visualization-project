/* Vista 1 · Panorama de vulnerabilidad (conduce).
   Dispersión Δσθ (región activa) vs. marcador conductual. Lazo libre = selección de grupo; clic = fijar.
   El hover usa una triangulación de Delaunay: basta estar cerca del punto (radio 16 px), no encima. */
let scatter_h = null;
const scatter = (() => {
  const el = $("scatter");
  let svg, g, sx, sy, W, H, data = [], delaunay = null, lassoPath, surface, ptsG, gxA, gyA, gridG, quad, quadLbl, zx, zy, mx, my, sxt, syt, pinLbl;
  let polygon = null, trail = [], pointerId = null, brushing = false, moved = false, beforeIds = null;
  const m = {t:16, r:18, b:50, l:60};

  function build(){
    d3.select(el).selectAll("*").remove();
    W = el.clientWidth || 600; H = Math.round(scatter_h || Math.max(340, Math.min(460, W*.74)));
    svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img")
      .attr("aria-label", "Dispersión del cambio de variabilidad theta frente al marcador conductual; la tabla bajo el gráfico contiene los mismos datos");
    g = svg.append("g");
    gridG = g.append("g").attr("class", "grid");
    quad = g.append("rect").attr("class", "quad");
    zx = g.append("line").attr("class", "zero"); zy = g.append("line").attr("class", "zero");
    mx = g.append("line").attr("class", "median"); my = g.append("line").attr("class", "median");
    gxA = g.append("g").attr("class", "axis"); gyA = g.append("g").attr("class", "axis");
    quadLbl = g.append("text").attr("class", "quad-label").attr("text-anchor", "end");
    sxt = g.append("text").attr("class", "axis-title").attr("text-anchor", "middle");
    syt = g.append("text").attr("class", "axis-title").attr("text-anchor", "middle").attr("transform", "rotate(-90)");
    surface = g.append("rect").attr("class", "lasso-surface")
      .attr("x", m.l).attr("y", m.t).attr("width", W-m.l-m.r).attr("height", H-m.t-m.b);
    lassoPath = g.append("path").attr("class", "lasso-selection");
    ptsG = g.append("g").attr("class", "dots");
    pinLbl = g.append("text").attr("class", "pinlabel").style("opacity", 0);
    sx = d3.scaleLinear().range([m.l, W-m.r]); sy = d3.scaleLinear().range([H-m.b, m.t]);
    surface.on("pointerdown", ev => {
      if(ev.button !== 0 || ev.isPrimary === false || brushing) return;
      ev.preventDefault();
      pointerId = ev.pointerId; brushing = true; moved = false;
      trail = [plotPoint(ev)]; beforeIds = S.selected ? [...S.selected] : null;
      surface.node().setPointerCapture(pointerId);
      hover(null); hideTip();
    }).on("lostpointercapture", cancelLasso);
    svg.on("pointermove", ev => {
      if(brushing){
        if(ev.pointerId === pointerId){
          sample(ev);
          if(moved){ drawLasso(trail); if(trail.length >= 3) applyLasso(trail, true); }
        }
        return;
      }
      const p = d3.pointer(ev, svg.node()), d = nearest(p);
      svg.style("cursor", d ? "pointer" : null); hover(d);
      if(d) showTip(ev, tipFor(d)); else hideTip();
    }).on("pointerup", finishLasso).on("pointercancel", cancelLasso)
      .on("pointerleave", () => { if(!brushing){ hover(null); hideTip(); svg.style("cursor", null); } });
    polygon = null;
  }
  function plotPoint(ev){
    const [x, y] = d3.pointer(ev, svg.node());
    return [Math.max(m.l, Math.min(W-m.r, x)), Math.max(m.t, Math.min(H-m.b, y))];
  }
  function sample(ev){
    const p = plotPoint(ev), first = trail[0], last = trail[trail.length-1];
    if(Math.hypot(p[0]-first[0], p[1]-first[1]) >= 4) moved = true;
    if(Math.hypot(p[0]-last[0], p[1]-last[1]) >= 2) trail.push(p);
  }
  function drawLasso(points){
    lassoPath.attr("d", points && points.length > 1 ? d3.line()(points)+"Z" : null);
  }
  function releasePointer(){
    const id = pointerId; pointerId = null; brushing = false;
    if(id != null && surface.node().hasPointerCapture(id)) surface.node().releasePointerCapture(id);
  }
  function finishLasso(ev){
    if(!brushing || ev.pointerId !== pointerId) return;
    sample(ev); releasePointer();
    if(!moved){
      const hit = nearest(plotPoint(ev));
      if(hit){ pin(hit); drawLasso(polygon); }
      else { clearBrushVisual(); setSelected(null); if(S.pinned) pin(null); }
      return;
    }
    polygon = trail.length >= 3 ? trail.slice() : null;
    if(!polygon || !applyLasso(polygon, false)){ polygon = null; setSelected(null); }
    drawLasso(polygon); trail = [];
  }
  function cancelLasso(ev){
    if(!brushing || ev.pointerId !== pointerId) return;
    releasePointer(); trail = []; drawLasso(polygon); setSelected(beforeIds);
  }
  function applyLasso(points, live){
    const xk = S.xKey(), yk = S.y;
    const ids = data.filter(d => d3.polygonContains(points, [sx(d[xk]), sy(d[yk])])).map(d => d.id);
    setSelected(ids, {live}); return ids.length;
  }
  function nearest(p){
    if(!delaunay) return null; const i = delaunay.find(p[0], p[1]); if(i < 0) return null; const d = data[i];
    return Math.hypot(sx(d[S.xKey()])-p[0], sy(d[S.y])-p[1]) <= 16 ? d : null;
  }
  function clearBrushVisual(){
    if(!lassoPath) return;
    releasePointer(); polygon = null; trail = []; drawLasso(null); hideTip();
  }
  // Cuadrante vulnerable: sobre la mediana de Δσθ y peor que la mediana del marcador (PANAS+ invierte el sentido)
  function stats(){
    const xk = S.xKey(), yk = S.y, rows = P.filter(d => d[xk] != null && d[yk] != null);
    const xmed = d3.median(rows, d => d[xk]), ymed = d3.median(rows, d => d[yk]), w = MK[yk].worse;
    return {rows, xmed, ymed, w, vuln:new Set(rows.filter(d => d[xk] > xmed && w*(d[yk]-ymed) > 0).map(d => d.id))};
  }
  function render(animate = true){
    if(!svg) build();
    const xk = S.xKey(), yk = S.y, st = stats(); data = st.rows; S.vuln = st.vuln;
    const xe = d3.extent(data, d => d[xk]), ye = d3.extent(data, d => d[yk]);
    const xp = (xe[1]-xe[0])*.08 || .01, yp = (ye[1]-ye[0])*.1 || 1;
    sx.domain([Math.min(xe[0]-xp, 0), Math.max(xe[1]+xp, 0)]).nice(); sy.domain([Math.min(ye[0]-yp, 0), Math.max(ye[1]+yp, 0)]).nice();
    const t = svg.transition("axes").duration(animate ? T_MOVE : 0).ease(EASE_IN_OUT);
    gridG.attr("transform", `translate(${m.l},0)`).transition(t).call(d3.axisLeft(sy).ticks(6).tickSize(-(W-m.l-m.r)).tickFormat(""));
    gxA.attr("transform", `translate(0,${H-m.b})`).transition(t).call(d3.axisBottom(sx).ticks(Math.max(4, Math.round(W/110))).tickSizeOuter(0).tickFormat(L.format("~r")));
    gyA.attr("transform", `translate(${m.l},0)`).transition(t).call(d3.axisLeft(sy).ticks(6).tickSizeOuter(0).tickFormat(L.format("~r")));
    gyA.select(".domain").remove();
    zx.transition(t).attr("x1", sx(0)).attr("x2", sx(0)).attr("y1", m.t).attr("y2", H-m.b);
    zy.transition(t).attr("x1", m.l).attr("x2", W-m.r).attr("y1", sy(0)).attr("y2", sy(0));
    mx.transition(t).attr("x1", sx(st.xmed)).attr("x2", sx(st.xmed)).attr("y1", m.t).attr("y2", H-m.b);
    my.transition(t).attr("x1", m.l).attr("x2", W-m.r).attr("y1", sy(st.ymed)).attr("y2", sy(st.ymed));
    const qy0 = st.w > 0 ? m.t : sy(st.ymed), qy1 = st.w > 0 ? sy(st.ymed) : H-m.b;
    quad.transition(t).attr("x", sx(st.xmed)).attr("width", W-m.r-sx(st.xmed)).attr("y", qy0).attr("height", Math.max(0, qy1-qy0));
    quadLbl.attr("x", W-m.r-8).attr("y", st.w > 0 ? m.t+16 : H-m.b-9).text(`vulnerables · ${S.vuln.size}`);
    sxt.attr("x", (m.l+W-m.r)/2).attr("y", H-10)
      .text(W < 520 ? `Δσθ ${ROI[S.roi].name} (SD − NS) → más inestable` : `Δ variabilidad theta ${ROI[S.roi].name} (σθ, SD − NS)  →  más inestable`);
    syt.attr("x", -(m.t+H-m.b)/2).attr("y", 16).text(MK[yk].axis);
    const sel = ptsG.selectAll("circle:not(.gone)").data(data, d => d.id);
    // salida y entrada por opacidad, nunca desde r = 0
    // salida explícita: transition.remove() no elimina si otra transición (pintado) sigue activa en el nodo
    sel.exit().classed("gone", true).interrupt("paint").transition("exit").duration(T_FADE).ease(EASE_OUT).attr("opacity", 0).on("end interrupt", function(){ this.remove(); });
    sel.enter().append("circle").attr("r", 6).attr("opacity", 0).attr("cx", d => sx(d[xk])).attr("cy", d => sy(d[yk]))
      .attr("fill", d => MOD[S.mod].col(d)).attr("stroke", C.panel).attr("stroke-width", 1.5)
      .transition("enter").delay(animate ? T_MOVE*.5 : 0).duration(T_FADE).ease(EASE_OUT).attr("opacity", 1);
    sel.classed("gone", false).interrupt("exit");
    sel.transition(t).attr("cx", d => sx(d[xk])).attr("cy", d => sy(d[yk])).attr("opacity", 1);
    delaunay = d3.Delaunay.from(data, d => sx(d[xk]), d => sy(d[yk]));
    paint();
    const r = spearman(EEG, xk, yk);
    $("scstat").innerHTML = `${fRho(r)} · n = <b>${r.n}</b>`;
    legend(); table();
  }
  function paint(){
    if(!ptsG) return;
    const ss = S.selected ? new Set(S.selected) : null, hv = S.hovered, pn = S.pinned, xk = S.xKey(), yk = S.y;
    const on = d => (pn && pn.id === d.id) || (hv && hv.id === d.id);
    ptsG.selectAll("circle:not(.gone)").transition("paint").duration(T_FADE).ease(EASE_OUT)
      .attr("fill", d => MOD[S.mod].col(d))
      .attr("fill-opacity", d => ss && !ss.has(d.id) ? .2 : .92)
      .attr("stroke", d => on(d) ? C.ink : C.panel)
      .attr("stroke-width", d => (pn && pn.id === d.id) ? 2.5 : (on(d) ? 2 : 1.5))
      .attr("r", d => on(d) ? 8 : 6);
    ptsG.selectAll("circle:not(.gone)").filter(d => ss && ss.has(d.id)).raise();
    ptsG.selectAll("circle:not(.gone)").filter(on).raise();
    const show = pn && data.find(d => d.id === pn.id);
    if(show){
      const px = sx(show[xk]), py = sy(show[yk]), right = px < W-90;
      pinLbl.attr("x", right ? px+12 : px-12).attr("y", py+4).attr("text-anchor", right ? "start" : "end").text(show.id)
        .transition("pin").duration(T_FADE).ease(EASE_OUT).style("opacity", 1);
    } else pinLbl.transition("pin").duration(T_FADE).ease(EASE_OUT).style("opacity", 0);
  }
  function tipFor(d){
    const xk = S.xKey(), yk = S.y;
    return `<div class="h">${d.id} <span class="m">· ${d.gender === "F" ? "mujer" : "hombre"}${d.age != null ? ", "+d.age+" años" : ""}</span></div>` +
      trow(`Δσθ ${ROI[S.roi].name}`, fsr(d[xk])) + trow(MK[yk].short, fsr(d[yk])) +
      (d.psqi != null ? trow("PSQI", d.psqi) : "") +
      `<div class="m" style="margin-top:4px">${S.vuln.has(d.id) ? "En el cuadrante vulnerable" : "Fuera del cuadrante vulnerable"} · clic para fijar</div>`;
  }
  function legend(){
    const M = MOD[S.mod], box = d3.select("#sclegend"); box.selectAll("*").remove();
    if(M.cats){
      M.cats().forEach(([k, c]) => { const s = box.append("span").attr("class", "k"); s.append("span").attr("class", "dotk").style("background", c); s.append("span").text(k); });
    } else {
      const [a, b] = M.dom(), rp = M.ramp(), s = box.append("span").attr("class", "k");
      s.append("span").attr("class", "muted num").text(a);
      s.append("span").attr("class", "ramp").style("background", `linear-gradient(90deg,${d3.range(0, 1.01, .1).map(rp).join(",")})`);
      s.append("span").attr("class", "muted num").text(b); s.append("span").text(M.label);
      if(M.na){ const n = box.append("span").attr("class", "k"); n.append("span").attr("class", "dotk").style("background", C.na); n.append("span").attr("class", "muted").text("sin dato"); }
    }
    const miss = EEG.length-data.length;
    if(miss > 0) box.append("span").attr("class", "k muted").style("margin-left", "auto").text(`${miss} sin ${MK[S.y].short}, no se dibujan`);
  }
  const rowClass = (d, ss) => [ss && ss.has(d.id) ? "sel" : "", ss && !ss.has(d.id) ? "dim" : "", S.pinned && S.pinned.id === d.id ? "pin" : ""].join(" ");
  function table(){
    const xk = S.xKey(), yk = S.y, ss = S.selected ? new Set(S.selected) : null, tb = d3.select("#dtable");
    $("tablev").querySelector("summary").textContent = `Ver los datos en tabla · ${data.length} participantes`;
    tb.html(`<thead><tr><th>Participante</th><th>Sexo</th><th>Edad</th><th>PSQI</th><th>Δσθ ${ROI[S.roi].name}</th><th>Δ ${MK[yk].short}</th><th>Perfil</th></tr></thead><tbody></tbody>`);
    tb.select("tbody").selectAll("tr").data(data.slice().sort((a, b) => b[xk]-a[xk]), d => d.id).join("tr")
      .attr("tabindex", 0).attr("class", d => rowClass(d, ss))
      .on("click", (e, d) => pin(d)).on("keydown", (e, d) => { if(e.key === "Enter" || e.key === " "){ e.preventDefault(); pin(d); } })
      .on("mouseenter", (e, d) => hover(d)).on("mouseleave", () => hover(null))
      .html(d => `<td>${d.id}</td><td>${d.gender === "F" ? "mujer" : "hombre"}</td><td>${d.age ?? "–"}</td><td>${d.psqi ?? "–"}</td><td>${fsr(d[xk])}</td><td>${fsr(d[yk])}</td><td>${S.vuln.has(d.id) ? "vulnerable" : "–"}</td>`);
  }
  function tableClasses(){ const ss = S.selected ? new Set(S.selected) : null; d3.select("#dtable tbody").selectAll("tr").attr("class", d => rowClass(d, ss)); }
  function selectVulnerable(){
    clearBrushVisual(); setSelected([...stats().vuln]);
  }
  bus.on("hover.sc", () => paint()); bus.on("pin.sc", () => { paint(); tableClasses(); });
  bus.on("select.sc", () => { paint(); tableClasses(); }); bus.on("color.sc", () => { paint(); legend(); });
  bus.on("theme.sc", () => { ptsG && ptsG.selectAll("circle:not(.gone)").interrupt("paint"); paint(); legend(); });
  return {render, paint, clearBrushVisual, selectVulnerable, stats, rebuild:() => { clearBrushVisual(); svg = null; }};
})();

// En dos columnas, el scatter toma la altura del panel del topomapa para que ambos cierren alineados.
function syncHeights(){
  const ps = $("p-scatter"), pt = $("p-topo"), sv = $("scatter").querySelector("svg"); if(!sv) return;
  if(ps.closest(".dashboard-layout")) return;
  const twoCol = Math.abs(ps.offsetTop-pt.offsetTop) < 4;
  const chrome = ps.offsetHeight-sv.getBoundingClientRect().height;
  const want = twoCol ? Math.max(340, Math.min(640, pt.offsetHeight-chrome)) : null;
  if(want === scatter_h || (want && scatter_h && Math.abs(want-scatter_h) < 3)) return;
  scatter_h = want; scatter.rebuild(); scatter.render(false);
}
