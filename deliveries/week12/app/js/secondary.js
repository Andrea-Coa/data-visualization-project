/* Vistas secundarias (columna derecha, en acordeón). Datos: data/aperiodic.json y data/connectivity.json, generados
   desde el EEG crudo con tools/build_secondary.py. Ambas siguen a la selección del resto de la app: con personas
   elegidas muestran su promedio (sin prueba, como los topomapas); sin selección, las 68 con sus pruebas.
   1. Oscilatoria o aperiódica: ¿el efecto theta es oscilación o el fondo 1/f? (Bai et al., 2024; Li, 2026;
      Monchy et al.). Espectro con su ajuste aperiódico, Δ exponente y Δ offset por electrodo, y Δσθ frente a
      Δσθ periódica.
   2. Sincronía θ entre regiones: wPLI² debiased con referencia promedio, 10 regiones y 45 pares. */
const side = (() => {
  const elA = $("aper"), elC = $("conn"), elE = $("eye");
  const isOpen = el => el.closest(".sec").dataset.open === "true";
  // personas de la vista: la selección (las que tienen dato) o todas
  const idsOf = all => { const s = S.selected ? S.selected.filter(id => all.includes(id)) : []; return s.length ? s : all; };
  const empty = (el, msg) => { d3.select(el).selectAll("*").remove(); d3.select(el).append("p").attr("class", "note").style("color", "var(--muted)").text(msg); };
  const short = id => id.replace("sub-", "S");

  function render(){
    if(isOpen(elA)) renderAper(); else d3.select(elA).selectAll("*").remove();
    if(isOpen(elC)) renderConn(); else d3.select(elC).selectAll("*").remove();
    if(isOpen(elE)) renderEye(); else d3.select(elE).selectAll("*").remove();
    // el título de cada vista se escribe al final del dibujo y puede pasar a dos líneas, lo que achica la caja:
    // si el gráfico quedó más alto que su caja, se redibuja una vez con el alto real
    [[elA, renderAper], [elC, renderConn], [elE, renderEye]].forEach(([el, f]) => {
      const g = isOpen(el) && el.querySelector("svg");
      if(g && g.getBoundingClientRect().height > el.clientHeight+2) f();
    });
  }

  // ---------------------------------------------------------------- oscilatoria o aperiódica
  function renderAper(){
    if(!APER){ empty(elA, "Data missing (data/aperiodic.json): generate it with tools/build_secondary.py."); setTitle("t-aper", "", ""); return; }
    d3.select(elA).selectAll("*").remove();
    const W = elA.clientWidth || 280, H = Math.max(300, elA.clientHeight || 520);
    const svg = d3.select(elA).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("height", H).style("height", H+"px")
      .attr("role", "img").attr("aria-label", "Spectrum with aperiodic fit, change in exponent and offset per electrode, and theta variability against its periodic part");
    const all = Object.keys(APER.persons), ids = idsOf(all), sel = ids.length < all.length, E = APER.meta.electrodes;
    const h1 = Math.round(H*.32), h2 = Math.round(H*.27), y2 = h1+14, y3 = y2+h2+16, h3 = H-y3;
    // ---- 1. espectro: media de log10 potencia (todas las regiones) y ajuste aperiódico medio
    const fr = APER.spectrum.freqs, spec = c => fr.map((f, i) => d3.mean(ids, id => APER.spectrum.persons[id] && APER.spectrum.persons[id][c][i]));
    const apOf = c => { const ex = d3.mean(ids, id => d3.mean(APER.persons[id].exp[c === "NS" ? 0 : 1])), of = d3.mean(ids, id => d3.mean(APER.persons[id].off[c === "NS" ? 0 : 1])); return {ex, of}; };
    const lines = ["NS", "SD"].map(c => ({c, col:c === "NS" ? C.ns : C.sd, y:spec(c), ap:apOf(c)}));
    const m = {l:44, r:12, t:6, b:22}, sx = d3.scaleLinear().domain([1, 40]).range([m.l, W-m.r]);
    const sy = d3.scaleLinear().domain(d3.extent(lines.flatMap(l => l.y.concat(fr.map(f => l.ap.of-l.ap.ex*Math.log10(f)))))).nice().range([h1-m.b, m.t]);
    svg.append("rect").attr("x", sx(4)).attr("width", sx(8)-sx(4)).attr("y", m.t).attr("height", h1-m.b-m.t).attr("fill", C.ink).attr("opacity", .06);
    svg.append("text").attr("class", "mdim").attr("x", (sx(4)+sx(8))/2).attr("y", m.t+10).attr("text-anchor", "middle").text("θ");
    svg.append("g").attr("class", "axis").attr("transform", `translate(0,${h1-m.b})`).call(d3.axisBottom(sx).tickValues([1, 10, 20, 30, 40]).tickSizeOuter(0));
    svg.append("text").attr("class", "mdim").attr("x", m.l-6).attr("y", h1-m.b+14).attr("text-anchor", "end").text("Hz");
    svg.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(sy).ticks(3).tickSizeOuter(0)).call(a => a.select(".domain").remove());
    svg.append("text").attr("class", "atitle").attr("transform", "rotate(-90)").attr("x", -(m.t+h1-m.b)/2).attr("y", 8).attr("text-anchor", "middle").style("font-size", "10px").text("log₁₀ power");
    lines.forEach(l => {
      svg.append("path").attr("fill", "none").attr("stroke", l.col).attr("stroke-width", 1.8).attr("d", d3.line().x((v, i) => sx(fr[i])).y(v => sy(v))(l.y));
      svg.append("path").attr("fill", "none").attr("stroke", l.col).attr("stroke-width", 1.2).attr("stroke-dasharray", "4 3")
        .attr("d", d3.line().x(f => sx(f)).y(f => sy(l.ap.of-l.ap.ex*Math.log10(f)))(fr));
    });
    const lg = svg.append("g").attr("transform", `translate(${W-m.r-62},${m.t+4})`);   // se reubica según el ancho real del texto
    [["Normal Sleep", C.ns, 0], ["Sleep Deprivation", C.sd, 13], ["1/f fit", C.ink2, 26]].forEach(([t, c, dy]) => {
      lg.append("line").attr("x1", 0).attr("x2", 12).attr("y1", dy).attr("y2", dy).attr("stroke", c).attr("stroke-width", 1.6).attr("stroke-dasharray", t === "1/f fit" ? "4 3" : null);
      lg.append("text").attr("class", "mdim").attr("x", 16).attr("y", dy+3.5).text(t);
    });
    lg.attr("transform", `translate(${W-m.r-lg.node().getBBox().width-2},${m.t+4})`);
    // ---- 2. Δ exponente y Δ offset por electrodo (misma interpolación que la matriz)
    const dOf = k => { const v = {}; E.forEach((e, i) => { const x = d3.mean(ids, id => { const a = APER.persons[id][k]; return a[0][i] != null && a[1][i] != null ? a[1][i]-a[0][i] : null; }); if(x != null) v[e] = x; }); return v; };
    const maps = [["exp", "Δ exponent"], ["off", "Δ offset"]], mw = (W-12)/2, R = Math.min(mw/2-14, (h2-34)/2);
    maps.forEach(([k, lab], j) => {
      const v = dOf(k), mx = d3.max(Object.values(v), Math.abs) || 1, col = x => C.div((x+mx)/(2*mx));
      const f = topo.mini(v, col), cx = 6+mw*j+mw/2, cy = y2+22+R, cid = `ac${k}`;
      svg.append("defs").append("clipPath").attr("id", cid).append("circle").attr("cx", cx).attr("cy", cy).attr("r", R);
      svg.append("text").attr("class", "colhead").attr("x", cx).attr("y", y2+8).style("font-size", "11px").text(lab);
      svg.append("image").attr("x", cx-R).attr("y", cy-R).attr("width", 2*R).attr("height", 2*R).attr("preserveAspectRatio", "none").attr("clip-path", `url(#${cid})`).attr("href", f.href);
      svg.append("circle").attr("class", "head").attr("cx", cx).attr("cy", cy).attr("r", R);
      svg.append("path").attr("class", "head").attr("d", `M ${cx-5} ${cy-R+1} L ${cx} ${cy-R-6} L ${cx+5} ${cy-R+1}`);
      const g = APER.group[k];
      E.forEach((e, i) => { if(!COORDS[e]) return; const sig = !sel && g.p[i] < .05;
        svg.append("circle").attr("cx", cx+COORDS[e][0]*R).attr("cy", cy-COORDS[e][1]*R).attr("r", sig ? 3 : .9)
          .attr("fill", sig && g.q[i] < .05 ? C.mark : (sig ? "none" : C.edot)).attr("stroke", sig ? C.mark : "none").attr("stroke-width", 1.2); });
      svg.append("text").attr("class", "mdim").attr("x", cx).attr("y", cy+R+12).attr("text-anchor", "middle").text(`${fsr(-mx)} to ${fsr(mx)}`);
    });
    // ---- 3. Δσθ (θ relativa) frente a Δσθ periódica, por persona, en la región del header
    const sg = APER.sigma[S.roi], pts = Object.entries(sg.persons).map(([id, v]) => ({id, x:v[0], y:v[1]})).filter(d => d.x != null && d.y != null);
    const mm = {l:44, r:14, t:4, b:34}, px = d3.scaleLinear().domain(d3.extent(pts, d => d.x)).nice().range([mm.l, W-mm.r]);
    const py = d3.scaleLinear().domain(d3.extent(pts, d => d.y)).nice().range([y3+h3-mm.b, y3+mm.t]);
    svg.append("g").attr("class", "axis").attr("transform", `translate(0,${y3+h3-mm.b})`).call(d3.axisBottom(px).ticks(3).tickSizeOuter(0).tickFormat(fTick(L.format("+.2~f"))));
    svg.append("g").attr("class", "axis").attr("transform", `translate(${mm.l},0)`).call(d3.axisLeft(py).ticks(3).tickSizeOuter(0).tickFormat(fTick(L.format("+.2~f")))).call(a => a.select(".domain").remove());
    svg.append("text").attr("class", "atitle").attr("x", (mm.l+W-mm.r)/2).attr("y", y3+h3-2).attr("text-anchor", "middle").style("font-size", "10px").text(`Δσθ ${ROI[S.roi].name} (relative θ)`);
    svg.append("text").attr("class", "atitle").attr("transform", "rotate(-90)").attr("x", -(y3+h3/2)).attr("y", 8).attr("text-anchor", "middle").style("font-size", "10px").text("Δσθ periodic");
    const ss = S.selected ? new Set(S.selected) : null;
    const dots = svg.append("g").selectAll("circle").data(pts).join("circle").attr("cx", d => px(d.x)).attr("cy", d => py(d.y)).attr("r", 3.6)
      .attr("fill", d => S.vuln.has(d.id) ? C.vuln : C.rest).attr("stroke", d => ss && ss.has(d.id) ? C.ink : C.panel).attr("stroke-width", d => ss && ss.has(d.id) ? 2 : .8).style("cursor", "pointer")
      .on("pointerenter", (ev, d) => showTip(ev, `<div class="h">${d.id}</div>` + trow("Δσθ (relative θ)", fsr(d.x)) + trow("Δσθ periodic", fsr(d.y))))
      .on("pointermove", ev => moveTip(ev)).on("pointerleave", hideTip)
      .on("click", (ev, d) => { hideTip(); const p = P.find(o => o.id === d.id); if(!p) return; if(ev.shiftKey) pin(p); else togglePick(p); });
    dots.filter(d => ss && ss.has(d.id)).raise();
    svg.append("text").attr("class", "ab").attr("x", mm.l+4).attr("y", y3+mm.t+12).style("font-size", "11px").text(`ρ = ${f2(sg.rho_periodic)} · 1/f explains ${Math.round(sg.r2_exponent*100)}%`);
    // ---- título: el hallazgo y, en el ícono ⓘ, de dónde sale
    const g = APER.global;
    setTitle("t-aper", `σθ is oscillatory, not 1/f: ρ = ${f2(sg.rho_periodic)}`, nb(`n = ${sg.n}${sel ? `; maps and spectrum: your selection (${ids.length})` : ""}`),
      notes(`specparam (Bai et al., 2024 settings). Aperiodic change: exponent d_z = ${f2(g.exp.dz)} (p = ${fp(g.exp.p)}), offset d_z = ${f2(g.off.dz)} (p = ${fp(g.off.p)}); ${Math.round(APER.theta_peak_fraction.NS*100)}% of electrodes have a 4–8 Hz peak.`,
        `Bottom: each person's Δσθ vs. Δσθ of the periodic component (1/f removed). They agree (ρ = ${f2(sg.rho_periodic)}): σθ is oscillatory, not the 1/f background.`));
  }

  // ---------------------------------------------------------------- sincronía θ entre regiones
  function renderConn(){
    if(!CONN){ empty(elC, "Data missing (data/connectivity.json): generate it with tools/build_secondary.py."); setTitle("t-conn", "", ""); return; }
    d3.select(elC).selectAll("*").remove();
    const W = elC.clientWidth || 280, H = Math.max(300, elC.clientHeight || 480);
    const svg = d3.select(elC).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("height", H).style("height", H+"px")
      .attr("role", "img").attr("aria-label", "Change in theta synchrony between 10 scalp regions");
    const all = Object.keys(CONN.persons), ids = idsOf(all), sel = ids.length < all.length, G = CONN.group;
    const d = CONN.pairs.map((p, i) => d3.mean(ids, id => CONN.persons[id][1][i]-CONN.persons[id][0][i]));
    const mx = d3.max(d, Math.abs) || 1, col = x => C.div((x+mx)/(2*mx));
    // arriba el grafo sobre la cabeza; abajo, el efecto de cada par con su IC 95 % (caterpillar plot)
    const R = Math.min(W/2-26, (H*.52-70)/2), cx = W/2, cy = 18+R;
    const node = {}; Object.entries(CONN.meta.regions).forEach(([r, cs]) => { const v = cs.filter(c => COORDS[c]); node[r] = [cx+d3.mean(v, c => COORDS[c][0])*R, cy-d3.mean(v, c => COORDS[c][1])*R]; });
    svg.append("circle").attr("class", "head").attr("cx", cx).attr("cy", cy).attr("r", R);
    svg.append("path").attr("class", "head").attr("d", `M ${cx-7} ${cy-R+1} L ${cx} ${cy-R-8} L ${cx+7} ${cy-R+1}`);
    const order = d3.range(d.length).sort((a, b) => Math.abs(d[a])-Math.abs(d[b]));   // los cambios grandes encima
    const edges = svg.append("g").selectAll("line").data(order).join("line")
      .attr("x1", i => node[CONN.pairs[i][0]][0]).attr("y1", i => node[CONN.pairs[i][0]][1]).attr("x2", i => node[CONN.pairs[i][1]][0]).attr("y2", i => node[CONN.pairs[i][1]][1])
      .attr("stroke", i => col(d[i])).attr("stroke-linecap", "round")
      .attr("stroke-width", i => sel ? 1.2+3*Math.abs(d[i])/mx : (G.p[i] < .05 ? 4 : 1.3)).attr("opacity", i => sel ? .35+.6*Math.abs(d[i])/mx : (G.p[i] < .05 ? .95 : .4))
      .style("cursor", "help")
      .on("pointerenter", (ev, i) => showTip(ev, `<div class="h">${CONN.pairs[i].join(" – ")}</div>` + trow("wPLI² Normal → Deprivation", `${f3(G.NS[i])} → ${f3(G.SD[i])}`) +
        trow(sel ? `Δ, your selection (${ids.length})` : "Δ Deprivation − Normal", fsr(d[i])) + (sel ? "" : trow("d_z · p · q", `${f2(G.dz[i])} · ${fp(G.p[i])} · ${fp(G.q[i])}`))))
      .on("pointermove", ev => moveTip(ev)).on("pointerleave", hideTip);
    const baseW = i => sel ? 1.2+3*Math.abs(d[i])/mx : (G.p[i] < .05 ? 4 : 1.3), baseO = i => sel ? .35+.6*Math.abs(d[i])/mx : (G.p[i] < .05 ? .95 : .4);
    const focus = k => edges.attr("stroke-width", i => k == null ? baseW(i) : (i === k ? 6 : baseW(i))).attr("opacity", i => k == null ? baseO(i) : (i === k ? 1 : .12));
    Object.entries(node).forEach(([r, [x, y]]) => {
      svg.append("circle").attr("cx", x).attr("cy", y).attr("r", 10).attr("fill", C.panel).attr("stroke", C.ink2).attr("stroke-width", 1.2);
      svg.append("text").attr("x", x).attr("y", y+3.5).attr("text-anchor", "middle").style("font-size", "8.5px").style("font-weight", 600).style("fill", "var(--ink)").text(r);
    });
    // escala y resumen
    const ly = cy+R+24, gid = "cgrad", lg = svg.append("defs").append("linearGradient").attr("id", gid);
    d3.range(0, 1.001, .1).forEach(t => lg.append("stop").attr("offset", t).attr("stop-color", C.div(t)));
    svg.append("rect").attr("x", cx-70).attr("y", ly).attr("width", 140).attr("height", 7).attr("rx", 3).attr("fill", `url(#${gid})`);
    svg.append("text").attr("class", "mdim").attr("x", cx-74).attr("y", ly+7).attr("text-anchor", "end").text(`${fsr(-mx)} less`);
    svg.append("text").attr("class", "mdim").attr("x", cx+74).attr("y", ly+7).text(`more ${fsr(mx)}`);
    svg.append("text").attr("class", "mdim").attr("x", cx).attr("y", ly+22).attr("text-anchor", "middle").text(sel ? "Δ wPLI² (SD − NS), mean of your selection" : "Δ wPLI² (SD − NS); thick line: uncorrected p < 0.05");
    // ---- efecto por par: media de Δ con IC 95 %, ordenado; con selección, el IC se calcula con esas personas
    const tq = df => { const z = 1.959964; return z+(z**3+z)/(4*df)+(5*z**5+16*z**3+3*z)/(96*df*df)+(3*z**7+19*z**5+17*z**3-15*z)/(384*df**3); };   // cuantil t 0.975 (Cornish-Fisher)
    const ci = CONN.pairs.map((_, i) => {
      if(!sel) return G.ci[i];
      const v = ids.map(id => CONN.persons[id][1][i]-CONN.persons[id][0][i]); if(v.length < 3) return [d[i], d[i]];
      const h = tq(v.length-1)*d3.deviation(v)/Math.sqrt(v.length); return [d[i]-h, d[i]+h];
    });
    const y0 = ly+40, m2 = {l:40, r:8, t:18, b:16}, rk = d3.range(d.length).sort((a, b) => d[a]-d[b]);
    const px = d3.scaleBand().domain(rk).range([m2.l, W-m2.r]).padding(.25);
    const py = d3.scaleLinear().domain(d3.extent(ci.flat().concat([0]))).nice().range([H-m2.b, y0+m2.t]);
    svg.append("text").attr("class", "colhead").attr("x", m2.l).attr("y", y0+8).style("text-anchor", "start").style("font-size", "11px").text("Effect per pair: mean Δ ± 95% CI");
    svg.append("g").attr("class", "axis").attr("transform", `translate(${m2.l},0)`).call(d3.axisLeft(py).ticks(4).tickSizeOuter(0).tickFormat(fTick(L.format("+.2~f")))).call(a => a.select(".domain").remove());
    svg.append("line").attr("class", "zero").attr("x1", m2.l).attr("x2", W-m2.r).attr("y1", py(0)).attr("y2", py(0)).attr("stroke", C.ink2).attr("stroke-dasharray", "3 3");
    svg.append("text").attr("class", "mdim").attr("x", W-m2.r).attr("y", H-3).attr("text-anchor", "end").text("45 region pairs, sorted by Δ");
    const cg = svg.append("g").selectAll("g").data(rk).join("g").style("cursor", "help");
    cg.append("line").attr("x1", i => px(i)+px.bandwidth()/2).attr("x2", i => px(i)+px.bandwidth()/2).attr("y1", i => py(ci[i][0])).attr("y2", i => py(ci[i][1]))
      .attr("stroke", i => col(d[i])).attr("stroke-width", 1.4);
    cg.append("circle").attr("cx", i => px(i)+px.bandwidth()/2).attr("cy", i => py(d[i])).attr("r", 2.6)
      .attr("fill", i => (ci[i][1] < 0 || ci[i][0] > 0) ? col(d[i]) : C.panel).attr("stroke", i => col(d[i])).attr("stroke-width", 1.2);
    cg.append("rect").attr("x", i => px(i)).attr("width", px.step()).attr("y", y0+m2.t).attr("height", H-m2.b-y0-m2.t).attr("fill", "transparent")
      .on("pointerenter", (ev, i) => { focus(i); showTip(ev, `<div class="h">${CONN.pairs[i].join(" – ")}</div>` + trow(sel ? `Δ, your selection (${ids.length})` : "Δ Deprivation − Normal", fsr(d[i])) +
        trow("95% CI", `[${fsr(ci[i][0])}, ${fsr(ci[i][1])}]`) + (sel ? "" : trow("p · q", `${fp(G.p[i])} · ${fp(G.q[i])}`))); })
      .on("pointermove", ev => moveTip(ev)).on("pointerleave", () => { focus(null); hideTip(); });
    const g = CONN.global, down = d.filter(x => x < 0).length;
    setTitle("t-conn", `θ synchrony: lower in ${down} of 45 pairs`, nb(sel ? `your selection, n = ${ids.length}` : `none survives FDR; n = ${CONN.meta.n}`),
      notes(`Debiased wPLI², 4–8 Hz, average reference, 10 regions (45 pairs). Global d_z = ${f2(g.dz)}, permutation p = ${fp(g.p_perm)}; no pair survives FDR.`,
        "Bottom: mean Δ per pair with 95% CI, sorted. Exploratory: resting theta connectivity may partly reflect aperiodic activity.",
        "Data: tools/build_secondary.py from the raw EEG (ds004902)."));
  }

  // ---------------------------------------------------------------- control de parpadeos
  // ds004902 no tiene canal EOG y el pipeline no usa ICA: ¿los parpadeos explican σθ? (tools/build_quality.py)
  function renderEye(){
    if(!QUAL){ empty(elE, "Data missing (data/quality.json): generate it with tools/build_quality.py."); setTitle("t-eye", "", ""); return; }
    d3.select(elE).selectAll("*").remove();
    const W = elE.clientWidth || 280, H = Math.max(300, elE.clientHeight || 520);
    const svg = d3.select(elE).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("height", H).style("height", H+"px")
      .attr("role", "img").attr("aria-label", "Blink rate per person in NS and SD, and theta variability with and without blink-contaminated windows");
    const Q = QUAL.persons, sm = QUAL.summary[S.roi], ss = S.selected ? new Set(S.selected) : null;
    const colOf = id => S.vuln.has(id) ? C.vuln : C.rest;
    // ---- 1. parpadeos por minuto, NS → SD (una línea por persona)
    const h1 = Math.round(H*.36), m1 = {l:40, r:30, t:20, b:18};
    const bl = Object.entries(Q).filter(([, q]) => q.NS && q.SD && q.NS.blinks_per_min != null && q.SD.blinks_per_min != null).map(([id, q]) => ({id, a:q.NS.blinks_per_min, b:q.SD.blinks_per_min}));
    const bx = d3.scalePoint().domain(["NS", "SD"]).range([m1.l+18, W-m1.r-18]);
    const by = d3.scaleLinear().domain([0, d3.max(bl, d => Math.max(d.a, d.b))]).nice().range([h1-m1.b, m1.t]);
    svg.append("text").attr("class", "colhead").attr("x", m1.l-34).attr("y", 11).style("text-anchor", "start").style("font-size", "11px").text("Blinks per minute (Fp1/Fp2)");
    svg.append("g").attr("class", "axis").attr("transform", `translate(${m1.l},0)`).call(d3.axisLeft(by).ticks(4).tickSizeOuter(0)).call(a => a.select(".domain").remove());
    [["NS", C.ns], ["SD", C.sd]].forEach(([c, col]) => svg.append("text").attr("x", bx(c)).attr("y", h1-2).attr("text-anchor", "middle").style("font-size", "11px").style("font-weight", 600).style("fill", col).text(c === "NS" ? "Normal Sleep" : "Sleep Deprivation"));
    const sl = svg.append("g").selectAll("line").data(bl.sort((u, v) => (ss && ss.has(u.id)) - (ss && ss.has(v.id)))).join("line")
      .attr("x1", bx("NS")).attr("x2", bx("SD")).attr("y1", d => by(d.a)).attr("y2", d => by(d.b))
      .attr("stroke", d => ss && ss.has(d.id) ? C.ink : colOf(d.id)).attr("stroke-width", d => ss && ss.has(d.id) ? 2 : 1).attr("opacity", d => ss ? (ss.has(d.id) ? 1 : .25) : .55)
      .style("cursor", "pointer")
      .on("pointerenter", (ev, d) => showTip(ev, `<div class="h">${d.id}</div>` + trow("blinks/min Normal → Deprivation", `${d.a} → ${d.b}`)))
      .on("pointermove", ev => moveTip(ev)).on("pointerleave", hideTip)
      .on("click", (ev, d) => { hideTip(); const p = P.find(o => o.id === d.id); if(!p) return; if(ev.shiftKey) pin(p); else togglePick(p); });
    const medA = d3.median(bl, d => d.a), medB = d3.median(bl, d => d.b);
    svg.append("line").attr("x1", bx("NS")).attr("x2", bx("SD")).attr("y1", by(medA)).attr("y2", by(medB)).attr("stroke", C.ink).attr("stroke-width", 3).attr("stroke-linecap", "round");
    svg.append("text").attr("class", "ab").attr("x", (bx("NS")+bx("SD"))/2).attr("y", by(Math.max(medA, medB))-7).attr("text-anchor", "middle").style("font-size", "10.5px")
      .text(`median ${L.format(".1f")(medA)} → ${L.format(".1f")(medB)}`);
    // ---- 2. Δσθ con todas las ventanas frente a Δσθ sin las ventanas con parpadeos
    const y0 = h1+18, m2 = {l:44, r:14, t:14, b:34}, k = S.roi;
    const pts = Object.entries(Q).map(([id, q]) => ({id, x:q[`d_sigma_${k}_win`], y:q[`d_sigma_${k}_clean`]})).filter(d => d.x != null && d.y != null);
    const ext = d3.extent(pts.flatMap(d => [d.x, d.y]));
    const px = d3.scaleLinear().domain(ext).nice().range([m2.l, W-m2.r]), py = d3.scaleLinear().domain(px.domain()).range([H-m2.b, y0+m2.t]);
    svg.append("text").attr("class", "colhead").attr("x", m2.l-38).attr("y", y0+6).style("text-anchor", "start").style("font-size", "11px").text(`Δσθ ${ROI[k].name}: with vs without blinks`);
    svg.append("line").attr("x1", px(ext[0])).attr("y1", py(ext[0])).attr("x2", px(ext[1])).attr("y2", py(ext[1])).attr("stroke", C.ink2).attr("stroke-dasharray", "4 3");
    svg.append("g").attr("class", "axis").attr("transform", `translate(0,${H-m2.b})`).call(d3.axisBottom(px).ticks(3).tickSizeOuter(0).tickFormat(fTick(L.format("+.2~f"))));
    svg.append("g").attr("class", "axis").attr("transform", `translate(${m2.l},0)`).call(d3.axisLeft(py).ticks(3).tickSizeOuter(0).tickFormat(fTick(L.format("+.2~f")))).call(a => a.select(".domain").remove());
    svg.append("text").attr("class", "atitle").attr("x", (m2.l+W-m2.r)/2).attr("y", H-2).attr("text-anchor", "middle").style("font-size", "10px").text("Δσθ, all 1-s windows");
    svg.append("text").attr("class", "atitle").attr("transform", "rotate(-90)").attr("x", -(y0+m2.t+H-m2.b)/2).attr("y", 8).attr("text-anchor", "middle").style("font-size", "10px").text("Δσθ, blink windows removed");
    svg.append("g").selectAll("circle").data(pts.sort((u, v) => (ss && ss.has(u.id)) - (ss && ss.has(v.id)))).join("circle")
      .attr("cx", d => px(d.x)).attr("cy", d => py(d.y)).attr("r", 3.6).attr("fill", d => colOf(d.id))
      .attr("stroke", d => ss && ss.has(d.id) ? C.ink : C.panel).attr("stroke-width", d => ss && ss.has(d.id) ? 2 : .8).style("cursor", "pointer")
      .on("pointerenter", (ev, d) => showTip(ev, `<div class="h">${d.id}</div>` + trow("Δσθ, all windows", fsr(d.x)) + trow("Δσθ, without blinks", fsr(d.y))))
      .on("pointermove", ev => moveTip(ev)).on("pointerleave", hideTip)
      .on("click", (ev, d) => { hideTip(); const p = P.find(o => o.id === d.id); if(!p) return; if(ev.shiftKey) pin(p); else togglePick(p); });
    svg.append("text").attr("class", "ab").attr("x", m2.l+4).attr("y", y0+m2.t+12).style("font-size", "11px").text(`ρ = ${f2(sm.rho_clean_vs_all)} · n = ${sm.n_clean} · dashed: identity`);
    const bt = QUAL.meta.d_blinks_test;
    setTitle("t-eye", `Blinks do not drive σθ: ρ = ${f2(sm.rho_clean_vs_all)} without them`, nb(`${ROI[k].name}; n = ${sm.n_clean}`),
      notes(`Blinks detected on Fp1/Fp2 of the raw EEG; rate ${f2(QUAL.meta.blinks_per_min.NS.median)} → ${f2(QUAL.meta.blinks_per_min.SD.median)}/min (p = ${fp(bt.p)}). Δblinks vs Δσθ: ρ = ${f2(sm.rho_dblinks_vs_dsigma)}.`,
        `Bottom: Δσθ from 1-s windows, all (x) vs. without those within 0.25 s of a blink (y). On the identity line: blinks left after ICA do not change σθ.`));
  }

  bus.on("select.side", e => { if(!(e && e.live)) render(); });
  bus.on("pin.side", () => render());
  bus.on("axes.side", () => render());
  return {render};
})();
