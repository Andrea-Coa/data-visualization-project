/* Vista 3 · Dinámica intra-grabación (responde).
   Media ± error estándar por época, calculada sujeto a sujeto sobre el grupo activo (selección o los 68).
   Si hay un participante fijado, su serie individual aparece punteada. Reproducir recorre las 75 épocas. */
const dyn = (() => {
  const el = $("dyn");
  let svg, g, W, H, dx, dy, gxA, gyA, gridG, band = {}, line = {}, ind = {}, endL = {}, scan, heads, cur = null, playing = false, timer = null, frame = 0;
  const m = {t:14, r:46, b:40, l:58};
  const ex = i => dx(i*4+2);   // centro de la época i, en segundos

  function build(){
    d3.select(el).selectAll("*").remove();
    W = el.clientWidth || 900; H = Math.round(Math.max(220, Math.min(280, W*.26)));
    svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img")
      .attr("aria-label", "Serie temporal de potencia theta por época, sueño normal y privación, media y error estándar del grupo activo");
    g = svg.append("g"); dx = d3.scaleLinear().domain([0, 300]).range([m.l, W-m.r]); dy = d3.scaleLinear().range([H-m.b, m.t]);
    svg.append("defs").append("clipPath").attr("id", "dclip").append("rect").attr("x", m.l).attr("y", m.t-4).attr("width", W-m.l-m.r).attr("height", H-m.b-m.t+8);
    gridG = g.append("g").attr("class", "grid").attr("transform", `translate(${m.l},0)`);
    gxA = g.append("g").attr("class", "axis").attr("transform", `translate(0,${H-m.b})`); gyA = g.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`);
    const plot = g.append("g").attr("clip-path", "url(#dclip)");
    ["NS", "SD"].forEach(c => {
      band[c] = plot.append("path").attr("fill-opacity", .16);
      ind[c] = plot.append("path").attr("class", "ts-ind").attr("stroke-dasharray", "2 2");
      line[c] = plot.append("path").attr("class", "ts-line");
      endL[c] = g.append("text").attr("class", "endlabel").attr("x", W-m.r+8).text(c);
    });
    scan = g.append("line").attr("class", "scan").attr("y1", m.t).attr("y2", H-m.b).style("opacity", 0);
    heads = g.append("g").style("pointer-events", "none");
    g.append("text").attr("class", "axis-title").attr("text-anchor", "middle").attr("x", (m.l+W-m.r)/2).attr("y", H-6)
      .text(W < 520 ? "tiempo (s) · 75 épocas de 4 s" : "tiempo dentro de la grabación (s) · 75 épocas de 4 s");
    g.append("text").attr("class", "axis-title").attr("text-anchor", "middle").attr("transform", "rotate(-90)").attr("x", -(m.t+H-m.b)/2).attr("y", 16).text("potencia θ");
    svg.append("rect").attr("x", m.l).attr("y", m.t).attr("width", W-m.l-m.r).attr("height", H-m.t-m.b).attr("fill", "transparent")
      .on("pointermove", ev => {
        if(playing) return;
        const [x] = d3.pointer(ev, svg.node()); frame = Math.max(0, Math.min(74, Math.floor(dx.invert(x)/4)));
        drawHead(); showTip(ev, tipFor(frame));
      })
      .on("pointerleave", () => { if(!playing){ scan.style("opacity", 0); heads.selectAll("*").remove(); } hideTip(); });
    colorize();
  }
  function colorize(){
    ["NS", "SD"].forEach(c => { const col = c === "NS" ? C.ns : C.sd; band[c].attr("fill", col); ind[c].attr("stroke", col); line[c].attr("stroke", col); endL[c].attr("fill", col); });
  }
  function render(opts = {}){
    if(!svg) build();
    const pref = ROI[S.roi].pref, ids = activeIds();
    cur = {NS:epochStats(ids, pref, "NS"), SD:epochStats(ids, pref, "SD")};
    const pn = S.pinned && SUBEP[S.pinned.id] ? S.pinned : null;
    const indiv = pn ? {NS:SUBEP[pn.id][pref+"_NS"] || [], SD:SUBEP[pn.id][pref+"_SD"] || []} : null;
    const vis = c => S.dcond === "both" || S.dcond === c;
    const all = [];
    ["NS", "SD"].forEach(c => {
      if(!vis(c)) return;
      cur[c].mean.forEach((v, i) => { if(v != null) all.push(v-cur[c].sem[i], v+cur[c].sem[i]); });
      if(indiv) indiv[c].forEach(v => { if(v != null) all.push(v); });
    });
    if(!all.length) return;
    const [lo, hi] = d3.extent(all), pad = (hi-lo)*.08; dy.domain([Math.max(0, lo-pad), hi+pad]);
    const t = svg.transition("morph").duration(opts.live ? 0 : T_MOVE).ease(EASE_IN_OUT);
    gridG.transition(t).call(d3.axisLeft(dy).ticks(5).tickSize(-(W-m.l-m.r)).tickFormat(""));
    gyA.transition(t).call(d3.axisLeft(dy).ticks(5).tickSizeOuter(0).tickFormat(L.format(".2~f"))); gyA.select(".domain").remove();
    gxA.call(d3.axisBottom(dx).tickValues(d3.range(0, 301, W < 560 ? 60 : 30)).tickSizeOuter(0).tickFormat(d => d));
    const ln = d3.line().defined(v => v != null).x((v, i) => ex(i)).y(v => dy(v)).curve(d3.curveMonotoneX);
    ["NS", "SD"].forEach(c => {
      const s = cur[c], on = vis(c);
      const ar = d3.area().defined((v, i) => s.mean[i] != null).x((v, i) => ex(i)).y0((v, i) => dy(s.mean[i]-s.sem[i])).y1((v, i) => dy(s.mean[i]+s.sem[i])).curve(d3.curveMonotoneX);
      band[c].transition(t).attr("d", ar(s.mean)).style("opacity", on ? 1 : 0);
      line[c].transition(t).attr("d", ln(s.mean)).style("opacity", on ? 1 : 0);
      ind[c].transition(t).attr("d", indiv ? ln(indiv[c]) : null).style("opacity", indiv && on ? 1 : 0);
      endL[c].transition(t).attr("y", s.mean[74] != null ? dy(s.mean[74])+4 : -99).style("opacity", on ? 1 : 0);
    });
    // evitar que las etiquetas NS / SD del extremo se pisen
    const yN = cur.NS.mean[74], yS = cur.SD.mean[74];
    if(yN != null && yS != null && Math.abs(dy(yN)-dy(yS)) < 14){
      const mid = (dy(yN)+dy(yS))/2, up = dy(yS) < dy(yN) ? "SD" : "NS";
      endL[up].transition(t).attr("y", mid-3); endL[up === "SD" ? "NS" : "SD"].transition(t).attr("y", mid+11);
    }
    d3.select("#dynpinkey").attr("hidden", indiv ? null : true); $("dynpinlbl").textContent = indiv ? `${pn.id}, individual` : "";
    const diffs = d3.range(75).map(i => cur.SD.mean[i] != null && cur.NS.mean[i] != null ? cur.SD.mean[i]-cur.NS.mean[i] : null).filter(v => v != null);
    $("dynstat").innerHTML = `n = <b>${cur.SD.n}</b> · SD − NS medio <b>${fsr(d3.mean(diffs))}</b> · tendencia SD <b>${fsr(slopePerMin(cur.SD.mean))}</b>/min`;
    if(playing || scan.style("opacity") === "1") drawHead();
  }
  function tipFor(i){
    const r = c => cur[c].mean[i] != null ? `${f3(cur[c].mean[i])} <span class="m">± ${f3(cur[c].sem[i])}</span>` : "n/d";
    return `<div class="h">Época ${i+1} <span class="m">· ${i*4}–${i*4+4} s</span></div>` +
      (S.dcond !== "SD" ? trow("NS", r("NS"), C.ns) : "") + (S.dcond !== "NS" ? trow("SD", r("SD"), C.sd) : "") +
      `<div class="m" style="margin-top:4px">media ± EE · grupo de ${cur.SD.n} participantes</div>`;
  }
  function drawHead(){
    if(!cur) return;
    scan.attr("x1", ex(frame)).attr("x2", ex(frame)).style("opacity", 1);
    const pts = ["NS", "SD"].filter(c => S.dcond === "both" || S.dcond === c).map(c => ({c, v:cur[c].mean[frame]})).filter(o => o.v != null);
    heads.selectAll("circle").data(pts, o => o.c).join("circle").attr("r", 4.5).attr("fill", o => o.c === "NS" ? C.ns : C.sd).attr("stroke", C.panel).attr("stroke-width", 2)
      .attr("cx", ex(frame)).attr("cy", o => dy(o.v));
  }
  function setIcon(p){
    $("playic").innerHTML = p ? '<rect x="2.5" y="1.5" width="2.6" height="9" rx=".6" fill="currentColor"/><rect x="6.9" y="1.5" width="2.6" height="9" rx=".6" fill="currentColor"/>' : '<path d="M3 1.5v9l7.5-4.5z" fill="currentColor"/>';
    $("playtxt").textContent = p ? "Pausar" : "Reproducir"; $("playbtn").setAttribute("aria-pressed", p);
  }
  // Movimiento constante = lineal: una época cada 65 ms (≈ 5 s para los 5 minutos)
  function play(){
    if(playing){ stop(true); return; }
    playing = true; hideTip(); if(frame >= 74) frame = 0; setIcon(true);
    if(REDUCE){ frame = 74; drawHead(); stop(true); return; }
    timer = d3.interval(() => { frame++; if(frame > 74){ stop(true); return; } drawHead(); }, 65);
  }
  function stop(keep){
    playing = false; if(timer) timer.stop(); timer = null; setIcon(false);
    if(!keep){ frame = 0; if(scan) scan.style("opacity", 0); if(heads) heads.selectAll("*").remove(); }
  }
  bus.on("select.dyn", e => render(e || {})); bus.on("pin.dyn", () => render()); bus.on("axes.dyn", () => render());
  bus.on("theme.dyn", () => { if(svg){ colorize(); render({live:true}); } });
  return {render, play, stop, rebuild:() => { stop(); svg = null; }};
})();
