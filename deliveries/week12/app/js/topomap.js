/* Vista 1 · Matriz de topomapas 2 × 3 (tareas T1, T2 y T4).
   Columnas: NS, SD y Δ (SD menos NS). Filas: σθ y μθ del grupo activo (las 68 personas o el grupo elegido).
   Con dos personas elegidas en la dispersión (A y B), las filas pasan a ser A y B con la métrica del header.
   Escalas: NS y SD comparten una secuencial por fila; Δ usa una divergente con cero oscuro. En el modo A y B
   ambas filas comparten las mismas escalas para que la comparación sea honesta.
   Marcas de significancia (t pareada, FDR) solo en Δ de las 68 personas: con subgrupos no hay prueba por electrodo. */
const topo = (() => {
  const el = $("topo"), GN = 96;
  let MAPS = [], linkG = null, curSpec = null;   // posiciones de los 6 mapas para enlazar un mismo electrodo en todos
  const cnv = document.createElement("canvas"); cnv.width = GN; cnv.height = GN; const ctx = cnv.getContext("2d");
  const val = (t, cond, met) => cond === "D" ? (met === "var" ? t.dVar : t.dMean) : (t[cond] ? t[cond][met] : null);

  // promedio por electrodo del grupo activo; sin grupo, el agregado de los 68 con sus pruebas
  // promedio por electrodo de un conjunto de personas (o el agregado de los 68, con sus pruebas)
  function groupTopo(sel){
    if(!sel) return {T:TOPO, mode:"all"};
    const ids = sel.filter(id => SUBTOPO[id]);
    if(!ids.length) return {T:TOPO, mode:"all"};
    const out = {};
    ELEC.forEach(e => {
      const nm = [], nv = [], sm = [], sv = [];
      ids.forEach(id => { const t = SUBTOPO[id][e]; if(t){ nm.push(t.NS.mean); nv.push(t.NS.var); sm.push(t.SD.mean); sv.push(t.SD.var); } });
      if(!nm.length) return;
      const NS = {mean:d3.mean(nm), var:d3.mean(nv)}, SD = {mean:d3.mean(sm), var:d3.mean(sv)};
      out[e] = {NS, SD, dMean:SD.mean-NS.mean, dVar:SD.var-NS.var, nPaired:nm.length};
    });
    return {T:out, mode:"group", n:ids.length};
  }
  function spec(){
    const [a, b] = S.pair;
    if(a && b && SUBTOPO[a.id] && SUBTOPO[b.id])
      return {mode:"pair", rows:[{label:`A · ${a.id}`, met:S.met, T:SUBTOPO[a.id]}, {label:`B · ${b.id}`, met:S.met, T:SUBTOPO[b.id]}]};
    const G = cmpGroups();
    if(G){
      const ts = G.map(gr => groupTopo(gr.ids));
      return {mode:"cmp", G, rows:G.map((gr, i) => ({label:`${gr.name} (${ts[i].n || gr.ids.length})`, met:S.met, T:ts[i].T, color:gr.color}))};
    }
    const g = groupTopo(S.selected);
    return {mode:g.mode, n:g.n, rows:[{label:"σθ variabilidad", met:"var", T:g.T}, {label:"μθ media", met:"mean", T:g.T}]};
  }
  function scalesFor(rows){
    const seqDom = rs => d3.extent(rs.flatMap(r => ELEC.flatMap(e => r.T[e] ? [val(r.T[e], "NS", r.met), val(r.T[e], "SD", r.met)] : [])).filter(v => v != null));
    const divMax = rs => d3.max(rs.flatMap(r => ELEC.map(e => r.T[e] ? Math.abs(val(r.T[e], "D", r.met)) : 0))) || 1;
    return rs => ({seq:seqDom(rs), div:divMax(rs)});
  }
  function field(T, cond, met, color){
    const pts = ELEC.map(e => T[e] ? {x:COORDS[e][0], y:COORDS[e][1], v:val(T[e], cond, met)} : null).filter(d => d && d.v != null);
    const grid = new Float64Array(GN*GN), im = ctx.createImageData(GN, GN);
    for(let iy = 0; iy < GN; iy++) for(let ix = 0; ix < GN; ix++){
      const ux = -1+(ix+.5)*2/GN, uy = 1-(iy+.5)*2/GN; let num = 0, den = 0, hit = null;
      for(const p of pts){ const d2 = (ux-p.x)**2+(uy-p.y)**2; if(d2 < 1e-9){ hit = p.v; break; } const w = 1/Math.pow(d2, 1.5); num += w*p.v; den += w; }
      const v = hit != null ? hit : num/den, c = d3.rgb(color(v)), k = (iy*GN+ix)*4;   // IDW potencia 3: sin mesetas ni "ojos de buey"
      grid[iy*GN+ix] = v; im.data[k] = c.r; im.data[k+1] = c.g; im.data[k+2] = c.b; im.data[k+3] = 255;
    }
    ctx.putImageData(im, 0, 0);
    return {href:cnv.toDataURL(), grid};
  }
  function render(){
    d3.select(el).selectAll("*").remove();
    const W = el.clientWidth || 600, H = Math.max(240, el.clientHeight || 400);
    const sp = spec(), sc = scalesFor(sp.rows);
    const labW = 22, barW = 54, topH = 22, rowGap = 10;
    const s = Math.floor(Math.max(90, Math.min((W-labW-2*barW-8)/3, (H-topH-rowGap-4)/2)));
    const usedW = labW+3*s+2*barW, x0 = Math.max(0, (W-usedW)/2), y0 = Math.max(0, (H-(topH+2*s+rowGap))/2);
    const X = {lab:x0, NS:x0+labW, SD:x0+labW+s, bar1:x0+labW+2*s+6, D:x0+labW+2*s+barW, bar2:x0+labW+3*s+barW+6};
    const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("height", H).style("height", H+"px")
      .attr("role", "img").attr("aria-label", `Matriz de topomapas: columnas NS, SD y Δ; filas ${sp.rows.map(r => r.label).join(" y ")}`);
    const defs = svg.append("defs");
    const halo = defs.append("radialGradient").attr("id", "thalo");
    halo.append("stop").attr("offset", "62%").attr("stop-color", C.halo).attr("stop-opacity", .10);
    halo.append("stop").attr("offset", "100%").attr("stop-color", C.halo).attr("stop-opacity", 0);
    [["NS", "NS", " sueño normal"], ["SD", "SD", " privación"], ["D", "Δ", " SD − NS"]].forEach(([k, a, b]) => {
      const t = svg.append("text").attr("class", "colhead").attr("x", X[k]+s/2).attr("y", y0+14);
      t.append("tspan").text(a); t.append("tspan").attr("class", "m").text(b);
    });
    const shared = sp.mode === "pair" || sp.mode === "cmp" ? sc(sp.rows) : null;
    MAPS = []; curSpec = sp;
    sp.rows.forEach((row, ri) => {
      const y = y0+topH+ri*(s+rowGap), dom = shared || sc([row]);
      const seqF = v => C.seq((v-dom.seq[0])/((dom.seq[1]-dom.seq[0]) || 1)), divF = v => C.div((v+dom.div)/(2*dom.div));
      svg.append("text").attr("class", "rowhead").attr("transform", `translate(${X.lab+labW/2+2},${y+s/2}) rotate(-90)`).style("fill", row.color || null).text(row.label);
      ["NS", "SD", "D"].forEach(cond => drawMap(svg, defs, `${ri}${cond}`, X[cond], y, s, row, cond, cond === "D" ? divF : seqF, cond === "D" ? divF : seqF, sp.mode));
      bar(svg, defs, `s${ri}`, X.bar1, y, s, dom.seq, C.seq, false);
      bar(svg, defs, `d${ri}`, X.bar2, y, s, [-dom.div, dom.div], C.div, true);
    });
    // capa de enlace: anillo del electrodo bajo el cursor (blanco) y del electrodo que manda en la dispersión (ámbar)
    linkG = svg.append("g").style("pointer-events", "none");
    drawLink(null);
    header(sp);
  }
  function drawMap(svg, defs, id, x, y, s, row, cond, color, _c, mode){
    const R = s/2-10, cx = x+s/2, cy = y+s/2+3, cid = `tc${id}`;
    MAPS.push({cx, cy, R});
    defs.append("clipPath").attr("id", cid).append("circle").attr("cx", cx).attr("cy", cy).attr("r", R);
    const f = field(row.T, cond, row.met, color);
    const g = svg.append("g");
    g.append("circle").attr("cx", cx).attr("cy", cy).attr("r", R*1.22).attr("fill", "url(#thalo)").style("pointer-events", "none");
    g.append("image").attr("x", cx-R).attr("y", cy-R).attr("width", 2*R).attr("height", 2*R).attr("preserveAspectRatio", "none").attr("clip-path", `url(#${cid})`).attr("href", f.href);
    const proj = d3.geoTransform({point(px, py){ this.stream.point(cx-R+px*2*R/GN, cy-R+py*2*R/GN); }});
    const dom = d3.extent(f.grid);
    g.append("g").attr("clip-path", `url(#${cid})`).selectAll("path").data(d3.contours().size([GN, GN]).thresholds(d3.ticks(dom[0], dom[1], 7))(Array.from(f.grid)))
      .join("path").attr("class", "contour").attr("d", d3.geoPath(proj));
    g.append("circle").attr("class", "head").attr("cx", cx).attr("cy", cy).attr("r", R);
    g.append("path").attr("class", "head").attr("d", `M ${cx-7} ${cy-R+1.5} L ${cx} ${cy-R-8} L ${cx+7} ${cy-R+1.5}`).attr("stroke-linejoin", "round");
    g.append("path").attr("class", "head").attr("d", `M ${cx-R} ${cy-10} C ${cx-R-7} ${cy-9} ${cx-R-7} ${cy+9} ${cx-R} ${cy+10}`);
    g.append("path").attr("class", "head").attr("d", `M ${cx+R} ${cy-10} C ${cx+R+7} ${cy-9} ${cx+R+7} ${cy+9} ${cx+R} ${cy+10}`);
    const marks = cond === "D" && mode === "all";
    const pts = ELEC.filter(e => row.T[e]).map(e => ({e, t:row.T[e], px:cx+COORDS[e][0]*R, py:cy-COORDS[e][1]*R}));
    g.append("g").selectAll("circle").data(pts).join("circle").attr("cx", d => d.px).attr("cy", d => d.py)
      .attr("r", d => marks && pOf(d.t, row.met) < .05 ? 4 : 1.1)
      .attr("fill", d => marks && qOf(d.t, row.met) < .05 ? C.ink : (marks && pOf(d.t, row.met) < .05 ? "none" : C.edot))
      .attr("stroke", d => marks && pOf(d.t, row.met) < .05 ? C.ink : "none").attr("stroke-width", 1.5).style("pointer-events", "none");
    g.append("g").selectAll("circle").data(pts).join("circle").attr("class", "ehit").attr("cx", d => d.px).attr("cy", d => d.py).attr("r", Math.max(5, R*.09))
      .on("pointerenter", (e, d) => { drawLink(d.e); showTip(e, tipFor(d.e)); }).on("pointermove", e => moveTip(e))
      .on("pointerleave", () => { drawLink(null); hideTip(); })
      .on("click", (e, d) => { hideTip(); setElec(d.e); });
  }
  function bar(svg, defs, id, x, y, s, dom, ramp, div){
    const h = s-30, top = y+18, gid = `tg${id}`;
    const lg = defs.append("linearGradient").attr("id", gid).attr("x1", "0%").attr("y1", "100%").attr("x2", "0%").attr("y2", "0%");
    d3.range(0, 1.001, .1).forEach(t => lg.append("stop").attr("offset", t).attr("stop-color", div ? ramp(t) : ramp(t)));
    svg.append("rect").attr("x", x).attr("y", top).attr("width", 7).attr("height", h).attr("rx", 3).attr("fill", `url(#${gid})`);
    const sy = d3.scaleLinear().domain(dom).range([top+h, top]);
    svg.append("g").attr("class", "axis").attr("transform", `translate(${x+9},0)`)
      .call(d3.axisRight(sy).ticks(3).tickSize(3).tickFormat(fTick(div ? L.format("+.2~r") : L.format(".2~r")))).call(a => a.select(".domain").remove());
  }
  // un mismo electrodo marcado en los seis mapas
  function drawLink(e){
    if(!linkG) return;
    const at = (m, k) => ({x:m.cx+COORDS[k][0]*m.R, y:m.cy-COORDS[k][1]*m.R});
    const rings = [];
    if(S.elec && COORDS[S.elec]) MAPS.forEach(m => rings.push({...at(m, S.elec), c:C.vuln, w:2}));
    if(e && e !== S.elec) MAPS.forEach(m => rings.push({...at(m, e), c:C.ink, w:1.6}));
    linkG.selectAll("circle").data(rings).join("circle").attr("cx", d => d.x).attr("cy", d => d.y).attr("r", 6).attr("fill", "none").attr("stroke", d => d.c).attr("stroke-width", d => d.w);
  }
  // tooltip: las dos filas del electrodo (NS, SD, Δ) y su relación con el marcador del eje Y
  function tipFor(e){
    const sp = curSpec, all68 = sp.mode === "all";
    return `<div class="h">${e}</div>` + sp.rows.map(row => {
      const t = row.T[e]; if(!t) return "";
      const met = row.met, dv = met === "var" ? t.dVar : t.dMean, r = sp.mode === "pair" ? null : elecRho(e, met);
      return `<div class="m" style="margin-top:4px">${row.label}</div>` + trow("NS · SD", `${fr(t.NS[met])} · ${fr(t.SD[met])}`) +
        trow("Δ SD − NS", `${fsr(dv)}${all68 ? ` <span class="m">p ${fp(pOf(t, met))}, q ${fp(qOf(t, met))}</span>` : ""}`) +
        (r && !isNaN(r.rho) ? trow(`ρ con ${MK[S.y].short}`, `${f2(r.rho)} <span class="m">n = ${r.n}</span>`) : "");
    }).join("");
  }
  function header(sp){
    const k = d3.select("#k-topo"); k.selectAll("*").remove();
    const meanD = (T, met) => d3.mean(ELEC.filter(e => T[e]).map(e => met === "var" ? T[e].dVar : T[e].dMean));
    const up = (T, met) => ELEC.filter(e => T[e] && (met === "var" ? T[e].dVar : T[e].dMean) > 0).length;
    if(sp.mode === "pair" || sp.mode === "cmp"){
      const [r0, r1] = sp.rows, m0 = meanD(r0.T, S.met), m1 = meanD(r1.T, S.met);
      const n0 = sp.mode === "pair" ? `A ${S.pair[0].id}` : sp.G[0].name, n1 = sp.mode === "pair" ? `B ${S.pair[1].id}` : sp.G[1].name;
      setTitle("t-topo", `Topomapas θ: ${sp.mode === "pair" ? "personas A y B" : "dos grupos"}`,
        `Δ${METN[S.met]} medio: ${n0} ${fsr(m0)}, ${n1} ${fsr(m1)}`);
      return;
    }
    if(sp.mode === "group"){
      setTitle("t-topo", "Topomapas θ: tu selección", `Δσθ &gt; 0 en ${up(sp.rows[0].T, "var")} de 61 electrodos, n = ${sp.n}, sin prueba por electrodo`);
      return;
    }
    const v = sigCount("var"), m = sigCount("mean");
    setTitle("t-topo", "Topomapas θ: NS, SD y Δ",
      `0 de 61 tras FDR; p &lt; 0.05 sin corregir: σθ ${v.p}, μθ ${m.p}`.replace(/^0/, String(v.q + m.q)));
    k.html(`<span class="k"><i class="ring"></i>p &lt; 0.05</span><span class="k"><i class="dot" style="background:var(--ink)"></i>FDR</span>`);
  }
  bus.on("select.topo", e => { if(!(e && e.live)) render(); });
  bus.on("pin.topo", () => render());
  return {render, rebuild(){}};
})();
