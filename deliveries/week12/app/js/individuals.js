/* Heatmap electrodo × persona (tareas T3, T4 y T7), arriba a la izquierda junto a la dispersión. Quita el promedio y
   muestra a cada persona. Transpuesto para caber en un panel angosto: una columna por persona, con dos grupos
   definidos solo por la conducta, nunca por theta (si el grupo dependiera
   de theta, su firma en theta sería circular): quienes se deterioran (peor que la mediana del marcador del header)
   frente a quienes resisten. Con Comparar, los dos grupos de la comparación; con lazo, tu selección frente al resto
   con marcador. Quien no tiene el marcador no puede clasificarse y no responde a la pregunta, así que no se muestra.
   Filas = 61 electrodos por región, de adelante hacia atrás. Celda = Δ (SD − NS) de la métrica del header.
   Cada grupo lleva su columna C(e) = proporción del grupo que sube menos la que baja. */
const indiv = (() => {
  const heatEl = $("heat");
  const FRONTAL = ["Fp1", "Fp2", "Fpz", "AF3", "AF4", "AF7", "AF8", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "Fz"];
  const CT = ["FC1", "FC2", "FC3", "FC4", "FC5", "FC6", "FT7", "FT8", "C1", "C2", "C3", "C4", "C5", "C6", "Cz", "T7", "T8",
    "CP1", "CP2", "CP3", "CP4", "CP5", "CP6", "CPz", "TP7", "TP8", "TP9", "TP10"];
  const REG = ["Frontal", "Centro-temporal", "Posterior"], REG_SHORT = ["F", "C-T", "P"];
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
  // hv.row = persona (columna) y hv.col = índice de electrodo (fila): mismos nombres que en el estado compartido
  function drawHeat(){
    d3.select(heatEl).selectAll("*").remove();
    const W = heatEl.clientWidth || 400, H = Math.max(180, heatEl.clientHeight || 400), {E, D, groups, lim, mean} = model;   // nunca más alto que su panel
    const nP = model.ids.length, regW = 14, regGap = 4, gGap = 6, cS = 14, mW = 8, gTop = 14, top0 = gTop+30;
    const rh = (H-top0-2*regGap-2)/E.length, elecLab = rh >= 8;   // nombres de electrodo solo si caben
    const labW = regW+(elecLab ? 30 : 6);
    const cw = Math.min(16, (W-labW-mW-4-groups.length*(cS+3)-(groups.length-1)*gGap-2)/nP);
    const rowY = i => top0+i*rh+regionOf(E[i])*regGap, bottom = rowY(E.length-1)+rh;
    const svg = d3.select(heatEl).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("height", H).style("height", H+"px").attr("role", "img")
      .attr("aria-label", `Heatmap de 61 electrodos por ${nP} personas con su cambio ${METN[model.met]}`);
    const col = v => v == null ? "transparent" : C.div((Math.max(-lim, Math.min(lim, v))+lim)/(2*lim));
    // rótulo vertical sobre una columna, en la banda entre los nombres de grupo y las celdas
    const vlab = (x, txt, size) => svg.append("text").attr("class", "alab").attr("transform", `translate(${x},${top0-4}) rotate(-90)`).attr("dy", ".35em").style("font-size", size+"px").text(txt);
    // columnas: media de todos, y por grupo su C(e) seguida de una columna por persona
    let x = labW; const mX = x; x += mW+4; model.colX = new Map();
    groups.forEach((g, gi) => {
      if(gi){ x += gGap; svg.append("line").attr("x1", x-gGap/2).attr("x2", x-gGap/2).attr("y1", 2).attr("y2", bottom).attr("stroke", C.ink2).attr("stroke-width", 1.5); }
      g.cX = x; x += cS+3; g.x0 = x;
      g.ids.forEach(id => { model.colX.set(id, x); x += cw; });
      g.x1 = x;
    });
    const right = x;
    // regiones: nombre vertical a la izquierda; la región del header lleva su línea en tinta
    REG.forEach((r, k) => {
      const idx = E.map((e, i) => regionOf(e) === k ? i : -1).filter(i => i >= 0), y0 = rowY(idx[0]), y1 = rowY(idx[idx.length-1])+rh, yc = (y0+y1)/2;
      // el rótulo se acorta si la región es baja: "Frontal · 16" → "Frontal" → "F"
      const full = `${r} · ${idx.length}`, lab = full.length*6.6 <= y1-y0 ? full : (r.length*6.6 <= y1-y0 ? r : REG_SHORT[k]);
      svg.append("text").attr("class", "colhead").attr("transform", `translate(${regW/2},${yc}) rotate(-90)`).attr("dy", ".35em").style("font-size", "11px").text(lab);
      svg.append("line").attr("x1", regW+1).attr("x2", regW+1).attr("y1", y0).attr("y2", y1).attr("stroke", k === (S.roi === "front" ? 0 : 1) ? C.ink : C.rule2).attr("stroke-width", 1.5);
    });
    if(elecLab) svg.append("g").selectAll("text").data(E).join("text").attr("class", "alab").attr("x", labW-3).attr("y", (e, i) => rowY(i)+rh/2).attr("dy", ".35em")
      .attr("text-anchor", "end").style("font-size", Math.min(9, rh)+"px").text(e => e);
    vlab(mX+mW/2, "media", 9);
    svg.append("g").selectAll("rect").data(mean).join("rect").attr("x", mX).attr("y", (v, i) => rowY(i)).attr("width", mW).attr("height", rh+.3).attr("fill", col);
    const cells = svg.append("g");
    groups.forEach(g => {
      // nombre del grupo sobre su bloque; si no cabe, sin conteo y con letra menor (mínimo 7 px)
      const bw = g.x1-g.cX, full = `${g.name} (${g.ids.length})`, lab = full.length*6.2 <= bw ? full : g.name;
      svg.append("text").attr("class", "mdim").attr("x", (g.cX+g.x1)/2).attr("y", gTop-3).attr("text-anchor", "middle").style("fill", g.color)
        .style("font-size", Math.max(7, Math.min(10, bw/(lab.length*.62)))+"px").text(lab);
      // C(e): barra horizontal desde el centro de su columna (derecha = sube, izquierda = baja)
      const c0 = g.cX+cS/2, half = cS/2-1;
      vlab(c0, "C(e)", 9);
      svg.append("line").attr("x1", c0).attr("x2", c0).attr("y1", top0).attr("y2", bottom).attr("stroke", C.rule2);
      svg.append("g").selectAll("rect").data(g.cons).join("rect").attr("x", c => c >= 0 ? c0 : c0-Math.abs(c)*half).attr("width", c => Math.max(.6, Math.abs(c)*half))
        .attr("y", (c, i) => rowY(i)+.5).attr("height", Math.max(1, rh-1)).attr("fill", c => c >= 0 ? C.sd : C.ns).attr("opacity", c => .3+.7*Math.abs(c));
      g.ids.forEach(id => {
        const cx0 = model.colX.get(id);
        cells.append("g").selectAll("rect").data(D.get(id)).join("rect").attr("x", cx0).attr("y", (v, i) => rowY(i)).attr("width", cw+.3).attr("height", rh+.3).attr("fill", col);
        if(cw >= 8) vlab(cx0+cw/2, short(id), Math.min(9, cw+1));
      });
    });
    model.geo = {labW, top0, cw, rh, rowY, W, H, right, bottom};
    model.over = svg.append("g").style("pointer-events", "none");
    svg.append("rect").attr("x", labW).attr("width", right-labW).attr("height", H).attr("fill", "transparent").style("cursor", "pointer")
      .on("pointermove", ev => { const h = hit(d3.pointer(ev, svg.node())); setHover(h.row, h.col); if(h.row || h.col != null) showTip(ev, tipHeat(h)); else hideTip(); })
      .on("pointerleave", () => { setHover(null, null); hideTip(); })
      .on("click", ev => { const h = hit(d3.pointer(ev, svg.node())); hideTip(); if(h.row) pin(P.find(d => d.id === h.row)); else if(h.col != null) setElec(model.E[h.col]); });
    paintHeat();
  }
  function hit([px, py]){
    const {rowY, cw, rh, bottom} = model.geo; let col = null, row = null;
    model.colX.forEach((x, id) => { if(px >= x && px < x+cw) row = id; });
    model.E.forEach((e, i) => { if(py >= rowY(i) && py < rowY(i)+rh) col = i; });
    return {row:py <= bottom ? row : null, col};
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
    const {rowY, cw, rh, labW, right, top0, bottom} = model.geo, o = model.over; o.selectAll("*").remove();
    // persona: contorno de su columna; electrodo: contorno de su fila
    const ring = (id, w) => { const x = model.colX.get(id); if(x == null) return; o.append("rect").attr("x", x-.5).attr("y", top0-1).attr("width", cw+1).attr("height", bottom-top0+2).attr("fill", "none").attr("stroke", C.ink).attr("stroke-width", w); };
    if(hv.row) ring(hv.row, 1.2);
    S.pair.forEach((d, i) => { ring(d.id, 2); const x = model.colX.get(d.id); if(x != null) o.append("text").attr("class", "ab").attr("x", x+cw/2).attr("y", top0-6).attr("text-anchor", "middle").style("font-size", "10px").text("AB"[i]); });
    const rowRing = (i, c) => o.append("rect").attr("x", labW-1).attr("y", rowY(i)-.5).attr("width", right-labW+2).attr("height", rh+1).attr("fill", "none").attr("stroke", c).attr("stroke-width", 1.2);
    if(hv.col != null) rowRing(hv.col, C.ink);
    if(S.elec){ const i = model.E.indexOf(S.elec); if(i >= 0) rowRing(i, C.vuln); }
  }

  // ---------------- títulos ----------------
  function titles(){
    const [a, b] = model.groups, mC = g => d3.mean(g.cons), strong = g => g.cons.filter(c => Math.abs(c) >= .6).length;
    const hInfo = notes(`Una columna por persona y una fila por electrodo, por región de adelante hacia atrás: Δ${METN[model.met]} (SD − NS). Columna "media": promedio de todas las personas.`,
      "C(e), una columna por grupo: proporción del grupo cuyo Δ sube menos la proporción cuyo Δ baja en el electrodo e (de −1 a +1); la barra va a la derecha si sube.",
      "Clic en una columna: persona A o B. Clic en una fila: ese electrodo pasa al eje x de la dispersión.",
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
