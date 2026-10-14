/* Vista "Comparar sujetos": dos topomaps individuales, lado a lado, para contrastar la firma
   theta de dos personas en vez del promedio grupal. Usa data/topo_by_subject.json (potencia por
   electrodo y por sujeto, Semana 6). A diferencia del mapa agregado, aquí no hay marcas de
   significancia: un sujeto individual no tiene prueba estadística (no hay varianza entre sujetos).
   La escala de color es COMPARTIDA entre ambos mapas para que la comparación visual sea honesta. */
const compare = (() => {
  const GN = 90;
  const cnv = document.createElement("canvas"); cnv.width = GN; cnv.height = GN; const ctx = cnv.getContext("2d");
  const CS = {met:"var", cond:"D", a:null, b:null};  // estado local de la vista
  let built = false;

  const ids = () => Object.keys(SUBTOPO);
  const meta = id => P.find(p => p.id === id) || {};
  const label = id => { const m = meta(id); return `${id}${m.age != null ? ` · ${m.age|0} a` : ""}${m.gender ? ` · ${m.gender === "F" ? "mujer" : "hombre"}` : ""}`; };
  const val = (t, cond, met) => cond === "D" ? (met === "var" ? t.dVar : t.dMean) : (t[cond] ? t[cond][met] : null);

  // Dominio compartido sobre los dos sujetos, para que un color signifique lo mismo en ambos mapas.
  function scale(){
    const TA = SUBTOPO[CS.a], TB = SUBTOPO[CS.b];
    if(CS.cond === "D"){
      let a = 0; ELEC.forEach(e => { [TA, TB].forEach(T => { if(T && T[e]){ const v = Math.abs(val(T[e], "D", CS.met)); if(v > a) a = v; } }); });
      a = a || 1; return {dom:[-a, a], f:v => C.div((v+a)/(2*a)), ramp:C.div, div:true};
    }
    const all = [];
    ELEC.forEach(e => { [TA, TB].forEach(T => { if(T && T[e]){ ["NS", "SD"].forEach(c => { const v = val(T[e], c, CS.met); if(v != null) all.push(v); }); } }); });
    const [lo, hi] = d3.extent(all);
    return {dom:[lo, hi], f:v => C.seq((v-lo)/((hi-lo) || 1)), ramp:C.seq, div:false};
  }

  // Un mapa: cabeza, campo IDW, isolíneas y electrodos enfocables. Devuelve nada; dibuja en el <div>.
  function drawMap(hostId, topo, sc){
    const el = $(hostId); if(!el) return;
    d3.select(el).selectAll("*").remove();
    const W = el.clientWidth || 300, H = Math.max(230, Math.min(300, W));
    const R = Math.min(W/2-26, H/2-22), cx = W/2, cy = H/2+6;
    const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img")
      .attr("aria-label", `Topomapa de theta por electrodo de un sujeto`);
    const cid = "hclip-" + hostId;
    svg.append("defs").append("clipPath").attr("id", cid).append("circle").attr("cx", cx).attr("cy", cy).attr("r", R);
    const pts = ELEC.map(e => topo[e] ? {e, x:COORDS[e][0], y:COORDS[e][1], v:val(topo[e], CS.cond, CS.met), t:topo[e]} : null)
      .filter(d => d && d.v != null);
    const grid = new Float64Array(GN*GN), im = ctx.createImageData(GN, GN);
    for(let iy = 0; iy < GN; iy++) for(let ix = 0; ix < GN; ix++){
      const ux = -1+(ix+.5)*2/GN, uy = 1-(iy+.5)*2/GN; let num = 0, den = 0, hit = null;
      for(const p of pts){ const d2 = (ux-p.x)**2+(uy-p.y)**2; if(d2 < 1e-9){ hit = p.v; break; } const w = 1/(d2*d2); num += w*p.v; den += w; }
      const v = hit != null ? hit : num/den; grid[iy*GN+ix] = v;
      const c = d3.rgb(sc.f(v)), k = (iy*GN+ix)*4; im.data[k] = c.r; im.data[k+1] = c.g; im.data[k+2] = c.b; im.data[k+3] = 255;
    }
    ctx.putImageData(im, 0, 0);
    svg.append("image").attr("x", cx-R).attr("y", cy-R).attr("width", 2*R).attr("height", 2*R)
      .attr("preserveAspectRatio", "none").attr("clip-path", `url(#${cid})`).attr("href", cnv.toDataURL());
    const th = d3.ticks(sc.dom[0], sc.dom[1], 9);
    const proj = d3.geoTransform({point(x, y){ this.stream.point(cx-R+x*2*R/GN, cy-R+y*2*R/GN); }});
    svg.append("g").attr("clip-path", `url(#${cid})`).selectAll("path")
      .data(d3.contours().size([GN, GN]).thresholds(th)(Array.from(grid))).join("path")
      .attr("class", "contour").attr("d", d3.geoPath(proj));
    svg.append("circle").attr("class", "head").attr("cx", cx).attr("cy", cy).attr("r", R);
    svg.append("path").attr("class", "head").attr("d", `M ${cx-11} ${cy-R+2} L ${cx} ${cy-R-13} L ${cx+11} ${cy-R+2}`).attr("stroke-linejoin", "round").style("fill", "var(--panel)");
    const eg = svg.append("g").selectAll("g.e").data(pts, d => d.e).join("g").attr("class", "e")
      .attr("transform", d => `translate(${cx+d.x*R},${cy-d.y*R})`).attr("tabindex", 0).attr("role", "img")
      .attr("aria-label", d => `${d.e}: ${fr(d.v)}`);
    eg.append("circle").attr("class", "hit").attr("r", 9).attr("fill", "transparent");
    eg.append("circle").attr("class", "pt").attr("r", 2).attr("fill", C.ink).attr("fill-opacity", .45);
    eg.on("pointerenter focus", function(e, d){
        d3.select(this).select(".pt").attr("r", 5).attr("fill", C.panel).attr("stroke", C.ink).attr("stroke-width", 2).attr("fill-opacity", 1);
        showTip(e.clientX != null ? e : centerEvt(this), tipFor(d));
      })
      .on("pointermove", e => moveTip(e))
      .on("pointerleave blur", function(){ hideTip(); d3.select(this).select(".pt").attr("r", 2).attr("fill", C.ink).attr("stroke", "none").attr("fill-opacity", .45); });
  }
  function centerEvt(node){ const r = node.getBoundingClientRect(); return {clientX:r.x+r.width/2, clientY:r.y+r.height/2}; }
  function tipFor(d){
    const t = d.t, met = CS.met, ns = t.NS && t.NS[met], sd = t.SD && t.SD[met], dv = met === "var" ? t.dVar : t.dMean;
    return `<div class="h">${d.e} <span class="m">· ${met === "var" ? "variabilidad σθ" : "media μθ"}</span></div>` +
      trow("NS", fr(ns), C.ns) + trow("SD", fr(sd), C.sd) + trow("Δ SD − NS", `${fsr(dv)} <span class="m">(${ns ? fpc(dv/ns) : "n/d"})</span>`);
  }

  function colorbar(sc){
    const vertical = matchMedia("(min-width: 760px)").matches;
    const bw = vertical ? 300 : ($("ccbar").clientWidth || 280), bh = 34;
    const cb = d3.select("#ccbar").attr("viewBox", `0 0 ${bw} ${bh}`); cb.selectAll("*").remove();
    const lg = cb.append("defs").append("linearGradient").attr("id", "ccbg");
    d3.range(0, 1.001, .1).forEach(t => lg.append("stop").attr("offset", t).attr("stop-color", sc.ramp(t)));
    cb.append("rect").attr("x", 0).attr("y", 2).attr("width", bw).attr("height", 9).attr("rx", 3).attr("fill", "url(#ccbg)");
    const bx = d3.scaleLinear().domain(sc.dom).range([0, bw]);
    cb.append("g").attr("class", "axis").attr("transform", "translate(0,13)")
      .call(d3.axisBottom(bx).ticks(6).tickSize(4).tickFormat(sc.div ? L.format("+.2~r") : L.format(".2~r"))).select(".domain").remove();
    $("ccbarlbl").textContent = (CS.cond === "D" ? "Δ " : "") + (CS.met === "var" ? "σθ" : "μθ") + (CS.cond === "D" ? " (SD − NS)" : " " + CS.cond);
  }

  // Resumen regional del sujeto: los mismos Δ por región que usa el scatter (participants.json),
  // para que el número de aquí coincida con el de la vista Explorar. var -> Δσθ, mean -> Δμθ (potencia).
  function caption(id, slotId){
    const m = meta(id), front = CS.met === "var" ? "d_front_var" : "d_front_pow", ct = CS.met === "var" ? "d_ct_var" : "d_ct_pow";
    const fv = m[front] != null ? m[front] : null, cv = m[ct] != null ? m[ct] : null;
    const lab = CS.met === "var" ? "Δσθ" : "Δμθ";
    $(slotId).innerHTML = `<b>${id}</b> <span class="m">${m.age != null ? `${m.age|0} años` : ""}${m.gender ? ` · ${m.gender === "F" ? "mujer" : "hombre"}` : ""}${m.order ? ` · ${m.order}` : ""}</span>` +
      `<span class="roi">${lab} frontal <b>${fsr(fv)}</b> · centro-temporal <b>${fsr(cv)}</b></span>`;
  }

  function fillSelect(id, val){
    const sel = d3.select("#" + id);
    sel.selectAll("option").data(ids()).join("option").attr("value", d => d).text(d => label(d));
    $(id).value = val;
  }

  function init(){
    const all = ids();
    if(all.length < 2) return;
    CS.a = all[0]; CS.b = all[Math.min(all.length-1, Math.floor(all.length/2))];
    fillSelect("csubA", CS.a); fillSelect("csubB", CS.b);
    d3.select("#csubA").on("change", function(){ CS.a = this.value; render(); });
    d3.select("#csubB").on("change", function(){ CS.b = this.value; render(); });
    d3.select("#cswap").on("click", () => { [CS.a, CS.b] = [CS.b, CS.a]; $("csubA").value = CS.a; $("csubB").value = CS.b; render(); });
    setupSeg("cmetseg", v => { CS.met = v; render(); });
    setupSeg("ccondseg", v => { CS.cond = v; render(); });
    built = true;
  }

  function render(){
    if(!built || !CS.a || !CS.b) return;
    const sc = scale();
    drawMap("ctopoA", SUBTOPO[CS.a], sc);
    drawMap("ctopoB", SUBTOPO[CS.b], sc);
    colorbar(sc);
    caption(CS.a, "ccapA"); caption(CS.b, "ccapB");
  }

  bus.on("theme.compare", () => { if(built) render(); });
  return {init, render, rebuild:() => { if(built) render(); }};
})();
