/* Vista 3 · Cinco minutos (tarea T6, pregunta Q6: dinámica dentro del registro).
   Sigue a la métrica del header:
   - μθ: potencia theta relativa por época de 4 s, media ± error estándar entre personas del grupo activo.
   - σθ: σθ móvil, la desviación estándar de la θ regional en una ventana deslizante de 10 épocas (40 s), persona a
     persona, y luego media ± error estándar. σθ resume la inestabilidad entre épocas (Cui et al., 2026); su versión
     móvil muestra cuándo aparece dentro de los cinco minutos, en línea con la hipótesis de inestabilidad de estado
     tras la privación de sueño (Doran, Van Dongen y Dinges, 2001). Es exploratoria: Cui et al. resumen la
     variabilidad en un solo número por registro, sin orden temporal.
   Con dos grupos comparados se muestra Δ (SD − NS) de cada grupo.
   Interacción: arrastrar sobre el eje del tiempo elige una ventana; la dispersión pasa a usar el cambio theta de
   cada persona dentro de esa ventana (σθ o μθ, según el header). */
const dyn = (() => {
  const el = $("dyn");
  let svg, g, W, H, dx, dy, scan, heads, brush, brushG, cur = null, ln, G = null, XS = [];
  const m = {t:8, r:18, b:30, l:52};   // las series se identifican en la leyenda del panel
  const ex = i => dx(XS[i]);           // tiempo (s) del punto i: centro de la época o de la ventana móvil
  const isVar = () => S.met === "var";
  const nearest = t => Math.max(0, Math.min(XS.length-1, Math.round((t-XS[0])/4)));
  const spanTxt = i => isVar() ? `${XS[i]-ROLL_W*2} a ${XS[i]+ROLL_W*2} s` : `${XS[i]-2} a ${XS[i]+2} s`;

  function render(){
    d3.select(el).selectAll("*").remove();
    W = el.clientWidth || 600; H = Math.round(Math.max(120, el.clientHeight || 220));
    const met = S.met;
    svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("height", H).style("height", H+"px").attr("role", "img")
      .attr("aria-label", isVar() ? "σθ móvil en ventanas de 40 s, NS y SD, media y error estándar del grupo activo"
        : "Potencia theta por época, NS y SD, media y error estándar del grupo activo");
    svg.append("defs").append("clipPath").attr("id", "dclip").append("rect").attr("x", m.l).attr("y", m.t).attr("width", W-m.l-m.r).attr("height", H-m.t-m.b);
    g = svg.append("g");
    const pref = ROI[S.roi].pref, ids = activeIds();
    G = cmpGroups();
    // con comparación: Δ (SD menos NS) de cada grupo; sin comparación: NS y SD del grupo activo
    cur = G ? {D:G.map(gr => epochDiffStats(gr.ids, pref, met))} : {NS:epochStats(ids, pref, "NS", met), SD:epochStats(ids, pref, "SD", met)};
    XS = (G ? cur.D[0] : cur.SD).xs;
    // la leyenda dice qué es la banda sombreada (error estándar, no desviación estándar) y con cuántas personas
    d3.select("#k-dyn").html(G ? G.map(gr => `<span class="k"><i class="ln" style="background:${gr.color}"></i>${gr.name}</span>`).join("") + `<span class="k m">banda: Δ media ± EE</span>`
      : `<span class="k"><i class="ln ns"></i>NS</span><span class="k"><i class="ln sd"></i>SD</span><span class="k"><i class="dash"></i>tendencia</span><span class="k m">banda: media ± EE, n = ${cur.SD.n}</span>`);
    const series = G ? cur.D : [cur.NS, cur.SD];
    const vals = series.flatMap(s => s.mean.flatMap((v, i) => v == null ? [] : [v-s.sem[i], v+s.sem[i]])).concat(G ? [0] : []);
    const [lo, hi] = d3.extent(vals), pad = (hi-lo)*.08;
    dx = d3.scaleLinear().domain([0, 300]).range([m.l, W-m.r]); dy = d3.scaleLinear().domain([lo-pad, hi+pad]).range([H-m.b, m.t]);
    g.append("g").attr("class", "gridl").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(dy).ticks(4).tickSize(-(W-m.l-m.r)).tickFormat(""));
    g.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(dy).ticks(4).tickSizeOuter(0).tickFormat(L.format(isVar() ? ".3~f" : ".2~f"))).call(a => a.select(".domain").remove());
    g.append("g").attr("class", "axis").attr("transform", `translate(0,${H-m.b})`).call(d3.axisBottom(dx).tickValues(d3.range(0, 301, W < 500 ? 60 : 30)).tickSizeOuter(0).tickFormat(d => d === 300 ? "300 s" : d));
    const yTitle = isVar() ? (G ? "Δ σθ móvil (SD − NS)" : "σθ móvil (DE en 40 s)") : (G ? "Δ potencia θ (SD − NS)" : "potencia θ relativa");
    g.append("text").attr("class", "atitle").attr("text-anchor", "middle").attr("transform", "rotate(-90)").attr("x", -(m.t+H-m.b)/2).attr("y", 10).text(yTitle);
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
      // tendencia lineal ajustada sobre el registro (la pendiente que cita el título)
      const pts = s.mean.map((v, i) => [XS[i], v]).filter(p => p[1] != null), mx = d3.mean(pts, p => p[0]), my = d3.mean(pts, p => p[1]);
      const b = d3.sum(pts, p => (p[0]-mx)*(p[1]-my))/d3.sum(pts, p => (p[0]-mx)**2), x0 = XS[0], x1 = XS[XS.length-1];
      plot.append("line").attr("x1", dx(x0)).attr("x2", dx(x1)).attr("y1", dy(my+b*(x0-mx))).attr("y2", dy(my+b*(x1-mx))).attr("stroke", col).attr("stroke-width", 1.5).attr("stroke-dasharray", "6 4").attr("opacity", .9);
    });
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
      const i = nearest(dx.invert(px)); drawHead(i); showTip(ev, tipFor(i));
    }).on("pointerleave", () => { scan.style("opacity", 0); heads.selectAll("*").remove(); hideTip(); });
    title();
  }
  function title(){
    // puntos dentro de la ventana elegida (por su tiempo central), o todos
    const idx = d3.range(XS.length).filter(i => !S.win || (XS[i] >= S.win[0]*4 && XS[i] <= (S.win[1]+1)*4));
    const post = S.win ? `, ${winTxt(S.win)}` : "", unit = isVar() ? "ventanas" : "épocas";
    const what = isVar() ? `σθ móvil (DE de la θ regional en ventanas de ${ROLL_W} épocas = ${ROLL_W*4} s, que avanzan de a una época)`
      : "Potencia theta relativa (4 a 8 Hz sobre 1 a 40 Hz) por época de 4 s";
    const scale = isVar() ? "La σθ de la dispersión promedia la DE de cada electrodo; aquí se usa la serie ya promediada por región, así que los valores son menores: compara la forma en el tiempo, no las cifras. Exploratoria: Cui et al. (2026) resumen la variabilidad en un solo número por registro." : "";
    const upOf = s => idx.filter(i => s.mean[i] != null && s.mean[i] > 0).length;
    if(G){
      const u = cur.D.map(upOf);
      setTitle("t-dyn", `${isVar() ? "Δσθ móvil" : "Δθ por época"}: dos grupos${post}`, nb(`n = ${cur.D[0].n} y ${cur.D[1].n}`),
        notes(`Δ (SD − NS) de la ${what.charAt(0).toLowerCase()+what.slice(1)}, persona a persona; media ± error estándar de cada grupo.`,
          `Δ &gt; 0 en ${u[0]} (${G[0].name}) y ${u[1]} (${G[1].name}) de ${idx.length} ${unit}.`, scale, "Arrastrar sobre el gráfico elige una ventana de tiempo para la dispersión."));
      return;
    }
    const d = idx.map(i => cur.SD.mean[i]-cur.NS.mean[i]), up = d.filter(v => v > 0).length;
    setTitle("t-dyn", `${isVar() ? "σθ móvil (ventanas de 40 s)" : "θ relativa por época"}: NS y SD${S.selected ? ", tu selección" : ""}${post}`, nb(`n = ${cur.SD.n}`),
      notes(`${what}; media ± error estándar entre personas. Líneas discontinuas: tendencia lineal.`,
        `SD &gt; NS en ${up} de ${idx.length} ${unit}${S.win ? `; Δ medio ${fsr(d3.mean(d.filter(v => !isNaN(v))))}` : `; pendiente de SD ${fsr(slopePerMin(cur.SD.mean, XS))}/min`}.`,
        scale, "Arrastrar sobre el gráfico elige una ventana de tiempo para la dispersión."));
  }
  function tipFor(i){
    const r = s => s.mean[i] != null ? `${f3(s.mean[i])} <span class="m">± ${f3(s.sem[i])}</span>` : "n/d";
    const head = isVar() ? `Ventana ${i+1} <span class="m">${spanTxt(i)}</span>` : `Época ${i+1} <span class="m">${spanTxt(i)}</span>`;
    return `<div class="h">${head}</div>` +
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
