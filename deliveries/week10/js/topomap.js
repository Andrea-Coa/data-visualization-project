/* Vista 2 · Firma espacial (responde).
   Campo continuo por distancia inversa ponderada (IDW) sobre los 61 electrodos, isolíneas con d3.contours,
   marcas de significancia reales (t pareada) con corrección FDR, y franjas por región que sí siguen a la selección.
   Al cambiar métrica o condición, el campo nuevo entra con un fundido cruzado (evita el salto brusco). */
const topo = (() => {
  const el = $("topo"); const GN = 110;
  let svg, W, H, cx, cy, R, imgs, front = 0, contG, elecG, lblG, styleE = () => {};
  const cnv = document.createElement("canvas"); cnv.width = GN; cnv.height = GN; const ctx = cnv.getContext("2d");

  function build(){
    d3.select(el).selectAll("*").remove();
    W = el.clientWidth || 420; H = Math.round(Math.max(280, Math.min(380, W*.8))); R = Math.min(W/2-30, H/2-26); cx = W/2; cy = H/2+8;
    svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img")
      .attr("aria-label", "Topomapa de potencia theta en 61 electrodos; cada electrodo es enfocable y anuncia su valor");
    svg.append("defs").append("clipPath").attr("id", "hclip").append("circle").attr("cx", cx).attr("cy", cy).attr("r", R);
    const headG = svg.append("g");
    imgs = [0, 1].map(() => svg.append("image").attr("class", "field-img").attr("x", cx-R).attr("y", cy-R).attr("width", 2*R).attr("height", 2*R)
      .attr("preserveAspectRatio", "none").attr("clip-path", "url(#hclip)").attr("opacity", 0));
    contG = svg.append("g").attr("clip-path", "url(#hclip)");
    svg.append("circle").attr("class", "head").attr("cx", cx).attr("cy", cy).attr("r", R);
    elecG = svg.append("g"); lblG = svg.append("g");
    headG.append("path").attr("class", "head").attr("d", `M ${cx-12} ${cy-R+2} L ${cx} ${cy-R-14} L ${cx+12} ${cy-R+2}`).attr("stroke-linejoin", "round").style("fill", "var(--panel)");
    headG.append("path").attr("class", "head").attr("d", `M ${cx-R+1} ${cy-15} C ${cx-R-11} ${cy-13} ${cx-R-11} ${cy+13} ${cx-R+1} ${cy+15}`);
    headG.append("path").attr("class", "head").attr("d", `M ${cx+R-1} ${cy-15} C ${cx+R+11} ${cy-13} ${cx+R+11} ${cy+13} ${cx+R-1} ${cy+15}`);
    svg.append("text").attr("x", cx-R-6).attr("y", cy+R+2).attr("class", "axis-title").attr("font-size", 11).text("izq.");
    svg.append("text").attr("x", cx+R+6).attr("y", cy+R+2).attr("class", "axis-title").attr("text-anchor", "end").attr("font-size", 11).text("der.");
    front = 0;
  }
  const val = (t, cond, met) => cond === "D" ? (met === "var" ? t.dVar : t.dMean) : (t[cond] ? t[cond][met] : null);
  // NS y SD comparten dominio para que alternar entre ellas compare valores reales; Δ es simétrico alrededor de 0.
  function scale(){
    if(S.cond === "D"){ const a = d3.max(ELEC, e => Math.abs(val(TOPO[e], "D", S.met))) || 1; return {dom:[-a, a], f:v => C.div((v+a)/(2*a)), ramp:C.div, div:true}; }
    const all = ELEC.flatMap(e => [val(TOPO[e], "NS", S.met), val(TOPO[e], "SD", S.met)]).filter(v => v != null), [lo, hi] = d3.extent(all);
    return {dom:[lo, hi], f:v => C.seq((v-lo)/((hi-lo) || 1)), ramp:C.seq, div:false};
  }
  function render(animate = true){
    if(!svg) build();
    const pts = ELEC.map(e => ({e, x:COORDS[e][0], y:COORDS[e][1], v:val(TOPO[e], S.cond, S.met), t:TOPO[e]})).filter(d => d.v != null);
    const sc = scale(), grid = new Float64Array(GN*GN), im = ctx.createImageData(GN, GN);
    for(let iy = 0; iy < GN; iy++) for(let ix = 0; ix < GN; ix++){
      const ux = -1+(ix+.5)*2/GN, uy = 1-(iy+.5)*2/GN; let num = 0, den = 0, hit = null;
      for(const p of pts){ const d2 = (ux-p.x)**2+(uy-p.y)**2; if(d2 < 1e-9){ hit = p.v; break; } const w = 1/(d2*d2); num += w*p.v; den += w; }
      const v = hit != null ? hit : num/den; grid[iy*GN+ix] = v;
      const c = d3.rgb(sc.f(v)), k = (iy*GN+ix)*4; im.data[k] = c.r; im.data[k+1] = c.g; im.data[k+2] = c.b; im.data[k+3] = 255;
    }
    ctx.putImageData(im, 0, 0);
    // fundido cruzado: la capa nueva entra encima de la anterior
    const next = imgs[1-front], prev = imgs[front];
    next.attr("href", cnv.toDataURL()).raise(); contG.raise(); svg.select("circle.head").raise(); elecG.raise(); lblG.raise();
    next.interrupt().attr("opacity", animate ? 0 : 1);
    if(animate) next.transition().duration(T_MOVE || T_FADE).ease(EASE_OUT).attr("opacity", 1).on("end", () => prev.attr("opacity", 0));
    else prev.attr("opacity", 0);
    front = 1-front;
    const th = d3.ticks(sc.dom[0], sc.dom[1], 9);
    const proj = d3.geoTransform({point(x, y){ this.stream.point(cx-R+x*2*R/GN, cy-R+y*2*R/GN); }});
    contG.selectAll("path").data(d3.contours().size([GN, GN]).thresholds(th)(Array.from(grid))).join("path").attr("class", "contour").attr("d", d3.geoPath(proj));

    const met = S.met;
    styleE = sel => sel.attr("r", d => pOf(d.t, met) < .05 ? 4.5 : 1.8)
      .attr("fill", d => qOf(d.t, met) < .05 ? C.ink : (pOf(d.t, met) < .05 ? "none" : C.ink))
      .attr("fill-opacity", d => pOf(d.t, met) < .05 ? 1 : .45)
      .attr("stroke", d => qOf(d.t, met) < .05 ? C.panel : (pOf(d.t, met) < .05 ? C.ink : "none")).attr("stroke-width", 1.5);
    const eg = elecG.selectAll("g.e").data(pts, d => d.e).join(en => {
      const g = en.append("g").attr("class", "e");
      g.append("circle").attr("class", "hit").attr("r", 10).attr("fill", "transparent"); g.append("circle").attr("class", "pt"); return g;
    }).attr("transform", d => `translate(${cx+d.x*R},${cy-d.y*R})`).attr("tabindex", 0).attr("role", "img")
      .attr("aria-label", d => `${d.e}: ${fr(d.v)}, p ${fp(pOf(d.t, met))}`);
    styleE(eg.select(".pt"));
    eg.on("pointerenter focus", function(e, d){
        d3.select(this).select(".pt").attr("r", 6).attr("fill", qOf(d.t, S.met) < .05 ? C.ink : C.panel).attr("fill-opacity", 1).attr("stroke", C.ink).attr("stroke-width", 2);
        showTip(e.clientX != null ? e : centerEvt(this), tipFor(d));
      })
      .on("pointermove", e => moveTip(e))
      .on("pointerleave blur", function(){ hideTip(); styleE(d3.select(this).select(".pt")); });
    lblG.selectAll("text").data(pts.filter(d => pOf(d.t, met) < .05), d => d.e).join("text").attr("class", "elabel")
      .attr("x", d => cx+d.x*R).attr("y", d => cy-d.y*R-8).text(d => d.e);
    colorbar(sc);
    const cnt = sigCount(met);
    $("topostat").innerHTML = `<b>${cnt.p}</b> de 61 con p &lt; 0.05 · <b>${cnt.q}</b> tras FDR`;
    roiStrip();
  }
  function colorbar(sc){
    const bw = $("cbar").clientWidth || 300, cb = d3.select("#cbar").attr("viewBox", `0 0 ${bw} 30`); cb.selectAll("*").remove();
    const lg = cb.append("defs").append("linearGradient").attr("id", "cbg");
    d3.range(0, 1.001, .1).forEach(t => lg.append("stop").attr("offset", t).attr("stop-color", sc.ramp(t)));
    cb.append("rect").attr("x", 0).attr("y", 2).attr("width", bw).attr("height", 9).attr("rx", 3).attr("fill", "url(#cbg)");
    const bx = d3.scaleLinear().domain(sc.dom).range([0, bw]);
    cb.append("g").attr("class", "axis").attr("transform", "translate(0,12)")
      .call(d3.axisBottom(bx).ticks(5).tickSize(4).tickFormat(sc.div ? L.format("+.2~r") : L.format(".2~r"))).select(".domain").remove();
    $("cbarlbl").textContent = (S.cond === "D" ? "Δ " : "") + (S.met === "var" ? "σθ" : "μθ") + (S.cond === "D" ? "" : " " + S.cond);
  }
  function centerEvt(node){ const r = node.getBoundingClientRect(); return {clientX:r.x+r.width/2, clientY:r.y+r.height/2}; }
  function tipFor(d){
    const t = d.t, met = S.met, ns = t.NS && t.NS[met], sd = t.SD && t.SD[met], dv = met === "var" ? t.dVar : t.dMean;
    return `<div class="h">${d.e} <span class="m">· ${met === "var" ? "variabilidad σθ" : "media μθ"}</span></div>` +
      trow("NS", fr(ns), C.ns) + trow("SD", fr(sd), C.sd) + trow("Δ SD − NS", `${fsr(dv)} <span class="m">(${ns ? fpc(dv/ns) : "n/d"})</span>`) +
      trow("p pareada", fp(pOf(t, met))) + trow("q FDR", fp(qOf(t, met))) + `<div class="m" style="margin-top:4px">n pareado = ${t.nPaired ?? 68}</div>`;
  }
  // Franjas por región: los 68 como marcas, triángulo de la media de todos, triángulo de la media de la selección
  function roiStrip(){
    const box = d3.select("#roistrip"); box.selectAll("*").remove();
    const key = S.met === "var" ? "var" : "pow", lab = S.met === "var" ? "Δσθ" : "Δμθ";
    const ss = S.selected ? new Set(S.selected) : null, focus = S.pinned || S.hovered;
    box.append("div").style("font-size", "12.5px").style("font-weight", "600").style("margin-bottom", "4px")
      .text(ss ? `Grupo seleccionado (n = ${S.selected.length}) frente a los 68, por región` : "Distribución por región · selecciona un grupo para compararlo");
    const Wb = Math.max(240, $("roistrip").clientWidth || 300);
    Object.values(ROI).forEach(r => {
      const k = r[key], vals = EEG.map(d => ({d, v:d[k]})).filter(o => o.v != null), x = d3.scaleLinear().domain(d3.extent(vals, o => o.v)).nice().range([8, Wb-8]);
      const allM = d3.mean(vals, o => o.v), sel = ss ? vals.filter(o => ss.has(o.d.id)) : [], selM = sel.length ? d3.mean(sel, o => o.v) : null;
      const row = box.append("div").style("margin", "4px 0 2px");
      const head = row.append("div").style("display", "flex").style("justify-content", "space-between").style("font-size", "12px").style("color", "var(--ink2)");
      head.append("span").text(`${lab} ${r.name}`);
      head.append("span").attr("class", "num").html(ss ? `<b style="color:var(--sd-text)">x̄ sel ${fsr(selM)}</b> · x̄ todos ${fsr(allM)}` : `x̄ ${fsr(allM)}`);
      const s = row.append("svg").attr("viewBox", `0 0 ${Wb} 30`).attr("aria-hidden", "true").style("width", "100%").style("height", "30px").style("display", "block");
      s.append("line").attr("x1", 8).attr("x2", Wb-8).attr("y1", 14).attr("y2", 14).attr("stroke", C.rule);
      if(x.domain()[0] < 0 && x.domain()[1] > 0) s.append("line").attr("x1", x(0)).attr("x2", x(0)).attr("y1", 5).attr("y2", 23).attr("stroke", C.rule2);
      s.append("g").selectAll("line").data(vals).join("line").attr("x1", o => x(o.v)).attr("x2", o => x(o.v)).attr("y1", 9).attr("y2", 19)
        .attr("stroke", o => ss && ss.has(o.d.id) ? C.sd : C.rest).attr("stroke-opacity", o => ss ? (ss.has(o.d.id) ? .95 : .3) : .6).attr("stroke-width", 1.5);
      s.append("path").attr("d", `M${x(allM)},3 l4,5 l-8,0z`).attr("fill", C.ink);
      if(selM != null) s.append("path").attr("d", `M${x(selM)},25 l4,-5 l-8,0z`).attr("fill", C.sd);
      if(focus && focus[k] != null) s.append("circle").attr("cx", x(focus[k])).attr("cy", 14).attr("r", 4.5).attr("fill", C.panel).attr("stroke", C.ink).attr("stroke-width", 2);
    });
    box.append("p").attr("class", "note").style("margin-top", "6px")
      .text("El mapa promedia a los 68 participantes: los datos por electrodo no están desagregados por sujeto. Las franjas por región sí se recalculan con la selección (triángulo oscuro: todos; naranja: selección).");
  }
  bus.on("select.topo", () => roiStrip()); bus.on("hover.topo", () => roiStrip()); bus.on("pin.topo", () => roiStrip());
  bus.on("theme.topo", () => render(false));
  return {render, roiStrip, rebuild:() => { svg = null; }};
})();
