/* Similarity between people (Validation Panel, task T4: do the vulnerable people resemble each other?).
   Each person is joined to the 3 people whose pattern of change (Δ of the header metric over the 61 electrodes) is most
   alike (Pearson r). Groups come from behavior only (worse than the median of the header marker vs. the rest), never from
   theta, so a vulnerable cluster could not be produced by construction.
   Two layouts, with an animated switch between them:
   - "On scatter" (default): every person sits where they are in the Vulnerability View (same axes, same quadrant), and
     the similarity links are drawn over it, so the network is read against the main chart.
   - "Network": a force layout by similarity. Nodes can be dragged; the wheel zooms; "Group" pulls the two groups apart.
   It follows the playback and any time window chosen on the Time View (the similarity is recomputed for that window),
   and hovering or clicking a person acts on every other view. It does not show functional connectivity: it compares
   patterns of change between people, not signals between electrodes. */
const simg = (() => {
  const el = $("graph"), K = 3;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let model = null, sim = null, mode = "scatter", grouped = false, zoomT = d3.zoomIdentity, hv = null, fw = null;
  const posMem = new Map();   // node positions between redraws (start of the next animation); fixed = dropped by hand
  const short = id => id.replace("sub-", "S");
  const isOpen = () => el.closest(".sec").dataset.open === "true";

  function build(){
    const met = S.met, E = electrodes(), all = EEG_IDS.filter(id => SUBTOPO[id]), byId = new Map(P.map(d => [d.id, d]));
    // during playback or with a window chosen on the Time View, similarity uses the Δ of that window
    const src = id => fw ? topo.winOne(id, fw) : SUBTOPO[id];
    const D = new Map(all.map(id => { const w = src(id); return [id, E.map(e => { const t = w && w[e]; return t ? (met === "var" ? t.dVar : t.dMean) : null; })]; }));
    const G = cmpGroups(), yk = yK(), mk = mkY(), withY = all.filter(id => byId.get(id) && byId.get(id)[yk] != null);
    let groups;
    if(G) groups = G.map(g => ({name:g.name, color:g.color, ids:g.ids.filter(id => D.has(id))}));
    else { const w = mk.worse || 1, med = d3.median(withY, id => byId.get(id)[yk]), worse = id => w*(byId.get(id)[yk]-med) > 0;
      groups = [{name:"Vulnerable", color:C.vuln, ids:withY.filter(worse)}, {name:"Resilient", color:C.rest, ids:withY.filter(id => !worse(id))}]; }
    groups = groups.filter(g => g.ids.length);
    const ids = groups.flatMap(g => g.ids);
    const R = new Map(ids.map(a => [a, new Map()]));
    ids.forEach((a, i) => ids.slice(i+1).forEach(b => {
      const x = D.get(a), y = D.get(b), k = x.map((v, j) => v != null && y[j] != null ? j : -1).filter(j => j >= 0), r = pearson(k.map(j => x[j]), k.map(j => y[j]));
      R.get(a).set(b, r); R.get(b).set(a, r);
    }));
    const nbrs = new Map(ids.map(a => [a, [...R.get(a)].sort((u, v) => v[1]-u[1]).slice(0, K)]));
    model = {met, groups, ids, R, nbrs, mk, byId};
  }

  function draw(){
    if(sim) sim.stop();
    d3.select(el).selectAll("*").remove();
    const W = el.clientWidth || 300, H = Math.max(260, el.clientHeight || 360), {groups, ids, nbrs, mk, byId: P_} = model;
    const scat = mode === "scatter", m = {l:40, r:12, t:12, b:34}, xk = S.xKey(), yk = yK();
    const gOf = new Map(); groups.forEach((g, gi) => g.ids.forEach(id => gOf.set(id, gi)));
    // scatter targets: the same coordinates as the Vulnerability View
    const xv = ids.map(id => P_.get(id)[xk]).filter(v => v != null), yv = ids.map(id => P_.get(id)[yk]).filter(v => v != null);
    const sx = d3.scaleLinear().domain(d3.extent(xv)).nice().range([m.l, W-m.r]), sy = d3.scaleLinear().domain(d3.extent(yv)).nice().range([H-m.b, m.t]);
    const target = id => { const d = P_.get(id); return {x:d[xk] != null ? sx(d[xk]) : W/2, y:d[yk] != null ? sy(d[yk]) : H/2}; };
    const seen = new Map();
    ids.forEach(a => nbrs.get(a).forEach(([b, r]) => { const k = a < b ? a+"|"+b : b+"|"+a; if(!seen.has(k)) seen.set(k, {a, b, r}); }));
    const adj = new Map(ids.map(a => [a, new Set()]));
    seen.forEach(l => { adj.get(l.a).add(l.b); adj.get(l.b).add(l.a); });
    // start of the animation: where each person was; no memory = a deterministic spiral at the center
    const nodes = ids.map((id, i) => { const mm = posMem.get(id), n = {id, g:gOf.get(id)}, a = i*Math.PI*(3-Math.sqrt(5)), r = 9*Math.sqrt(i+.5);
      if(mm){ n.x = mm.x; n.y = mm.y; if(!scat && mm.fixed){ n.fx = mm.x; n.fy = mm.y; } } else { n.x = W/2+r*Math.cos(a)*1.6; n.y = H/2+r*Math.sin(a)*.8; } return n; });
    const byNode = new Map(nodes.map(n => [n.id, n]));
    const links = [...seen.values()].map(l => ({source:byNode.get(l.a), target:byNode.get(l.b), r:l.r}));

    const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("height", H).style("height", H+"px").attr("role", "img")
      .attr("aria-label", `Similarity graph of ${ids.length} people: each one joined to the ${K} with the most alike pattern of change`);
    const root = svg.append("g");
    const axG = root.append("g"), hullG = root.append("g"), linkG = root.append("g"), nodeG = root.append("g"), over = root.append("g").style("pointer-events", "none");
    if(!scat){
      root.attr("transform", zoomT);
      const zoom = d3.zoom().scaleExtent([.6, 4]).filter(ev => (!ev.button || ev.type === "wheel") && ev.type !== "dblclick")
        .on("zoom", ev => { zoomT = ev.transform; root.attr("transform", zoomT); });
      svg.call(zoom).call(zoom.transform, zoomT);
    } else zoomT = d3.zoomIdentity;

    // scatter frame: axes, medians and the vulnerable quadrant, as in the Vulnerability View
    if(scat){
      const w = mk.worse || 1, xm = d3.median(xv), ym = d3.median(yv);
      const qx = sx(xm), qy = sy(ym), up = w > 0;
      axG.append("rect").attr("x", qx).attr("width", Math.max(0, W-m.r-qx)).attr("y", up ? m.t : qy).attr("height", up ? Math.max(0, qy-m.t) : Math.max(0, H-m.b-qy)).attr("fill", C.vuln).attr("opacity", .09);
      axG.append("line").attr("x1", qx).attr("x2", qx).attr("y1", m.t).attr("y2", H-m.b).attr("stroke", C.ink2).attr("stroke-dasharray", "3 3").attr("opacity", .5);
      axG.append("line").attr("x1", m.l).attr("x2", W-m.r).attr("y1", qy).attr("y2", qy).attr("stroke", C.ink2).attr("stroke-dasharray", "3 3").attr("opacity", .5);
      axG.append("g").attr("class", "axis").attr("transform", `translate(0,${H-m.b})`).call(d3.axisBottom(sx).ticks(4).tickSize(3).tickSizeOuter(0).tickFormat(L.format("+.2~f")));
      axG.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(sy).ticks(4).tickSize(3).tickSizeOuter(0));
      axG.append("text").attr("class", "atitle").attr("x", (m.l+W-m.r)/2).attr("y", H-3).attr("text-anchor", "middle").style("font-size", "10px").text(xName());
      axG.append("text").attr("class", "atitle").attr("transform", "rotate(-90)").attr("x", -(m.t+H-m.b)/2).attr("y", 9).attr("text-anchor", "middle").style("font-size", "10px").text(mk.short || mk.ax2 || "behavior");
    }

    const rExt = d3.extent(links, l => l.r), same = l => l.source.g === l.target.g;
    const edge = linkG.selectAll("line").data(links).join("line")
      .attr("stroke", l => same(l) ? groups[l.source.g].color : C.ink2).attr("stroke-linecap", "round")
      .attr("stroke-width", l => same(l) ? 1.7 : 1.1)
      .attr("stroke-opacity", l => same(l) ? .75 : .12+.38*((l.r-rExt[0])/((rExt[1]-rExt[0]) || 1)));
    const dot = nodeG.selectAll("circle").data(nodes).join("circle").attr("r", 5.6).attr("fill", d => groups[d.g].color).attr("stroke", C.panel).attr("stroke-width", 1.5).style("cursor", "pointer");
    const setPos = () => {
      edge.attr("x1", l => l.source.x).attr("y1", l => l.source.y).attr("x2", l => l.target.x).attr("y2", l => l.target.y);
      dot.attr("cx", d => d.x).attr("cy", d => d.y);
    };
    const hull = () => {
      if(!(grouped && !scat && groups.length > 1)){ hullG.selectAll("*").remove(); return; }
      hullG.selectAll("path").data(groups).join("path").attr("fill", g => g.color).attr("stroke", g => g.color).attr("fill-opacity", .07).attr("stroke-opacity", .07)
        .attr("stroke-width", 30).attr("stroke-linejoin", "round").attr("stroke-linecap", "round")
        .attr("d", (g, gi) => { const pts = nodes.filter(n => n.g === gi).map(n => [n.x, n.y]), h = pts.length >= 3 ? d3.polygonHull(pts) : pts; return h && h.length ? `M${h.join("L")}Z` : null; });
      hullG.selectAll("text").data(groups).join("text").attr("class", "mdim gtag").attr("text-anchor", "middle").style("fill", g => g.color).text(g => `${g.name.toUpperCase()} · ${g.ids.length}`)
        .attr("x", (g, gi) => d3.mean(nodes.filter(n => n.g === gi), n => n.x)).attr("y", (g, gi) => Math.max(12, d3.min(nodes.filter(n => n.g === gi), n => n.y)-20));
    };
    function drawOver(){
      over.selectAll("*").remove();
      const f = hv && byNode.get(hv), near = hv ? adj.get(hv) : null;
      const label = (n, bold) => over.append("text").attr("class", "glab").attr("x", n.x+8).attr("y", n.y+3).style("font-weight", bold ? 700 : 400).text(short(n.id));
      if(f){ over.append("circle").attr("cx", f.x).attr("cy", f.y).attr("r", 9).attr("fill", "none").attr("stroke", C.ink).attr("stroke-width", 1.5); label(f, true); near.forEach(id => label(byNode.get(id))); }
      S.pair.forEach((d, i) => { const n = byNode.get(d.id); if(!n) return;
        over.append("circle").attr("cx", n.x).attr("cy", n.y).attr("r", 9.5).attr("fill", "none").attr("stroke", C.ink).attr("stroke-width", 2);
        over.append("text").attr("class", "ab").attr("x", n.x-11).attr("y", n.y-8).attr("text-anchor", "end").text("AB"[i]); });
      (S.selected || []).forEach(id => { const n = byNode.get(id); if(n){ over.append("circle").attr("cx", n.x).attr("cy", n.y).attr("r", 9).attr("fill", "none").attr("stroke", C.ink).attr("stroke-width", 2); if(!f && S.selected.length <= 8) label(n); } });
    }
    model.g = {dot, edge, adj, drawOver, same, byNode};

    if(scat){
      // animated switch: from where each person was to where they sit in the scatter
      setPos();
      nodes.forEach(n => { const t = target(n.id); n.x = t.x; n.y = t.y; posMem.set(n.id, {x:t.x, y:t.y, fixed:false}); });
      const tr = reduce ? null : d3.transition().duration(700).ease(d3.easeCubicInOut);
      const e1 = tr ? edge.transition(tr) : edge, d1 = tr ? dot.transition(tr) : dot;
      e1.attr("x1", l => l.source.x).attr("y1", l => l.source.y).attr("x2", l => l.target.x).attr("y2", l => l.target.y);
      d1.attr("cx", d => d.x).attr("cy", d => d.y);
      hull(); if(tr) d1.end().then(drawOver, () => {}); else drawOver();
    } else {
      const clampN = d => { d.x = Math.max(10, Math.min(W-10, d.x)); d.y = Math.max(10, Math.min(H-10, d.y)); };
      const cx = g => grouped && groups.length > 1 ? W*(g ? .7 : .3) : W/2;
      sim = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).distance(l => 22+54*(1-Math.max(0, l.r))).strength(l => grouped && !same(l) ? .03 : .32))
        .force("charge", d3.forceManyBody().strength(-Math.max(30, Math.min(240, W*H/(ids.length*22)))).distanceMax(Math.max(W, H)*.6))
        .force("collide", d3.forceCollide(9))
        .force("x", d3.forceX(d => cx(d.g)).strength(grouped ? .14 : .035))
        .force("y", d3.forceY(H/2).strength(.1*Math.min(1.6, W/H)))
        .alpha(posMem.size ? .55 : 1).alphaDecay(.04);
      const ticked = () => { nodes.forEach(clampN); setPos(); hull(); drawOver(); nodes.forEach(n => { const mm = posMem.get(n.id); posMem.set(n.id, {x:n.x, y:n.y, fixed:!!(mm && mm.fixed)}); }); };
      sim.on("tick", ticked);
      if(reduce){ sim.stop(); for(let i = 0; i < 300; i++) sim.tick(); ticked(); }
      else setPos();
      const drag = d3.drag().clickDistance(4)
        .on("start", (ev, d) => { if(!ev.active && !reduce) sim.alphaTarget(.25).restart(); d.fx = d.x; d.fy = d.y; hideTip(); })
        .on("drag", (ev, d) => { d.fx = ev.x; d.fy = ev.y; if(reduce){ d.x = ev.x; d.y = ev.y; ticked(); } })
        .on("end", (ev, d) => { if(!ev.active && !reduce) sim.alphaTarget(0); posMem.set(d.id, {x:d.fx, y:d.fy, fixed:true}); });
      dot.call(drag);
    }
    dot.on("pointerenter", (ev, d) => { setHover(d.id); showTip(ev, tipNode(d.id)); })
      .on("pointermove", ev => moveTip(ev))
      .on("pointerleave", () => { setHover(null); hideTip(); })
      .on("click", (ev, d) => { hideTip(); const p = P.find(o => o.id === d.id); if(!p) return; if(ev.shiftKey) pin(p); else togglePick(p); });
    paint();
  }
  function tipNode(id){
    const g = model.groups.find(g => g.ids.includes(id)), d = model.byId.get(id);
    return `<div class="h">${id} <span class="m">${g ? g.name.toLowerCase() : ""}</span></div>` +
      (d && d[yK()] != null ? trow(mkY().ax2, fsr(d[yK()])) : "") + model.nbrs.get(id).map(([b, r]) => trow(b, `r = ${f2(r)}`)).join("");
  }
  function setHover(id){
    if(hv === id) return;
    hv = id; paint();
    if((S.hovered && S.hovered.id) !== id) hover(id ? P.find(d => d.id === id) : null);
  }
  function paint(){
    if(!model || !model.g) return;
    const {dot, edge, adj, drawOver, same} = model.g, f = hv, near = f ? adj.get(f) : null;
    const on = id => !f || id === f || (near && near.has(id));
    dot.attr("opacity", d => on(d.id) ? 1 : .22).attr("r", d => d.id === f ? 7.5 : 5.6);
    edge.attr("display", l => !f || l.source.id === f || l.target.id === f ? null : "none")
      .attr("stroke", l => f && (l.source.id === f || l.target.id === f) ? C.ink : (same(l) ? model.groups[l.source.g].color : C.ink2));
    drawOver();
  }

  function titles(){
    const [a, b] = model.groups, N = model.ids.length;
    // of the K neighbors of each person in the first group, how many are in the same group; by chance K·(n−1)/(N−1)
    const nbIn = d3.sum(a.ids, x => model.nbrs.get(x).filter(([y]) => a.ids.includes(y)).length);
    const expct = a.ids.length*K*(a.ids.length-1)/Math.max(1, N-1), alike = b && nbIn >= 1.4*expct && nbIn-expct >= 3;
    const rIn = d3.mean(a.ids.flatMap(x => a.ids.filter(y => y !== x).map(y => model.R.get(x).get(y))).filter(v => v != null && !isNaN(v)));
    const rOut = b ? d3.mean(a.ids.flatMap(x => b.ids.map(y => model.R.get(x).get(y))).filter(v => v != null && !isNaN(v))) : null;
    setTitle("t-graph", b ? `${a.name}: ${alike ? "alike" : "not a group"}` : `${a.ids.length} people`,
      b ? nb(`${nbIn}/${a.ids.length*K} neighbors in-group, chance ≈ ${L.format(".0f")(expct)}`) : "",
      notes(`Each person is joined to the ${K} people whose pattern of Δ${METN[model.met]} over the 61 electrodes is most alike (Pearson r). Groups come from behavior only, not from theta.`,
        b ? `Mean similarity within ${a.name.toLowerCase()}: r = ${f2(rIn)}; ${a.name.toLowerCase()} with ${b.name.toLowerCase()}: r = ${f2(rOut)}.` : "",
        "On scatter: each person sits where they are in the Vulnerability View. Network: layout by similarity (drag nodes, wheel to zoom). Click a person to select it (Shift+click for A/B). Not functional connectivity: it compares people, not electrodes."));
    d3.select("#k-graph").html(model.groups.map(g => `<span class="k"><i class="dot" style="background:${g.color}"></i>${g.name}</span>`).join("") +
      `<span class="k m">${K} most alike</span><span class="seg gseg" role="group" aria-label="Layout"><button type="button" data-m="scatter" aria-pressed="${mode === "scatter"}">On scatter</button><button type="button" data-m="net" aria-pressed="${mode === "net"}">Network</button></span>` +
      (mode === "net" ? `<button class="btn btn-sm" id="graphgrp" type="button" aria-pressed="${grouped}">Group</button>` : ""));
    d3.selectAll("#k-graph .gseg button").on("click", function(){ const v = this.dataset.m; if(v !== mode){ mode = v; render(); } });
    d3.select("#graphgrp").on("click", () => { grouped = !grouped; posMem.forEach(m => { m.fixed = false; }); render(); });
  }
  function render(){
    if(!isOpen()){ clear(); return; }
    build(); draw(); titles();
  }
  function clear(){ if(sim) sim.stop(); d3.select(el).selectAll("*").remove(); }
  bus.on("frame.simg", w => { fw = w; if(isOpen()) render(); });
  bus.on("pin.simg", () => paint());
  bus.on("hover.simg", d => { const id = d ? d.id : null; if(hv !== id){ hv = id; paint(); } });
  return {render, clear};
})();
