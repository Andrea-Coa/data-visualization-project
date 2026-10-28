/* Individuos (tareas T3, T4 y T7): panel flotante que se desliza sobre la columna izquierda, en la misma vista que
   la matriz de mapas. Quita el promedio y muestra a cada persona.
   Heatmap persona × electrodo con dos grupos definidos solo por la conducta, nunca por theta (si el grupo dependiera
   de theta, su firma en theta sería circular): quienes se deterioran (peor que la mediana del marcador del header)
   frente a quienes resisten. Con Comparar, los dos grupos de la comparación; con lazo, tu selección frente al resto
   con marcador. Quien no tiene el marcador no puede clasificarse y no responde a la pregunta, así que no se muestra.
   Columnas = 61 electrodos por región, de adelante hacia atrás. Celda = Δ (SD − NS) de la métrica del header.
   Cada bloque lleva su franja C(e) = proporción del grupo que sube menos la que baja.
   Grafo: cada persona se une a las 3 cuyo patrón de Δ en los 61 electrodos más se le parece (Pearson). Los nodos se
   arrastran y quedan donde se sueltan; la rueda acerca; "Agrupar" separa los grupos con su envolvente.
   No es conectividad funcional: compara patrones de cambio entre personas, no señales entre electrodos. */
const indiv = (() => {
  const heatEl = $("heat"), graphEl = $("graph"), K = 3;
  const FRONTAL = ["Fp1", "Fp2", "Fpz", "AF3", "AF4", "AF7", "AF8", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "Fz"];
  const CT = ["FC1", "FC2", "FC3", "FC4", "FC5", "FC6", "FT7", "FT8", "C1", "C2", "C3", "C4", "C5", "C6", "Cz", "T7", "T8",
    "CP1", "CP2", "CP3", "CP4", "CP5", "CP6", "CPz", "TP7", "TP8", "TP9", "TP10"];
  const REG = ["Frontal", "Centro-temporal", "Posterior"];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let model = null, hv = {row:null, col:null}, grouped = false, sim = null, zoomT = d3.zoomIdentity;
  const posMem = new Map();   // posiciones de los nodos entre redibujos; fixed = soltado a mano

  const isOpen = () => $("drawer").classList.contains("open");
  const regionOf = e => FRONTAL.includes(e) ? 0 : (CT.includes(e) ? 1 : 2);
  const electrodes = () => ELEC.slice().sort((a, b) => regionOf(a)-regionOf(b) || COORDS[b][1]-COORDS[a][1] || COORDS[a][0]-COORDS[b][0]);
  const short = id => id.replace("sub-", "S");
  const fs2 = L.format("+.2f");

  function build(){
    const met = S.met, E = electrodes(), all = EEG_IDS.filter(id => SUBTOPO[id]), byId = new Map(P.map(d => [d.id, d]));
    const D = new Map(all.map(id => [id, E.map(e => { const t = SUBTOPO[id][e]; return t ? (met === "var" ? t.dVar : t.dMean) : null; })]));
    const roiIdx = E.map((e, i) => regionOf(e) === (S.roi === "front" ? 0 : 1) ? i : -1).filter(i => i >= 0);
    const rowMean = id => d3.mean(roiIdx, i => D.get(id)[i]);
    const G = cmpGroups(), yk = yK(), mk = mkY(), withY = all.filter(id => byId.get(id) && byId.get(id)[yk] != null);
    let groups;
    if(G) groups = G.map(g => ({name:g.name, color:g.color, ids:g.ids.filter(id => D.has(id))}));
    else if(S.selected){ const sel = new Set(S.selected);
      groups = [{name:"Tu selección", color:C.ns, ids:all.filter(id => sel.has(id))}, {name:"Resto con marcador", color:C.rest, ids:withY.filter(id => !sel.has(id))}]; }
    else { const w = mk.worse || 1, med = d3.median(withY, id => byId.get(id)[yk]), worse = id => w*(byId.get(id)[yk]-med) > 0;
      groups = [{name:"Vulnerables", color:C.vuln, ids:withY.filter(worse)}, {name:"Resistentes", color:C.rest, ids:withY.filter(id => !worse(id))}]; }
    groups = groups.filter(g => g.ids.length).map(g => {
      const ids = g.ids.slice().sort((a, b) => rowMean(b)-rowMean(a));
      const cons = E.map((e, i) => { const v = ids.map(id => D.get(id)[i]).filter(x => x != null); return v.length ? (v.filter(x => x > 0).length-v.filter(x => x < 0).length)/v.length : 0; });
      return {...g, ids, cons};
    });
    const ids = groups.flatMap(g => g.ids), abs = ids.flatMap(id => D.get(id)).filter(v => v != null).map(Math.abs).sort(d3.ascending);
    // similitud entre personas: Pearson de sus patrones de Δ; cada una se une a sus K vecinos más parecidos
    const R = new Map(ids.map(a => [a, new Map()]));
    ids.forEach((a, i) => ids.slice(i+1).forEach(b => {
      const x = D.get(a), y = D.get(b), k = x.map((v, j) => v != null && y[j] != null ? j : -1).filter(j => j >= 0), r = pearson(k.map(j => x[j]), k.map(j => y[j]));
      R.get(a).set(b, r); R.get(b).set(a, r);
    }));
    const nbrs = new Map(ids.map(a => [a, [...R.get(a)].sort((u, v) => v[1]-u[1]).slice(0, K)]));
    model = {met, E, D, groups, ids, mk, R, nbrs, lim:d3.quantile(abs, .95) || 1, mean:E.map((e, i) => d3.mean(ids, id => D.get(id)[i]))};
  }

  // ---------------- heatmap ----------------
  function drawHeat(){
    d3.select(heatEl).selectAll("*").remove();
    const W = heatEl.clientWidth || 640, H = Math.max(240, heatEl.clientHeight || 400), {E, D, groups, lim, mean} = model;
    const gW = 16, labW = 44+gW, regGap = 5, top0 = 34, cS = 18, gGap = 6, nRows = model.ids.length;
    const cw = (W-labW-2*regGap-2)/E.length;
    const rh = Math.min(22, Math.max(3, (H-top0-groups.length*cS-(groups.length-1)*gGap-2)/nRows));
    const colX = i => labW+i*cw+regionOf(E[i])*regGap;
    const svg = d3.select(heatEl).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("height", H).style("height", H+"px").attr("role", "img")
      .attr("aria-label", `Heatmap de ${nRows} personas por 61 electrodos con su cambio ${METN[model.met]}`);
    const col = v => v == null ? "transparent" : C.div((Math.max(-lim, Math.min(lim, v))+lim)/(2*lim));
    const bars = (y0, cons) => svg.append("g").selectAll("rect").data(cons).join("rect").attr("x", (c, i) => colX(i)+.5).attr("width", Math.max(1, cw-1))
      .attr("y", c => c >= 0 ? y0-c*(cS/2-1) : y0).attr("height", c => Math.max(.6, Math.abs(c)*(cS/2-1)))
      .attr("fill", c => c >= 0 ? C.sd : C.ns).attr("opacity", c => .3+.7*Math.abs(c));
    REG.forEach((r, k) => {
      const idx = E.map((e, i) => regionOf(e) === k ? i : -1).filter(i => i >= 0), x0 = colX(idx[0]), x1 = colX(idx[idx.length-1])+cw;
      svg.append("text").attr("class", "colhead").attr("x", (x0+x1)/2).attr("y", 11).text(r).append("tspan").attr("class", "m").text(` · ${idx.length}`);
      svg.append("line").attr("x1", x0).attr("x2", x1).attr("y1", 16).attr("y2", 16).attr("stroke", k === (S.roi === "front" ? 0 : 1) ? C.ink : C.rule2).attr("stroke-width", 1.5);
    });
    svg.append("text").attr("class", "alab").attr("x", labW-5).attr("y", 29).attr("text-anchor", "end").text("media");
    svg.append("g").selectAll("rect").data(mean).join("rect").attr("x", (v, i) => colX(i)).attr("width", cw+.3).attr("y", 21).attr("height", 9).attr("fill", col);
    const cells = svg.append("g"); let y = top0; model.rowY = new Map();
    groups.forEach((g, gi) => {
      if(gi){ y += gGap; svg.append("line").attr("x1", 2).attr("x2", W-2).attr("y1", y-gGap/2).attr("y2", y-gGap/2).attr("stroke", C.ink2).attr("stroke-width", 1.5); }
      // nombre del grupo a la izquierda de su bloque, rotado 90° a la izquierda y centrado en su alto
      const gy = y+(cS+g.ids.length*rh)/2;
      svg.append("text").attr("class", "mdim").attr("x", gW/2).attr("y", gy).attr("dy", ".35em").attr("text-anchor", "middle")
        .attr("transform", `rotate(-90,${gW/2},${gy})`).style("fill", g.color).text(`${g.name} (${g.ids.length})`);
      svg.append("text").attr("class", "alab").attr("x", labW-5).attr("y", y+cS/2+3.5).attr("text-anchor", "end").text("C(e)");
      svg.append("line").attr("x1", labW).attr("x2", W-2).attr("y1", y+cS/2).attr("y2", y+cS/2).attr("stroke", C.rule2);
      bars(y+cS/2, g.cons); y += cS;
      g.ids.forEach(id => {
        model.rowY.set(id, y);
        cells.append("g").selectAll("rect").data(D.get(id)).join("rect").attr("x", (v, i) => colX(i)).attr("y", y).attr("width", cw+.3).attr("height", rh+.3).attr("fill", col);
        if(rh >= 7) svg.append("text").attr("class", "alab").attr("x", labW-5).attr("y", y+rh/2+3).attr("text-anchor", "end").style("font-size", Math.min(10, rh+1.5)+"px").text(short(id));
        y += rh;
      });
    });
    model.geo = {labW, top0, cw, rh, colX, W, H, bottom:y};
    model.over = svg.append("g").style("pointer-events", "none");
    svg.append("rect").attr("x", labW).attr("width", W-labW).attr("height", H).attr("fill", "transparent").style("cursor", "pointer")
      .on("pointermove", ev => { const h = hit(d3.pointer(ev, svg.node())); setHover(h.row, h.col); if(h.row || h.col != null) showTip(ev, tipHeat(h)); else hideTip(); })
      .on("pointerleave", () => { setHover(null, null); hideTip(); })
      .on("click", ev => { const h = hit(d3.pointer(ev, svg.node())); hideTip(); if(h.row) pin(P.find(d => d.id === h.row)); else if(h.col != null) setElec(model.E[h.col]); });
    paintHeat();
  }
  function hit([px, py]){
    const {colX, cw, rh, bottom} = model.geo; let col = null, row = null;
    model.E.forEach((e, i) => { if(px >= colX(i) && px < colX(i)+cw) col = i; });
    model.rowY.forEach((y, id) => { if(py >= y && py < y+rh) row = id; });
    return {row, col:py <= bottom ? col : null};
  }
  function tipHeat(h){
    const e = h.col != null ? model.E[h.col] : null;
    if(!h.row) return `<div class="h">${e} <span class="m">${REG[regionOf(e)]}</span></div>` +
      model.groups.map(g => trow(`C(e) ${g.name.toLowerCase()}`, fs2(g.cons[h.col]), g.color)).join("") + trow(`Δ${METN[model.met]} medio`, fsr(model.mean[h.col]));
    const p = P.find(d => d.id === h.row), t = e && SUBTOPO[h.row][e], g = model.groups.find(g => g.ids.includes(h.row)), yk = yK();
    return `<div class="h">${h.row}${e ? ` · ${e}` : ""} <span class="m">${g ? g.name.toLowerCase() : ""}</span></div>` +
      (t ? trow("NS → SD", `${fr(t.NS[model.met])} → ${fr(t.SD[model.met])}`) + trow(`Δ${METN[model.met]}`, fsr(model.D.get(h.row)[h.col])) : "") +
      (p && p[yk] != null ? trow(model.mk.ax2, fsr(p[yk])) : "");
  }
  function setHover(row, col){
    if(hv.row === row && hv.col === col) return;
    hv = {row, col}; paintHeat(); paintGraph();
    if((S.hovered && S.hovered.id) !== row) hover(row ? P.find(d => d.id === row) : null);
  }
  function paintHeat(){
    if(!model || !model.over) return;
    const {colX, cw, rh, W, labW, bottom} = model.geo, o = model.over; o.selectAll("*").remove();
    const ring = (id, w) => { const y = model.rowY.get(id); if(y == null) return; o.append("rect").attr("x", labW-1).attr("y", y-.5).attr("width", W-labW-1).attr("height", rh+1).attr("fill", "none").attr("stroke", C.ink).attr("stroke-width", w); };
    if(hv.row) ring(hv.row, 1.2);
    S.pair.forEach((d, i) => { ring(d.id, 2); const y = model.rowY.get(d.id); if(y != null) o.append("text").attr("class", "ab").attr("x", 3).attr("y", y+rh/2+4).style("font-size", "10px").text("AB"[i]); });
    const colRing = (i, c) => o.append("rect").attr("x", colX(i)-.5).attr("y", 18).attr("width", cw+1).attr("height", bottom-17).attr("fill", "none").attr("stroke", c).attr("stroke-width", 1.2);
    if(hv.col != null) colRing(hv.col, C.ink);
    if(S.elec){ const i = model.E.indexOf(S.elec); if(i >= 0) colRing(i, C.vuln); }
  }

  // ---------------- grafo de similitud (arrastrable) ----------------
  function drawGraph(){
    if(sim) sim.stop();
    d3.select(graphEl).selectAll("*").remove();
    const W = graphEl.clientWidth || 500, H = Math.max(220, graphEl.clientHeight || 360), {groups, ids, nbrs} = model;
    const gOf = new Map(); groups.forEach((g, gi) => g.ids.forEach(id => gOf.set(id, gi)));
    const seen = new Map();
    ids.forEach(a => nbrs.get(a).forEach(([b, r]) => { const k = a < b ? a+"|"+b : b+"|"+a; if(!seen.has(k)) seen.set(k, {source:a, target:b, r}); }));
    const links = [...seen.values()], adj = new Map(ids.map(a => [a, new Set()]));
    links.forEach(l => { adj.get(l.source).add(l.target); adj.get(l.target).add(l.source); });
    // sin posición previa, cada nodo arranca en una espiral centrada en el panel (determinista, sin azar)
    const nodes = ids.map((id, i) => { const m = posMem.get(id), n = {id, g:gOf.get(id)}, a = i*Math.PI*(3-Math.sqrt(5)), r = 9*Math.sqrt(i+.5);
      if(m){ n.x = m.x; n.y = m.y; if(m.fixed){ n.fx = m.x; n.fy = m.y; } } else { n.x = W/2+r*Math.cos(a)*1.6; n.y = H/2+r*Math.sin(a)*.8; } return n; });
    const byId = new Map(nodes.map(n => [n.id, n]));

    const svg = d3.select(graphEl).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("height", H).style("height", H+"px").attr("role", "img")
      .attr("aria-label", `Grafo de similitud entre ${ids.length} personas: cada una unida a las ${K} con el patrón de cambio más parecido`);
    const root = svg.append("g").attr("transform", zoomT);
    const hullG = root.append("g"), linkG = root.append("g"), nodeG = root.append("g"), labG = root.append("g"), over = root.append("g").style("pointer-events", "none");
    const zoom = d3.zoom().scaleExtent([.6, 4]).filter(ev => (!ev.button || ev.type === "wheel") && ev.type !== "dblclick")
      .on("zoom", ev => { zoomT = ev.transform; root.attr("transform", zoomT); });
    svg.call(zoom).call(zoom.transform, zoomT);

    const rExt = d3.extent(links, l => l.r), same = l => l.source.g === l.target.g;
    const cx = g => grouped && groups.length > 1 ? W*(g ? .7 : .3) : W/2;
    sim = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(l => 30+70*(1-Math.max(0, l.r))).strength(l => grouped && !same(l) ? .03 : .3))
      .force("charge", d3.forceManyBody().strength(-Math.max(40, Math.min(320, W*H/(ids.length*18)))).distanceMax(Math.max(W, H)*.6))
      .force("collide", d3.forceCollide(ids.length <= 40 ? 13 : 8))
      .force("x", d3.forceX(d => cx(d.g)).strength(grouped ? .14 : .035))
      .force("y", d3.forceY(H/2).strength(.1*Math.min(1.6, W/H)))
      .alpha(posMem.size ? .3 : 1).alphaDecay(.04);
    const edge = linkG.selectAll("line").data(links).join("line")
      .attr("stroke", l => same(l) ? groups[l.source.g].color : C.ink2).attr("stroke-width", l => same(l) ? 1.6 : 1)
      .attr("stroke-opacity", l => same(l) ? .7 : .1+.35*((l.r-rExt[0])/((rExt[1]-rExt[0]) || 1)));
    const dot = nodeG.selectAll("circle").data(nodes).join("circle").attr("r", 6).attr("fill", d => groups[d.g].color).attr("stroke", C.panel).attr("stroke-width", 1.5).style("cursor", "grab");
    const lab = ids.length <= 40 ? labG.selectAll("text").data(nodes).join("text").attr("class", "glab").text(d => short(d.id)) : null;
    const tag = grouped && groups.length > 1 ? labG.selectAll("text.gtag").data(groups).join("text").attr("class", "mdim gtag").attr("text-anchor", "middle").style("fill", g => g.color).text(g => `${g.name.toUpperCase()} · ${g.ids.length}`) : null;
    const clampN = d => { d.x = Math.max(8, Math.min(W-8, d.x)); d.y = Math.max(8, Math.min(H-8, d.y)); };
    function ticked(){
      nodes.forEach(clampN);
      edge.attr("x1", l => l.source.x).attr("y1", l => l.source.y).attr("x2", l => l.target.x).attr("y2", l => l.target.y);
      dot.attr("cx", d => d.x).attr("cy", d => d.y);
      if(lab) lab.attr("x", d => d.x+8).attr("y", d => d.y+3);
      if(tag){
        hullG.selectAll("path").data(groups).join("path").attr("fill", g => g.color).attr("stroke", g => g.color).attr("fill-opacity", .06).attr("stroke-opacity", .06)
          .attr("stroke-width", 34).attr("stroke-linejoin", "round").attr("stroke-linecap", "round")
          .attr("d", (g, gi) => { const pts = nodes.filter(n => n.g === gi).map(n => [n.x, n.y]), h = pts.length >= 3 ? d3.polygonHull(pts) : pts; return h && h.length ? `M${h.join("L")}Z` : null; });
        tag.attr("x", (g, gi) => d3.mean(nodes.filter(n => n.g === gi), n => n.x)).attr("y", (g, gi) => Math.max(12, d3.min(nodes.filter(n => n.g === gi), n => n.y)-22));
      } else hullG.selectAll("path").remove();
      drawOver();
      nodes.forEach(n => { const m = posMem.get(n.id); posMem.set(n.id, {x:n.x, y:n.y, fixed:!!(m && m.fixed)}); });
    }
    function drawOver(){
      over.selectAll("*").remove();
      const f = hv.row && byId.get(hv.row);
      if(f) over.append("circle").attr("cx", f.x).attr("cy", f.y).attr("r", 9.5).attr("fill", "none").attr("stroke", C.ink).attr("stroke-width", 1.5);
      S.pair.forEach((d, i) => { const n = byId.get(d.id); if(!n) return;
        over.append("circle").attr("cx", n.x).attr("cy", n.y).attr("r", 10).attr("fill", "none").attr("stroke", C.ink).attr("stroke-width", 2);
        over.append("text").attr("class", "ab").attr("x", n.x-12).attr("y", n.y-9).attr("text-anchor", "end").text("AB"[i]); });
    }
    model.g = {adj, links, dot, edge, lab, drawOver, same};
    sim.on("tick", ticked);
    if(reduce){ sim.stop(); for(let i = 0; i < 300; i++) sim.tick(); ticked(); }
    const drag = d3.drag().clickDistance(4)
      .on("start", (ev, d) => { if(!ev.active && !reduce) sim.alphaTarget(.25).restart(); d.fx = d.x; d.fy = d.y; dot.filter(n => n === d).style("cursor", "grabbing"); hideTip(); })
      .on("drag", (ev, d) => { d.fx = ev.x; d.fy = ev.y; if(reduce){ d.x = ev.x; d.y = ev.y; ticked(); } })
      .on("end", (ev, d) => { if(!ev.active && !reduce) sim.alphaTarget(0); posMem.set(d.id, {x:d.fx, y:d.fy, fixed:true}); dot.filter(n => n === d).style("cursor", "grab"); });
    dot.call(drag)
      .on("pointerenter", (ev, d) => { setHover(d.id, null); showTip(ev, tipNode(d.id)); })
      .on("pointermove", ev => moveTip(ev))
      .on("pointerleave", () => { setHover(null, null); hideTip(); })
      .on("click", (ev, d) => { hideTip(); pin(P.find(p => p.id === d.id)); });
    paintGraph();
  }
  function tipNode(id){
    const g = model.groups.find(g => g.ids.includes(id));
    return `<div class="h">${id} <span class="m">${g ? g.name.toLowerCase() : ""}</span></div>` + model.nbrs.get(id).map(([b, r]) => trow(b, `r = ${f2(r)}`)).join("");
  }
  function paintGraph(){
    if(!model || !model.g) return;
    const {dot, edge, lab, adj, drawOver, same} = model.g, f = hv.row, near = f ? adj.get(f) : null;
    const on = id => !f || id === f || (near && near.has(id));
    dot.attr("opacity", d => on(d.id) ? 1 : .22);
    if(lab) lab.attr("opacity", d => on(d.id) ? 1 : .2);
    edge.attr("display", l => !f || l.source.id === f || l.target.id === f ? null : "none")
      .attr("stroke", l => f && (l.source.id === f || l.target.id === f) ? C.ink : (same(l) ? model.groups[l.source.g].color : C.ink2));
    drawOver();
  }

  // ---------------- títulos ----------------
  function titles(){
    const [a, b] = model.groups, mC = g => d3.mean(g.cons), strong = g => g.cons.filter(c => Math.abs(c) >= .6).length;
    const hInfo = notes(`Una fila por persona y una columna por electrodo: Δ${METN[model.met]} (SD − NS). Fila "media": promedio de todas las personas.`,
      "C(e): proporción del grupo cuyo Δ sube menos la proporción cuyo Δ baja en el electrodo e (de −1 a +1).",
      "Vulnerables y resistentes se definen solo por la conducta (peor o no que la mediana del cambio en el marcador elegido), no por theta.");
    if(b){
      const dA = mC(a), dB = mC(b);
      setTitle("t-heat", "Δθ por persona y electrodo", nb(`C medio: ${a.name} ${fs2(dA)}, ${b.name} ${fs2(dB)}`), hInfo);
    } else setTitle("t-heat", "Δθ por persona y electrodo", nb(`${a.name}: |C| ≥ 0.6 en ${strong(a)} de 61, n = ${a.ids.length}`), hInfo);
    d3.select("#k-heat").html(`<span class="k">Δ${METN[model.met]} SD − NS</span><span class="k"><i style="width:64px;height:7px;border-radius:2px;background:linear-gradient(90deg,${d3.range(0, 1.01, .25).map(C.div).join(",")})"></i>±${fr(model.lim)}</span>`);
    // de los K vecinos de cada persona del primer grupo, cuántos son de su grupo; por azar se esperarían K·(n−1)/(N−1)
    const N = model.ids.length, nbIn = d3.sum(a.ids, x => model.nbrs.get(x).filter(([y]) => a.ids.includes(y)).length);
    const expct = a.ids.length*K*(a.ids.length-1)/Math.max(1, N-1);
    setTitle("t-graph", "Grafo de similitud de Δθ",
      b ? nb(`${a.name}: ${nbIn}/${a.ids.length*K} vecinos de su grupo, azar ≈ ${L.format(".0f")(expct)}`) : `${a.ids.length} personas`,
      notes(`Cada persona se une a las ${K} cuyo patrón de Δ en los 61 electrodos más se le parece (correlación de Pearson).`,
        "Compara patrones entre personas; no es conectividad funcional entre electrodos.",
        "Los nodos se arrastran; la rueda acerca; Agrupar separa los grupos."));
    d3.select("#k-graph").html(model.groups.map(g => `<span class="k"><i class="dot" style="background:${g.color}"></i>${g.name}</span>`).join(""));
  }
  function render(){
    if(!isOpen()) return;
    build(); titles(); drawHeat(); drawGraph();
  }
  function setGrouped(v){ grouped = v; posMem.forEach(m => { m.fixed = false; }); render(); }
  function release(){ posMem.clear(); zoomT = d3.zoomIdentity; }
  function stop(){ if(sim) sim.stop(); }
  bus.on("pin.indiv", () => { paintHeat(); paintGraph(); });
  bus.on("hover.indiv", d => { const id = d ? d.id : null; if(hv.row !== id){ hv.row = id; paintHeat(); paintGraph(); } });
  bus.on("select.indiv", e => { if(!(e && e.live)) render(); });
  bus.on("axes.indiv", () => render());
  return {render, setGrouped, release, stop};
})();
