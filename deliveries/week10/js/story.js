/* Historia: "Una noche sin dormir".
   Un solo escenario SVG fijo (sticky). Los 68 puntos son siempre las mismas 68 personas y viajan entre escenas
   (constancia de objeto): cuadrícula → enjambre sobre Δσθ → dispersión con PVT → electrodos → serie temporal.
   Cada paso de texto se activa con IntersectionObserver al cruzar el centro del viewport; nunca con scroll listeners.
   Motion: transiciones explicativas (900 ms, ease-in-out fuerte) con escalonado corto; con movimiento reducido
   los puntos no viajan, se funden en su nuevo lugar. */
const story = (() => {
  const stageEl = $("stage"), svg = d3.select("#stage-svg");
  let W, H, mobile, F, nodes = [], dotG, LY = {}, cur = -1, facts = null;
  let xs, swarmPos = new Map(), scatterPos = new Map(), sy, topoGeo, dynGeo, vulnGeo;
  const R0 = 6.5, T_STORY = REDUCE ? 0 : 900;

  // ---------------- cifras (todas calculadas con los datos reales) ----------------
  function computeFacts(){
    const v = EEG.map(d => d.d_front_var), mean = d3.mean(v), sd = d3.deviation(v);
    const pv = EEG.filter(d => d.d_pvt != null);
    const xmed = d3.median(pv, d => d.d_front_var), ymed = d3.median(pv, d => d.d_pvt);
    const vuln = new Set(pv.filter(d => d.d_front_var > xmed && d.d_pvt > ymed).map(d => d.id));
    const rho = spearman(EEG, "d_front_var", "d_pvt");
    const ns = epochStats(EEG_IDS, "f", "NS"), sdd = epochStats(EEG_IDS, "f", "SD");
    const vIds = [...vuln], rIds = EEG_IDS.filter(id => !vuln.has(id));
    const vN = epochStats(vIds, "f", "NS"), vS = epochStats(vIds, "f", "SD"), rN = epochStats(rIds, "f", "NS"), rS = epochStats(rIds, "f", "SD");
    const m = a => d3.mean(a.filter(x => x != null));
    const sigE = ELEC.filter(e => TOPO[e].sigVar < .05);
    const frac = mean/sd, den = Math.round(1/frac);
    const FR = {2:"la mitad", 3:"un tercio", 4:"un cuarto", 5:"una quinta parte", 6:"una sexta parte", 7:"una séptima parte", 8:"una octava parte", 9:"una novena parte", 10:"una décima parte"};
    return {
      mean, sd, xmed, ymed, vuln, rho, ns, sdd, vN, vS, rN, rS,
      txt:{
        mean: fsr(mean), meanBig: fsr(mean), sdBig: L.format(".3f")(sd), ratio: FR[den] || `${L.format(".0%")(frac)}`,
        pos: EEG.filter(d => d.d_front_var > 0).length, neg: EEG.filter(d => d.d_front_var < 0).length,
        nPvt: pv.length, slower: pv.filter(d => d.d_pvt > 0).length,
        rho: `ρ = ${f2(rho.rho)} [${f2(rho.lo)}, ${f2(rho.hi)}]`, nVuln: vuln.size,
        elecUp: ELEC.filter(e => TOPO[e].dVar > 0).length, sigP: sigE.length, sigQ: ELEC.filter(e => TOPO[e].qVar < .05).length || "ninguno",
        sigList: sigE.join(", "),
        sigQtxt: (q => q === 0 ? "ninguno sobrevive" : q === 1 ? "solo uno sobrevive" : `${q} sobreviven`)(ELEC.filter(e => TOPO[e].qVar < .05).length),
        epUp: d3.range(75).filter(i => sdd.mean[i] > ns.mean[i]).length,
        dPct: L.format("+.1%")((m(sdd.mean)-m(ns.mean))/m(ns.mean)),
        vNS: f3(m(vN.mean)), vSD: f3(m(vS.mean)), vPct: L.format("+.0%")((m(vS.mean)-m(vN.mean))/m(vN.mean)),
        rPct: L.format("+.0%")((m(rS.mean)-m(rN.mean))/m(rN.mean)),
      },
    };
  }
  function fillText(){
    document.querySelectorAll("[data-k]").forEach(n => { const v = facts.txt[n.dataset.k]; if(v != null) n.textContent = v; });
  }

  // ---------------- geometría ----------------
  function measure(){
    W = stageEl.clientWidth || 800; H = stageEl.clientHeight || 700; mobile = innerWidth <= 900;
    const pad = mobile ? 22 : 56;
    // en móvil las tarjetas de texto cubren la mitad inferior: se dibuja en la mitad superior
    F = {x0:mobile ? 36 : pad, x1:W-pad, y0:mobile ? 70 : 96, y1:mobile ? H*.47 : H-72};
    F.w = F.x1-F.x0; F.h = F.y1-F.y0; F.cx = (F.x0+F.x1)/2; F.cy = (F.y0+F.y1)/2;
  }
  function layoutAll(){
    // cuadrícula ordenada por Δσθ: ya insinúa el orden que el enjambre hará visible
    const byX = nodes.slice().sort((a, b) => a.d.d_front_var-b.d.d_front_var);
    const cols = Math.max(6, Math.round(Math.sqrt(nodes.length*F.w/F.h*.9))), rows = Math.ceil(nodes.length/cols);
    const s = Math.min(F.w/cols, F.h/rows, mobile ? 30 : 46), gx = F.cx-(cols-1)*s/2, gy = F.cy-(rows-1)*s/2;
    byX.forEach((n, i) => { n.grid = {x:gx+(i%cols)*s, y:gy+Math.floor(i/cols)*s}; n.rank = i; });

    // enjambre sobre Δσθ (misma escala x que la dispersión: los puntos solo suben o bajan)
    const ext = d3.extent(EEG, d => d.d_front_var), lim = Math.max(Math.abs(ext[0]), Math.abs(ext[1]))*1.08;
    xs = d3.scaleLinear().domain([-lim, lim]).range([F.x0+8, F.x1-8]);
    const sim = nodes.map(n => ({n, x:xs(n.d.d_front_var), y:F.cy, tx:xs(n.d.d_front_var)}));
    const fs = d3.forceSimulation(sim).force("x", d3.forceX(d => d.tx).strength(1)).force("y", d3.forceY(F.cy).strength(.06))
      .force("c", d3.forceCollide(R0+1.6)).stop();
    for(let i = 0; i < 260; i++) fs.tick();
    sim.forEach(p => swarmPos.set(p.n.d.id, {x:p.x, y:p.y}));

    // dispersión con PVT; sin PVT bajan a una franja inferior (mismo x)
    const pv = EEG.filter(d => d.d_pvt != null), laneY = F.y1-10;
    sy = d3.scaleLinear().domain(d3.extent(pv, d => d.d_pvt)).nice().range([laneY-58, F.y0+18]);
    const lane = nodes.filter(n => n.d.d_pvt == null).map(n => ({n, x:xs(n.d.d_front_var), y:laneY, tx:xs(n.d.d_front_var)}));
    const fl = d3.forceSimulation(lane).force("x", d3.forceX(d => d.tx).strength(1)).force("y", d3.forceY(laneY).strength(.5)).force("c", d3.forceCollide(4.6)).stop();
    for(let i = 0; i < 200; i++) fl.tick();
    lane.forEach(p => scatterPos.set(p.n.d.id, {x:p.x, y:Math.min(p.y, laneY+8), lane:true}));
    nodes.filter(n => n.d.d_pvt != null).forEach(n => scatterPos.set(n.d.id, {x:xs(n.d.d_front_var), y:sy(n.d.d_pvt)}));
    F.laneY = laneY;

    // cabeza
    const Rh = Math.min(F.w, F.h)/2-(mobile ? 14 : 30);
    topoGeo = {cx:F.cx, cy:F.cy+6, R:Rh};
    // serie temporal
    dynGeo = {x:d3.scaleLinear().domain([0, 300]).range([F.x0+34, F.x1-34]), y0:F.y0+10, y1:F.y1-30};
  }

  // ---------------- capas ----------------
  function build(){
    measure(); svg.selectAll("*").remove(); LY = {};
    svg.attr("viewBox", `0 0 ${W} ${H}`);
    const defs = svg.append("defs");
    if(!nodes.length) nodes = EEG.slice().sort((a, b) => d3.ascending(a.id, b.id)).map(d => ({d}));
    layoutAll();
    const layer = k => (LY[k] = svg.append("g").attr("class", "layer").attr("opacity", 0));

    // ---- enjambre ----
    const sw = layer("swarm"), axY = F.cy+Math.max(70, d3.max(nodes, n => Math.abs(swarmPos.get(n.d.id).y-F.cy))+30);
    sw.append("line").attr("x1", F.x0).attr("x2", F.x1).attr("y1", axY).attr("y2", axY).attr("stroke", C.rule2);
    sw.append("g").attr("class", "axis").attr("transform", `translate(0,${axY})`)
      .call(d3.axisBottom(xs).ticks(mobile ? 4 : 6).tickSize(5).tickFormat(L.format("+.2~f"))).call(g => g.select(".domain").remove());
    sw.append("line").attr("x1", xs(0)).attr("x2", xs(0)).attr("y1", F.y0+20).attr("y2", axY).attr("stroke", C.rule2).attr("stroke-dasharray", "2 3");
    sw.append("text").attr("class", "lbl").attr("x", F.x0).attr("y", axY+36).text("← más estable");
    sw.append("text").attr("class", "lbl").attr("x", F.x1).attr("y", axY+36).attr("text-anchor", "end").text("más inestable →");
    sw.append("text").attr("class", "lbl").attr("x", F.cx).attr("y", axY+(mobile ? 54 : 36)).attr("text-anchor", "middle").text("Δσθ frontal, SD − NS");
    const mean = layer("mean"), mx = xs(facts.mean);
    mean.append("line").attr("x1", mx).attr("x2", mx).attr("y1", F.y0+4).attr("y2", axY).attr("stroke", C.ink).attr("stroke-width", 1.25);
    mean.append("text").attr("class", "lbl-ink").attr("x", mx+8).attr("y", F.y0+14).text(`promedio ${fsr(facts.mean)}`);
    const cnt = layer("counts");
    const cy0 = F.y0+(mobile ? 34 : 54);
    cnt.append("text").attr("class", "big").attr("x", F.x0).attr("y", cy0).style("fill", C.ns).text(facts.txt.neg);
    cnt.append("text").attr("class", "lbl").attr("x", F.x0).attr("y", cy0+18).text("más estables");
    cnt.append("text").attr("class", "big").attr("x", F.x1).attr("y", cy0).attr("text-anchor", "end").style("fill", C.sd).text(facts.txt.pos);
    cnt.append("text").attr("class", "lbl").attr("x", F.x1).attr("y", cy0+18).attr("text-anchor", "end").text("más inestables");

    // ---- dispersión ----
    const sc = layer("scatter"), xmedP = xs(facts.xmed), ymedP = sy(facts.ymed), yTop = sy.range()[1], yBot = sy.range()[0];
    sc.append("rect").attr("x", xmedP).attr("y", yTop-6).attr("width", F.x1-xmedP).attr("height", ymedP-yTop+6).attr("fill", "var(--quad)");
    sc.append("g").attr("class", "axis").attr("transform", `translate(${F.x0},0)`)
      .call(d3.axisLeft(sy).ticks(5).tickSize(-(F.w)).tickFormat(L.format("~f")))
      .call(g => { g.select(".domain").remove(); g.selectAll(".tick line").attr("stroke", C.rule); g.selectAll("text").attr("x", -6); });
    sc.append("line").attr("x1", xs(0)).attr("x2", xs(0)).attr("y1", yTop-6).attr("y2", yBot+8).attr("stroke", C.rule2);
    sc.append("line").attr("x1", xmedP).attr("x2", xmedP).attr("y1", yTop-6).attr("y2", yBot+8).attr("class", "median");
    sc.append("line").attr("x1", F.x0).attr("x2", F.x1).attr("y1", ymedP).attr("y2", ymedP).attr("class", "median");
    sc.append("text").attr("class", "lbl").attr("x", F.x0).attr("y", yTop-(mobile ? 30 : 16)).text(mobile ? "Δ PVT (ms) · ↑ más lento" : "Δ tiempo de reacción PVT (ms) · ↑ más lento");
    sc.append("text").attr("class", "lbl").attr("x", F.x1-6).attr("y", yTop+10).attr("text-anchor", "end").style("fill", C.sdText).text(`vulnerables · ${facts.vuln.size}`);
    sc.append("text").attr("class", "lbl-ink").attr("x", mobile ? F.x0 : F.x1).attr("y", yTop-(mobile ? 14 : 16)).attr("text-anchor", mobile ? "start" : "end").text(`${facts.txt.rho} · n = ${facts.rho.n}`);
    sc.append("line").attr("x1", F.x0).attr("x2", F.x1).attr("y1", F.laneY-22).attr("y2", F.laneY-22).attr("stroke", C.rule);
    sc.append("text").attr("class", "lbl").attr("x", F.x0).attr("y", F.laneY-28).text(`sin PVT · ${EEG.length-facts.rho.n}`);
    sc.append("text").attr("class", "lbl").attr("x", F.x1).attr("y", F.laneY+30).attr("text-anchor", "end").text("Δσθ frontal →");

    // ---- cuero cabelludo ----
    const tp = layer("topo"), {cx, cy, R} = topoGeo;
    const clip = defs.append("clipPath").attr("id", "sclip").append("circle").attr("cx", cx).attr("cy", cy).attr("r", R);
    LY.topoClip = clip;
    const pts = ELEC.map(e => ({e, x:COORDS[e][0], y:COORDS[e][1], v:TOPO[e].dVar, t:TOPO[e]}));
    const a = d3.max(pts, p => Math.abs(p.v)), GN = 120, cnv = document.createElement("canvas"); cnv.width = GN; cnv.height = GN;
    const ctx = cnv.getContext("2d"), im = ctx.createImageData(GN, GN), grid = new Float64Array(GN*GN);
    for(let iy = 0; iy < GN; iy++) for(let ix = 0; ix < GN; ix++){
      const ux = -1+(ix+.5)*2/GN, uy = 1-(iy+.5)*2/GN; let num = 0, den = 0;
      for(const p of pts){ const d2 = (ux-p.x)**2+(uy-p.y)**2+1e-9, w = 1/(d2*d2); num += w*p.v; den += w; }
      const val = num/den; grid[iy*GN+ix] = val; const c = d3.rgb(C.div((val+a)/(2*a))), k = (iy*GN+ix)*4;
      im.data[k] = c.r; im.data[k+1] = c.g; im.data[k+2] = c.b; im.data[k+3] = 255;
    }
    ctx.putImageData(im, 0, 0);
    const fieldG = tp.append("g").attr("clip-path", "url(#sclip)");
    fieldG.append("image").attr("href", cnv.toDataURL()).attr("x", cx-R).attr("y", cy-R).attr("width", 2*R).attr("height", 2*R).attr("preserveAspectRatio", "none");
    const proj = d3.geoTransform({point(x, y){ this.stream.point(cx-R+x*2*R/GN, cy-R+y*2*R/GN); }});
    fieldG.append("g").selectAll("path").data(d3.contours().size([GN, GN]).thresholds(d3.ticks(-a, a, 10))(Array.from(grid))).join("path").attr("class", "contour").attr("d", d3.geoPath(proj));
    tp.append("circle").attr("class", "head").attr("cx", cx).attr("cy", cy).attr("r", R);
    tp.append("path").attr("class", "head").attr("d", `M ${cx-12} ${cy-R+2} L ${cx} ${cy-R-14} L ${cx+12} ${cy-R+2}`).attr("stroke-linejoin", "round").attr("fill", "var(--bg)");
    tp.append("path").attr("class", "head").attr("d", `M ${cx-R+1} ${cy-15} C ${cx-R-11} ${cy-13} ${cx-R-11} ${cy+13} ${cx-R+1} ${cy+15}`);
    tp.append("path").attr("class", "head").attr("d", `M ${cx+R-1} ${cy-15} C ${cx+R+11} ${cy-13} ${cx+R+11} ${cy+13} ${cx+R-1} ${cy+15}`);
    tp.append("g").selectAll("circle").data(pts).join("circle").attr("cx", p => cx+p.x*R).attr("cy", p => cy-p.y*R)
      .attr("r", p => p.t.sigVar < .05 ? 5 : 1.8).attr("fill", p => p.t.sigVar < .05 ? "none" : C.ink).attr("fill-opacity", .5)
      .attr("stroke", p => p.t.sigVar < .05 ? C.ink : "none").attr("stroke-width", 1.5);
    tp.append("g").selectAll("text").data(pts.filter(p => p.t.sigVar < .05)).join("text").attr("class", "elabel")
      .attr("x", p => cx+p.x*R).attr("y", p => cy-p.y*R-9).text(p => p.e);
    // barra de color mínima
    const bw = Math.min(220, F.w*.5), bx = cx-bw/2, by = cy+R+(mobile ? 22 : 34), gid = "sgrad";
    const lg = defs.append("linearGradient").attr("id", gid); d3.range(0, 1.001, .25).forEach(t => lg.append("stop").attr("offset", t).attr("stop-color", C.div(t)));
    tp.append("rect").attr("x", bx).attr("y", by).attr("width", bw).attr("height", 6).attr("rx", 3).attr("fill", `url(#${gid})`);
    tp.append("text").attr("class", "lbl").attr("x", bx-8).attr("y", by+6).attr("text-anchor", "end").text("baja");
    tp.append("text").attr("class", "lbl").attr("x", bx+bw+8).attr("y", by+6).text("sube");
    tp.append("text").attr("class", "lbl").attr("x", cx).attr("y", by+22).attr("text-anchor", "middle").text("Δσθ por electrodo, SD − NS");
    // destino de los puntos: el más inestable vuela al electrodo que más sube (transición, no codificación)
    const eByV = pts.slice().sort((p, q) => p.v-q.v), nByX = nodes.slice().sort((p, q) => p.d.d_front_var-q.d.d_front_var);
    nByX.forEach((n, i) => { const e = eByV[Math.round(i*(eByV.length-1)/(nByX.length-1))]; n.elec = {x:cx+e.x*R, y:cy-e.y*R, c:C.div((e.v+a)/(2*a))}; });

    // ---- dinámica: todos ----
    dynLayer("dyn", [
      {k:"NS", s:facts.ns, col:C.ns, w:2, band:true}, {k:"SD", s:facts.sdd, col:C.sd, w:2, band:true},
    ]);
    // ---- dinámica: vulnerables vs resto ----
    dynLayer("vuln", [
      {k:"resto NS", s:facts.rN, col:C.rest, w:1.25, dash:"3 3"}, {k:"resto SD", s:facts.rS, col:C.rest, w:1.25},
      {k:"vuln. NS", s:facts.vN, col:C.ns, w:2, band:true}, {k:"vuln. SD", s:facts.vS, col:C.sd, w:2, band:true},
    ]);
    const x = dynGeo.x;
    nodes.forEach((n, i) => { const ep = Math.round(i*74/(nodes.length-1)), v = facts.sdd.mean[ep]; n.ep = {x:x(ep*4+2), y:LY.dynY(v)}; });

    dotG = svg.append("g");
    dotG.selectAll("circle").data(nodes, n => n.d.id).join("circle").attr("r", R0).attr("fill", C.rest)
      .attr("cx", n => n.grid.x).attr("cy", n => n.grid.y).attr("opacity", 0)
      .on("pointerenter", (e, n) => { if(cur < 1 || cur > 3) return; showTip(e, dotTip(n.d)); })
      .on("pointermove", e => moveTip(e)).on("pointerleave", hideTip);
  }
  function dynLayer(key, series){
    const g = (LY[key] = svg.append("g").attr("class", "layer").attr("opacity", 0)), x = dynGeo.x;
    const vals = series.flatMap(s => s.s.mean.flatMap((v, i) => v == null ? [] : (s.band ? [v-s.s.sem[i], v+s.s.sem[i]] : [v])));
    const [lo, hi] = d3.extent(vals), pad = (hi-lo)*.06, y = d3.scaleLinear().domain([lo-pad, hi+pad]).range([dynGeo.y1, dynGeo.y0]);
    if(key === "dyn") LY.dynY = y;
    g.append("g").attr("class", "axis").attr("transform", `translate(${x.range()[0]-8},0)`).call(d3.axisLeft(y).ticks(4).tickSize(-(x.range()[1]-x.range()[0]+8)).tickFormat(L.format(".2f")))
      .call(a => { a.select(".domain").remove(); a.selectAll(".tick line").attr("stroke", C.rule); });
    g.append("g").attr("class", "axis").attr("transform", `translate(0,${dynGeo.y1+8})`).call(d3.axisBottom(x).tickValues(d3.range(0, 301, 60)).tickSize(4).tickFormat(d => d+" s"))
      .call(a => a.select(".domain").remove());
    g.append("text").attr("class", "lbl").attr("x", x.range()[0]-8).attr("y", dynGeo.y0-14).text("potencia θ frontal · media ± EE");
    const ln = d3.line().defined(v => v != null).x((v, i) => x(i*4+2)).y(v => y(v)).curve(d3.curveMonotoneX);
    const labels = [];
    series.forEach(s => {
      if(s.band) g.append("path").attr("fill", s.col).attr("fill-opacity", .13)
        .attr("d", d3.area().defined(v => v != null).x((v, i) => x(i*4+2)).y0((v, i) => y(v-s.s.sem[i])).y1((v, i) => y(v+s.s.sem[i])).curve(d3.curveMonotoneX)(s.s.mean));
      g.append("path").attr("class", "draw").attr("fill", "none").attr("stroke", s.col).attr("stroke-width", s.w).attr("stroke-dasharray", s.dash || null)
        .attr("data-dash", s.dash || "").attr("d", ln(s.s.mean));
      labels.push({t:s.k, col:s.col, y:y(s.s.mean[74])});
    });
    // etiquetas directas al final de cada serie, separadas para no chocar
    labels.sort((p, q) => p.y-q.y); for(let i = 1; i < labels.length; i++) if(labels[i].y-labels[i-1].y < 13) labels[i].y = labels[i-1].y+13;
    const lx = mobile ? x.range()[1]-4 : x.range()[1]+8;
    g.selectAll("text.end").data(labels).join("text").attr("class", "lbl").attr("x", lx).attr("y", d => d.y+4)
      .attr("text-anchor", mobile ? "end" : "start").style("fill", d => d.col).style("font-weight", 500).text(d => d.t);
  }
  function dotTip(d){
    return `<div class="h">${d.id} <span class="m">· ${d.gender === "F" ? "mujer" : "hombre"}${d.age != null ? ", "+d.age+" años" : ""}</span></div>` +
      trow("Δσθ frontal", fsr(d.d_front_var)) + (d.d_pvt != null ? trow("Δ PVT", fsr(d.d_pvt)+" ms") : trow("PVT", "sin dato"));
  }

  // ---------------- escenas ----------------
  // Cada escena: capas visibles y destino de cada punto {x, y, r, fill, o, fade}
  const SCENES = [
    {layers:[], dot:n => ({x:n.grid.x, y:n.grid.y, r:R0, fill:C.rest, o:.9})},
    {layers:["swarm", "mean"], dot:n => ({...swarmPos.get(n.d.id), r:R0, fill:C.rest, o:.9})},
    {layers:["swarm", "mean", "counts"], dot:n => ({...swarmPos.get(n.d.id), r:R0, fill:n.d.d_front_var > 0 ? C.sd : C.ns, o:.92})},
    {layers:["scatter"], dot:n => { const p = scatterPos.get(n.d.id), v = facts.vuln.has(n.d.id);
      return {x:p.x, y:p.y, r:p.lane ? 3.5 : R0, fill:v ? C.sd : C.rest, o:p.lane ? .4 : .92}; }},
    {layers:["topo"], reveal:"topo", dot:n => ({x:n.elec.x, y:n.elec.y, r:3, fill:n.elec.c, o:.95, fade:true})},
    {layers:["dyn"], draw:"dyn", dot:n => ({x:n.ep.x, y:n.ep.y, r:2.5, fill:C.sd, o:.9, fade:true})},
    {layers:["vuln"], draw:"vuln", dot:n => ({x:n.ep.x, y:n.ep.y, r:2, fill:facts.vuln.has(n.d.id) ? C.sd : C.rest, o:0})},
  ];
  const LAYERS = ["swarm", "mean", "counts", "scatter", "topo", "dyn", "vuln"];

  function go(i, instant = false){
    if(!dotG) return;
    const sc = SCENES[i], prev = cur; cur = i;
    const anim = !instant && !REDUCE;
    LAYERS.forEach(k => {
      const on = sc.layers.includes(k), was = prev >= 0 && SCENES[prev].layers.includes(k);
      const t = LY[k].interrupt().transition().duration(instant ? 0 : (on ? 500 : 250)).ease(EASE_OUT).delay(on && anim && !was ? T_STORY*.45 : 0);
      t.attr("opacity", on ? 1 : 0);
    });
    // momento de autor 1: el cuero cabelludo se abre desde el centro (clip-path radial)
    if(sc.reveal === "topo" && prev !== i){
      LY.topoClip.interrupt().attr("r", anim ? 0 : topoGeo.R).transition().delay(anim ? T_STORY*.5 : 0).duration(anim ? 1100 : 0).ease(EASE_OUT).attr("r", topoGeo.R);
    }
    // momento de autor 2: las series se dibujan de izquierda a derecha
    if(sc.draw && prev !== i){
      LY[sc.draw].selectAll("path.draw").each(function(){
        const p = d3.select(this), len = this.getTotalLength(), dash = p.attr("data-dash");
        if(!anim){ p.attr("stroke-dasharray", dash || null).attr("stroke-dashoffset", null); return; }
        p.interrupt().attr("stroke-dasharray", `${len} ${len}`).attr("stroke-dashoffset", len)
          .transition().delay(T_STORY*.4).duration(1600).ease(EASE_OUT).attr("stroke-dashoffset", 0)
          .on("end", function(){ d3.select(this).attr("stroke-dasharray", dash || null).attr("stroke-dashoffset", null); });
      });
    }
    const circles = dotG.selectAll("circle").style("pointer-events", i >= 1 && i <= 3 ? "auto" : "none");
    circles.interrupt();
    if(instant){
      circles.each(function(n){ const t = sc.dot(n); d3.select(this).attr("cx", t.x).attr("cy", t.y).attr("r", t.r).attr("fill", t.fill).attr("opacity", t.fade ? 0 : t.o); });
      return;
    }
    if(REDUCE){
      // sin viaje: fundido de salida, reubicación, fundido de entrada
      circles.transition().duration(150).attr("opacity", 0)
        .transition().duration(0).attr("cx", n => sc.dot(n).x).attr("cy", n => sc.dot(n).y).attr("r", n => sc.dot(n).r).attr("fill", n => sc.dot(n).fill)
        .transition().duration(220).attr("opacity", n => sc.dot(n).fade ? 0 : sc.dot(n).o);
      return;
    }
    const first = prev < 0;
    circles.each(function(n){
      const t = sc.dot(n), sel = d3.select(this);
      const delay = first ? 200+n.rank*14 : Math.min(n.rank*5, 340);
      let tr = sel.transition().delay(delay).duration(first ? 700 : T_STORY).ease(first ? EASE_OUT : EASE_IN_OUT)
        .attr("cx", t.x).attr("cy", t.y).attr("r", t.r).attr("fill", t.fill).attr("opacity", t.o);
      if(t.fade) tr.transition().delay(220).duration(420).ease(EASE_OUT).attr("opacity", 0);
    });
  }

  function init(){
    facts = computeFacts(); fillText(); build();
    // primera escena: los puntos llegan desde el centro, una sola vez (presupuesto de deleite: primera visita)
    dotG.selectAll("circle").attr("cx", () => F.cx+(Math.random()-.5)*40).attr("cy", () => F.cy+(Math.random()-.5)*40).attr("r", 3);
    go(0);
    const steps = [...document.querySelectorAll(".step")];
    const io = new IntersectionObserver(es => es.forEach(e => {
      if(!e.isIntersecting) return;
      steps.forEach(s => s.classList.toggle("on", s === e.target));
      const k = +e.target.dataset.scene; if(k !== cur) go(k);
    }), {rootMargin:"-50% 0px -50% 0px", threshold:0});
    steps.forEach(s => io.observe(s));
    steps[0].classList.add("on");
  }
  function resize(){ if(!facts) return; const c = Math.max(cur, 0); cur = -1; build(); go(c, true); }
  return {init, resize, go};
})();
