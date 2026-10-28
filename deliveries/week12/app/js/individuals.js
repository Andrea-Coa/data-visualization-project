/* Heatmap persona × electrodo (tareas T3, T4 y T7), abajo a la izquierda. Quita el promedio y muestra a cada persona.
   Una fila por persona con dos grupos definidos solo por la conducta, nunca por theta (si el grupo dependiera
   de theta, su firma en theta sería circular): quienes se deterioran (peor que la mediana del marcador del header)
   frente a quienes resisten. Con Comparar, los dos grupos de la comparación; con lazo, tu selección frente al resto
   con marcador. Quien no tiene el marcador no puede clasificarse y no responde a la pregunta, así que no se muestra.
   Columnas = 61 electrodos por región, de adelante hacia atrás. Celda = Δ (SD − NS) de la métrica del header.
   Cada bloque lleva su franja C(e) = proporción del grupo que sube menos la que baja. */
const indiv = (() => {
  const heatEl = $("heat");
  const FRONTAL = ["Fp1", "Fp2", "Fpz", "AF3", "AF4", "AF7", "AF8", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "Fz"];
  const CT = ["FC1", "FC2", "FC3", "FC4", "FC5", "FC6", "FT7", "FT8", "C1", "C2", "C3", "C4", "C5", "C6", "Cz", "T7", "T8",
    "CP1", "CP2", "CP3", "CP4", "CP5", "CP6", "CPz", "TP7", "TP8", "TP9", "TP10"];
  const REG = ["Frontal", "Centro-temporal", "Posterior"];
  let model = null, hv = {row:null, col:null};

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
    model = {met, E, D, groups, ids, mk, lim:d3.quantile(abs, .95) || 1, mean:E.map((e, i) => d3.mean(ids, id => D.get(id)[i]))};
  }

  // ---------------- heatmap ----------------
  function drawHeat(){
    d3.select(heatEl).selectAll("*").remove();
    const W = heatEl.clientWidth || 640, H = Math.max(180, heatEl.clientHeight || 400), {E, D, groups, lim, mean} = model;   // nunca más alto que su panel
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
      // si no cabe en el alto del bloque, se quita el conteo y se reduce la letra (mínimo 7 px)
      const bh = cS+g.ids.length*rh, gy = y+bh/2, full = `${g.name} (${g.ids.length})`, lab = full.length*6.2 <= bh ? full : g.name;
      svg.append("text").attr("class", "mdim").attr("x", gW/2).attr("y", gy).attr("dy", ".35em").attr("text-anchor", "middle")
        .attr("transform", `rotate(-90,${gW/2},${gy})`).style("fill", g.color).style("font-size", Math.max(7, Math.min(10, bh/(lab.length*.62)))+"px").text(lab);
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
    hv = {row, col}; paintHeat();
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
  }
  function render(){ build(); titles(); drawHeat(); }
  bus.on("pin.indiv", () => paintHeat());
  bus.on("hover.indiv", d => { const id = d ? d.id : null; if(hv.row !== id){ hv.row = id; paintHeat(); } });
  bus.on("select.indiv", e => { if(!(e && e.live)) render(); });
  bus.on("axes.indiv", () => render());
  return {render};
})();
