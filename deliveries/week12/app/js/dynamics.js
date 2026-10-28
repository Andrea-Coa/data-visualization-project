/* Vista 3 · Cinco minutos (tarea T6).
   Media ± error estándar de la potencia theta relativa por época de 4 s, sujeto a sujeto, sobre el grupo activo
   (las 68 personas o el grupo elegido) en la región del header.
   Interacción: arrastrar sobre el eje del tiempo elige una ventana; la dispersión pasa a usar el cambio theta de
   cada persona dentro de esa ventana. Pasar el cursor sobre una persona en la dispersión dibuja aquí su serie
   individual (punteada, sin cambiar la escala del grupo). */
const dyn = (() => {
  const el = $("dyn");
  let svg, g, W, H, dx, dy, scan, heads, brush, brushG, cur = null, ln, G = null;
  const m = {t:8, r:34, b:30, l:52};   // m.r crece en modo comparación para que quepan los nombres de grupo
  const ex = i => dx(i*4+2);   // centro de la época i, en segundos

  function render(){
    d3.select(el).selectAll("*").remove();
    W = el.clientWidth || 600; H = Math.round(Math.max(150, el.clientHeight || 220));
    svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("height", H).style("height", H+"px").attr("role", "img")
      .attr("aria-label", "Potencia theta por época, NS y SD, media y error estándar del grupo activo");
    svg.append("defs").append("clipPath").attr("id", "dclip").append("rect").attr("x", m.l).attr("y", m.t).attr("width", W-m.l-m.r).attr("height", H-m.t-m.b);
    g = svg.append("g");
    const pref = ROI[S.roi].pref, ids = activeIds();
    G = cmpGroups(); m.r = G ? 70 : 34;
    d3.select("#k-dyn").html(G ? G.map(gr => `<span class="k"><i class="ln" style="background:${gr.color}"></i>${gr.name}</span>`).join("") + `<span class="k m">Δ media ± EE</span>`
      : `<span class="k"><i class="ln ns"></i>NS</span><span class="k"><i class="ln sd"></i>SD</span><span class="k"><i class="dash"></i>tendencia</span>`);
    // con comparación: Δ (SD menos NS) por época de cada grupo; sin comparación: NS y SD del grupo activo
    cur = G ? {D:G.map(gr => epochDiffStats(gr.ids, pref))} : {NS:epochStats(ids, pref, "NS"), SD:epochStats(ids, pref, "SD")};
    const series = G ? cur.D : [cur.NS, cur.SD];
    const vals = series.flatMap(s => s.mean.flatMap((v, i) => v == null ? [] : [v-s.sem[i], v+s.sem[i]])).concat(G ? [0] : []);
    const [lo, hi] = d3.extent(vals), pad = (hi-lo)*.08;
    dx = d3.scaleLinear().domain([0, 300]).range([m.l, W-m.r]); dy = d3.scaleLinear().domain([lo-pad, hi+pad]).range([H-m.b, m.t]);
    g.append("g").attr("class", "gridl").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(dy).ticks(4).tickSize(-(W-m.l-m.r)).tickFormat(""));
    g.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(dy).ticks(4).tickSizeOuter(0).tickFormat(L.format(".2~f"))).call(a => a.select(".domain").remove());
    g.append("g").attr("class", "axis").attr("transform", `translate(0,${H-m.b})`).call(d3.axisBottom(dx).tickValues(d3.range(0, 301, W < 500 ? 60 : 30)).tickSizeOuter(0).tickFormat(d => d === 300 ? "300 s" : d));
    g.append("text").attr("class", "atitle").attr("text-anchor", "middle").attr("transform", "rotate(-90)").attr("x", -(m.t+H-m.b)/2).attr("y", 10).text(G ? "Δ potencia θ (SD − NS)" : "potencia θ relativa");
    // ventana de tiempo (debajo de las series para no taparlas)
    brushG = g.append("g").attr("class", "brush");
    ln = d3.line().defined(v => v != null).x((v, i) => ex(i)).y(v => dy(v)).curve(d3.curveMonotoneX);
    const plot = g.append("g").attr("clip-path", "url(#dclip)").style("pointer-events", "none");
    if(G) plot.append("line").attr("class", "zero").attr("x1", m.l).attr("x2", W-m.r).attr("y1", dy(0)).attr("y2", dy(0));
    const items = G ? cur.D.map((s, i) => ({s, col:G[i].color, lab:G[i].name})) : [{s:cur.NS, col:C.ns, lab:"NS"}, {s:cur.SD, col:C.sd, lab:"SD"}];
    items.forEach(({s, col}) => {
      plot.append("path").attr("fill", col).attr("fill-opacity", .13)
        .attr("d", d3.area().defined((v, i) => s.mean[i] != null).x((v, i) => ex(i)).y0((v, i) => dy(s.mean[i]-s.sem[i])).y1((v, i) => dy(s.mean[i]+s.sem[i])).curve(d3.curveMonotoneX)(s.mean));
      plot.append("path").attr("class", "ts-line").attr("stroke", col).attr("d", ln(s.mean));
      // tendencia lineal ajustada sobre los 5 minutos (la pendiente que cita el título)
      const pts = s.mean.map((v, i) => [i*4+2, v]).filter(p => p[1] != null), mx = d3.mean(pts, p => p[0]), my = d3.mean(pts, p => p[1]);
      const b = d3.sum(pts, p => (p[0]-mx)*(p[1]-my))/d3.sum(pts, p => (p[0]-mx)**2);
      plot.append("line").attr("x1", dx(0)).attr("x2", dx(300)).attr("y1", dy(my+b*(0-mx))).attr("y2", dy(my+b*(300-mx))).attr("stroke", col).attr("stroke-width", 1.5).attr("stroke-dasharray", "6 4").attr("opacity", .9);
    });
    // etiquetas directas al final, separadas al menos 13 px
    const ends = items.map(o => ({lab:o.lab, col:o.col, y:dy(o.s.mean[74])})).sort((a, b) => a.y-b.y);
    for(let i = 1; i < ends.length; i++) if(ends[i].y-ends[i-1].y < 13) ends[i].y = ends[i-1].y+13;
    ends.forEach(o => g.append("text").attr("class", "alab").attr("x", W-m.r+5).attr("y", o.y+4).style("fill", o.col).text(o.lab.length > 9 ? o.lab.slice(0, 8)+"." : o.lab));
    scan = g.append("line").attr("class", "scan").attr("y1", m.t).attr("y2", H-m.b).style("opacity", 0);
    heads = g.append("g").style("pointer-events", "none");
    brush = d3.brushX().extent([[m.l, m.t], [W-m.r, H-m.b]]).on("end", ev => {
      if(!ev.sourceEvent) return;                       // movimientos programáticos no cambian el estado
      if(!ev.selection){ if(S.win) setWin(null); return; }
      const [x0, x1] = ev.selection, a = Math.max(0, Math.floor(dx.invert(x0)/4)), b = Math.min(74, Math.floor(dx.invert(x1)/4));
      if(b-a < 2){ brushG.call(brush.move, null); if(S.win) setWin(null); return; }
      setWin([a, b]);
    });
    brushG.call(brush);
    if(S.win) brushG.call(brush.move, [dx(S.win[0]*4), dx((S.win[1]+1)*4)]);
    svg.on("pointermove", ev => {
      const [px] = d3.pointer(ev, svg.node()); if(px < m.l || px > W-m.r){ scan.style("opacity", 0); heads.selectAll("*").remove(); hideTip(); return; }
      const i = Math.max(0, Math.min(74, Math.floor(dx.invert(px)/4))); drawHead(i); showTip(ev, tipFor(i));
    }).on("pointerleave", () => { scan.style("opacity", 0); heads.selectAll("*").remove(); hideTip(); });
    title();
  }
  function title(){
    const rng = S.win || [0, 74], idx = d3.range(rng[0], rng[1]+1), post = S.win ? `, ${winTxt(S.win)}` : "";
    const upOf = s => idx.filter(i => s.mean[i] != null && s.mean[i] > 0).length;
    if(G){
      const u = cur.D.map(upOf);
      setTitle("t-dyn", `Δθ por época: dos grupos${post}`,
        `SD &gt; NS en ${u[0]} y ${u[1]} de ${idx.length} épocas`);
      return;
    }
    const d = idx.map(i => cur.SD.mean[i]-cur.NS.mean[i]), up = d.filter(v => v > 0).length;
    setTitle("t-dyn", `θ relativa por época: NS y SD${S.selected ? ", tu selección" : ""}${post}`,
      nb(`SD &gt; NS en ${up}/${idx.length} épocas${S.win ? `, Δ ${fsr(d3.mean(d.filter(v => !isNaN(v))))}` : `, pendiente ${fsr(slopePerMin(cur.SD.mean))}/min`}, n = ${cur.SD.n}`));
  }
  function tipFor(i){
    const r = s => s.mean[i] != null ? `${f3(s.mean[i])} <span class="m">± ${f3(s.sem[i])}</span>` : "n/d";
    return `<div class="h">Época ${i+1} <span class="m">${i*4} a ${i*4+4} s</span></div>` +
      (G ? G.map((gr, k) => trow(`${gr.name}, Δ`, r(cur.D[k]), gr.color)).join("") : trow("NS", r(cur.NS), C.ns) + trow("SD", r(cur.SD), C.sd));
  }
  function drawHead(i){
    scan.attr("x1", ex(i)).attr("x2", ex(i)).style("opacity", 1);
    const pts = G ? cur.D.map((s, k) => ({c:G[k].color, v:s.mean[i]})) : [{c:C.ns, v:cur.NS.mean[i]}, {c:C.sd, v:cur.SD.mean[i]}];
    heads.selectAll("circle").data(pts.filter(o => o.v != null)).join("circle").attr("r", 4).attr("cx", ex(i)).attr("cy", o => dy(o.v))
      .attr("fill", o => o.c).attr("stroke", C.panel).attr("stroke-width", 1.5);
  }
  bus.on("select.dyn", e => { if(!(e && e.live)) render(); }); bus.on("axes.dyn", () => render());
  return {render, rebuild(){}};
})();
