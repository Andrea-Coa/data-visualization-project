/* Vista 3 · Cinco minutos (tarea T6, pregunta Q6: dinámica dentro del registro).
   Sigue a la métrica del header:
   - μθ: potencia theta relativa por época de 4 s, media ± error estándar entre personas del grupo activo.
   - σθ: σθ móvil, la desviación estándar de la θ regional en una ventana deslizante del largo elegido (60 s por defecto), persona a
     persona, y luego media ± error estándar. σθ resume la inestabilidad entre épocas (Cui et al., 2026); su versión
     móvil muestra cuándo aparece dentro de los cinco minutos, en línea con la hipótesis de inestabilidad de estado
     tras la privación de sueño (Doran, Van Dongen y Dinges, 2001). Es exploratoria: Cui et al. resumen la
     variabilidad en un solo número por registro, sin orden temporal.
   Con dos grupos comparados se muestra Δ (SD − NS) de cada grupo.
   Interacción (vista temporal, noviembre 2026):
   - Por defecto todo es estático: los mapas muestran los cinco minutos completos.
   - Clic sobre la serie: los mapas pasan a una ventana del largo elegido (32, 60 o 100 s, selector «Window» de esta
     vista) centrada en ese instante; arrastrar fija un intervalo propio. La dispersión, el mapa de calor y el grafo
     siguen esa ventana. Las marcas de p de una ventana elegida a mano son exploratorias (se puede elegir la ventana
     después de ver dónde el efecto es grande).
   - ▶ (en la vista de topografía) anima la ventana por el registro, época a época.
   - «Series» (en la vista de topografía) muestra bloques sin solapamiento alineados con este eje; aquí se dibujan
     sus límites y, al pasar sobre un mapa de la serie, se resalta su bloque.
   Por qué así: para analizar, los mapas pequeños lado a lado son más precisos que la animación (Robertson et al.,
   2008; Brehmer et al., 2020); la animación queda como modo de presentación. */
const dyn = (() => {
  const el = $("dyn");
  let svg, g, W, H, dx, dy, scan, heads, brush, brushG, cur = null, ln, G = null, XS = [], rev = null, playT = null, readout = null, blk = null;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const m = {t:6, r:18, b:24, l:58};   // izquierda: título del eje y en dos líneas y sus números; abajo, solo las marcas
  const leg = floatLegend();            // las series (con su n) se identifican en la leyenda flotante
  const ex = i => dx(XS[i]);           // tiempo (s) del punto i: centro de la época o de la ventana móvil
  const isVar = () => S.met === "var";
  const nearest = t => Math.max(0, Math.min(XS.length-1, Math.round((t-XS[0])/4)));
  const spanTxt = i => isVar() ? `${XS[i]-rollW()*2}–${XS[i]+rollW()*2} s` : `${XS[i]-2}–${XS[i]+2} s`;

  // Dominio del eje y por banda × métrica × región o electrodo × modo (NS y SD, o Δ con comparación) × largo de la
  // ventana móvil (con σ cambia lo que se mide). Se calcula una vez sobre todas las personas y sobre cada grupo de las
  // comparaciones no circulares (sexo, orden, PSQI), media ± EE con 8 % de margen, y se guarda. «Vulnerables vs
  // resto» no entra (sus grupos dependen del marcador del eje y del scatter). Una selección que se sale del dominio se
  // recorta en el área del gráfico y la ⓘ lo avisa.
  const yCache = new Map();
  let clipped = false;
  function fixedY(met, delta, pref){
    const key = [S.band, met, S.elec && ELEP ? `e:${S.elec}` : `r:${S.roi}`, delta ? "D" : "C", met === "var" ? S.winLen : 0].join("|");
    if(yCache.has(key)) return yCache.get(key);
    const sets = [EEG_IDS, ...COMPARES.filter(c => c.g && !c.circular).flatMap(c => c.g.map(([, f]) => EEG.filter(f).map(d => d.id)))];
    let lo = Infinity, hi = -Infinity;
    sets.forEach(ids => {
      const ss = delta ? [epochDiffStats(ids, pref, met)] : [epochStats(ids, pref, "NS", met), epochStats(ids, pref, "SD", met)];
      ss.forEach(s => s.mean.forEach((v, i) => { if(v == null) return; lo = Math.min(lo, v-s.sem[i]); hi = Math.max(hi, v+s.sem[i]); }));
    });
    if(delta){ lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
    const pad = (hi-lo)*.08 || 1e-3, dom = [lo-pad, hi+pad];
    yCache.set(key, dom); return dom;
  }
  function render(){
    stopPlay({keep:true});
    d3.select(el).selectAll("*").remove();
    W = el.clientWidth || 600; H = Math.round(Math.max(120, el.clientHeight || 220));
    const met = S.met;
    svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("height", H).style("height", H+"px").attr("role", "img")
      .attr("aria-label", isVar() ? `Moving σθ in ${S.winLen*4}-s windows, NS and SD, mean and standard error of the active group`
        : "Theta power per epoch, NS and SD, mean and standard error of the active group");
    svg.append("defs").append("clipPath").attr("id", "dclip").append("rect").attr("x", m.l).attr("y", m.t).attr("width", W-m.l-m.r).attr("height", H-m.t-m.b);
    g = svg.append("g");
    const pref = ROI[S.roi].pref, ids = activeIds();
    G = viewGroups();
    // con comparación: Δ (SD menos NS) de cada grupo; sin comparación: NS y SD del grupo activo
    cur = G ? {D:G.map(gr => epochDiffStats(gr.ids, pref, met))} : {NS:epochStats(ids, pref, "NS", met), SD:epochStats(ids, pref, "SD", met)};
    XS = (G ? cur.D[0] : cur.SD).xs;
    const series = G ? cur.D : [cur.NS, cur.SD];
    const vals = series.flatMap(s => s.mean.flatMap((v, i) => v == null ? [] : [v-s.sem[i], v+s.sem[i]])).concat(G ? [0] : []);
    // eje y fijo (fase 6 de PLAN.md): no cambia al seleccionar, comparar ni reproducir; solo con lo que se mide
    const ydom = fixedY(met, !!G, pref);
    clipped = vals.some(v => v < ydom[0] || v > ydom[1]);
    dx = d3.scaleLinear().domain([0, 300]).range([m.l, W-m.r]); dy = d3.scaleLinear().domain(ydom).range([H-m.b, m.t]);
    g.append("g").attr("class", "gridl").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(dy).ticks(4).tickSize(-(W-m.l-m.r)).tickFormat(""));
    g.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(dy).ticks(4).tickSize(3).tickPadding(3).tickSizeOuter(0).tickFormat(L.format(isVar() ? ".3~f" : ".2~f"))).call(a => a.select(".domain").remove());
    g.append("g").attr("class", "axis").attr("transform", `translate(0,${H-m.b})`).call(d3.axisBottom(dx).tickValues(d3.range(0, 301, W < 500 ? 60 : 30)).tickSize(4).tickPadding(3).tickSizeOuter(0).tickFormat(d => d === 300 ? "300 s" : d));
    // título del eje y en dos líneas: la magnitud y, debajo, qué es (más corto que en una sola línea)
    const yTitle = isVar() ? (G ? ["Δ moving σθ", "(SD − NS)"] : ["moving σθ", `(SD within ${S.winLen*4} s)`]) : (G ? ["Δ θ power", "(SD − NS)"] : ["relative", "θ power"]);
    const yt = g.append("text").attr("class", "atitle").attr("text-anchor", "middle").attr("transform", "rotate(-90)");
    yTitle.forEach((t, i) => yt.append("tspan").attr("x", -(m.t+H-m.b)/2).attr("y", 9+i*12).text(t));
    // ventana de tiempo (debajo de las series para no taparlas)
    brushG = g.append("g").attr("class", "brush");
    ln = d3.line().defined(v => v != null).x((v, i) => ex(i)).y(v => dy(v)).curve(d3.curveMonotoneX);
    const plot = g.append("g").attr("clip-path", "url(#dclip)").style("pointer-events", "none");
    if(G) plot.append("line").attr("class", "zero").attr("x1", m.l).attr("x2", W-m.r).attr("y1", dy(0)).attr("y2", dy(0));
    const items = G ? cur.D.map((s, i) => ({s, col:G[i].color, lab:G[i].name})) : [{s:cur.NS, col:C.ns, lab:"Normal Sleep"}, {s:cur.SD, col:C.sd, lab:"Sleep Deprivation"}];
    rev = plot.append("g");   // las series van aquí: la reproducción las descubre de izquierda a derecha
    items.forEach(({s, col}) => {
      rev.append("path").attr("fill", col).attr("fill-opacity", .13)
        .attr("d", d3.area().defined((v, i) => s.mean[i] != null).x((v, i) => ex(i)).y0((v, i) => dy(s.mean[i]-s.sem[i])).y1((v, i) => dy(s.mean[i]+s.sem[i])).curve(d3.curveMonotoneX)(s.mean));
      rev.append("path").attr("class", "ts-line").attr("stroke", col).attr("d", ln(s.mean));
      // tendencia lineal ajustada sobre el registro (la pendiente que cita el título)
      const pts = s.mean.map((v, i) => [XS[i], v]).filter(p => p[1] != null), mx = d3.mean(pts, p => p[0]), my = d3.mean(pts, p => p[1]);
      const b = d3.sum(pts, p => (p[0]-mx)*(p[1]-my))/d3.sum(pts, p => (p[0]-mx)**2), x0 = XS[0], x1 = XS[XS.length-1];
      rev.append("line").attr("x1", dx(x0)).attr("x2", dx(x1)).attr("y1", dy(my+b*(x0-mx))).attr("y2", dy(my+b*(x1-mx))).attr("stroke", col).attr("stroke-width", 1.5).attr("stroke-dasharray", "6 4").attr("opacity", .9);
    });
    scan = g.append("line").attr("class", "scan").attr("y1", m.t).attr("y2", H-m.b).style("opacity", 0);
    heads = g.append("g").style("pointer-events", "none");
    pg = g.append("g").style("pointer-events", "none");
    brush = d3.brushX().extent([[m.l, m.t], [W-m.r, H-m.b]]).on("end", ev => {
      if(!ev.sourceEvent) return;                       // movimientos programáticos no cambian el estado
      // clic sin arrastre: ventana del largo elegido centrada en ese instante
      if(!ev.selection){ const [px] = d3.pointer(ev.sourceEvent, svg.node()); if(px >= m.l && px <= W-m.r) setWin(winCentered(dx.invert(px))); return; }
      const [x0, x1] = ev.selection, a = Math.max(0, Math.floor(dx.invert(x0)/4)), b = Math.min(74, Math.floor(dx.invert(x1)/4));
      if(b-a < 2){ brushG.call(brush.move, null); return; }
      setWin([a, b]);
    });
    brushG.call(brush);
    if(S.win) brushG.call(brush.move, [dx(S.win[0]*4), dx((S.win[1]+1)*4)]);
    // modo serie: límites de los bloques (líneas tenues) y franja del bloque bajo el cursor en la serie de mapas
    blk = g.append("g").style("pointer-events", "none");
    if(S.series) seriesBlocks().forEach(([a, b], k) => {
      if(k) blk.append("line").attr("class", "blk-edge").attr("x1", dx(a*4)).attr("x2", dx(a*4)).attr("y1", m.t).attr("y2", H-m.b);
    });
    // leyenda flotante (encima de la ventana de tiempo: arrastrarla no elige una ventana); n de cada serie.
    // Vuelve a buscar la esquina más libre cuando cambia qué se dibuja (métrica, región o electrodo, comparación)
    const legItems = (G ? G.map((gr, i) => ({mark:"line", c:gr.color, t:gr.name, n:cur.D[i].n}))
      : [{mark:"line", c:C.ns, t:"Normal Sleep", n:cur.NS.n}, {mark:"line", c:C.sd, t:"Sleep Deprivation", n:cur.SD.n}]).concat([{mark:"dash", c:C.ink2, t:"trend"}]);
    const marks = items.flatMap(({s}) => s.mean.flatMap((v, i) => v == null ? [] : [[ex(i), dy(v)]]));
    leg.mount({svg, parent:g, area:{x0:m.l, x1:W-m.r, y0:m.t, y1:H-m.b}, items:legItems, marks, avoid:null, key:`${met}|${S.elec || S.roi}|${G ? S.cmp : "-"}`});
    svg.on("pointermove", ev => {
      if(leg.owns(ev.target)){ scan.style("opacity", 0); heads.selectAll("*").remove(); hideTip(); return; }
      const [px] = d3.pointer(ev, svg.node()); if(px < m.l || px > W-m.r){ scan.style("opacity", 0); heads.selectAll("*").remove(); hideTip(); return; }
      const i = nearest(dx.invert(px)); drawHead(i); showTip(ev, tipFor(i));
    }).on("pointerleave", () => { scan.style("opacity", 0); heads.selectAll("*").remove(); hideTip(); });
    title();
  }
  // Reproducir (desde el botón ▶ de la vista de topografía): los topomapas avanzan ventana a ventana por los cinco
  // minutos (ventana del largo elegido) y aquí se ve el mismo instante como una bolita sobre cada serie, con una lectura del
  // tiempo y los valores. Un clic más la detiene y los mapas vuelven a su estado normal.
  function setPlayBtn(on){ const b = $("playbtn"); if(b){ b.setAttribute("aria-pressed", on); b.title = on ? "Stop" : "Play the five minutes: the maps evolve and the dot follows in the Time View"; b.setAttribute("aria-label", b.title); } }
  // ---------------------------------------------------------------- reproducción (botón ▶ de la vista de topografía)
  // Una ventana del largo elegido (S.winLen épocas) se desliza por el registro época a época (4 s), con una bolita continua en esta serie: los mapas, la
  // dispersión, el mapa de calor y el grafo de similitud se recalculan para esa ventana y aquí una bolita y una banda
  // marcan el instante. Se puede pausar para analizar la ventana (◀ ▶ la mueven de 40 en 40) y ■ devuelve todo a su estado
  // normal. Arrastrar sobre la serie fija un intervalo propio, que las demás vistas también siguen (ver setWin).
  // ventana deslizante de 10 épocas centrada en el instante t: avanza época a época (4 s), sin saltos de bloque
  // largo de la ventana = el elegido en «Window» (S.winLen épocas); frameOf da la primera época de la ventana en t
  const DUR = 26000, frameOf = t => Math.max(0, Math.min(75-S.winLen, Math.floor(t/4)-Math.floor(S.winLen/2))), winAt = t => { const a = frameOf(t); return [a, a+S.winLen-1]; };
  let mode = "idle", pt = 0, tmr = null, curIdx = -1, held = false, keep = null, openedSec = null, pg = null;
  const btn = id => $(id);
  function ui(){
    const b = btn("playbtn"); if(b){ b.setAttribute("aria-pressed", mode === "playing"); b.disabled = !!S.series;   // en modo serie no se anima
      b.title = S.series ? "Close the series to play" : (mode === "playing" ? "Pause" : (mode === "paused" ? "Resume" : `Play the five minutes with a sliding ${S.winLen*4}-s window: every view follows`)); b.setAttribute("aria-label", b.title); }
    [["stopbtn", mode !== "idle"], ["prevbtn", mode === "paused"], ["nextbtn", mode === "paused"]].forEach(([id, on]) => { const e = btn(id); if(e) e.hidden = !on; });
  }
  // lo que sigue a la ventana: dispersión (cambio de cada persona dentro de ella), mapas, mapa de calor y grafo
  function follow(w){
    if(!held){ held = true; keep = {win:S.win, elec:S.elec}; }
    S.win = w; S.elec = null; computeX(); scatter.render(); updateStatus();
    topo.setFrame(w); bus.call("frame", null, w);
  }
  function release(){
    if(!held) return; held = false;
    S.win = keep.win; S.elec = keep.elec; computeX(); scatter.render(); updateStatus();
    topo.endFrames(); if(keep.win) topo.setFrame(keep.win); bus.call("frame", null, keep.win);
    if(openedSec){ const b = $(openedSec === "none" ? "b-graph" : openedSec); if(b && (openedSec === "none" || b.closest(".sec").dataset.open !== "true")) b.click(); openedSec = null; }
  }
  function clearPlay(){ if(pg) pg.selectAll("*").remove(); }
  function drawPlay(t){
    if(!pg) return;
    const i = nearest(t), w = winAt(t), x = dx(Math.max(0, Math.min(300, t)));
    pg.selectAll("rect.wb").data([0]).join(en => en.insert("rect", ":first-child").attr("class", "wb")).attr("x", dx(w[0]*4)).attr("width", dx((w[1]+1)*4)-dx(w[0]*4))
      .attr("y", m.t).attr("height", H-m.t-m.b).attr("fill", C.ink).attr("opacity", .08);
    pg.selectAll("line.ps").data([0]).join("line").attr("class", "scan ps").attr("x1", x).attr("x2", x).attr("y1", m.t).attr("y2", H-m.b).style("opacity", 1);
    const pts = G ? cur.D.map((s, k) => ({c:G[k].color, v:s.mean[i]})) : [{c:C.ns, v:cur.NS.mean[i]}, {c:C.sd, v:cur.SD.mean[i]}];
    pg.selectAll("circle").data(pts.filter(o => o.v != null)).join("circle").attr("r", 6.5).attr("cx", x).attr("cy", o => dy(o.v)).attr("fill", o => o.c).attr("stroke", C.panel).attr("stroke-width", 1.5);
    const vs = G ? cur.D.map((s, j) => [G[j].name, s.mean[i]]) : [["NS", cur.NS.mean[i]], ["SD", cur.SD.mean[i]]];
    const txt = `${w[0]*4}–${(w[1]+1)*4} s · ` + vs.filter(v => v[1] != null).map(v => `${v[0]} ${f3(v[1])}`).join("  ");
    const right = x > (m.l+W-m.r)/2;
    pg.selectAll("text.rd").data([txt]).join("text").attr("class", "ab rd").attr("y", H-m.b-6).style("font-size", "10.5px")
      .attr("x", right ? x-10 : x+10).attr("text-anchor", right ? "end" : "start").text(d => d);
  }
  function show(t){
    pt = Math.max(0, Math.min(300, t)); const idx = frameOf(pt);
    if(idx !== curIdx){ curIdx = idx; follow(winAt(pt)); }
    drawPlay(pt);
  }
  function begin(){
    hideTip(); curIdx = -1;
    topo.startFrames();   // fija las escalas de color de los mapas para toda la pasada
    // el grafo de similitud sigue la ventana; con el panel de validación abierto ya está a la vista (17 nov 2026)
  }
  function tick(){ pt += 300*50/DUR; if(pt >= 300){ show(300); pause(); return; } show(pt); }
  function play(){
    if(!svg || S.series) return;   // en modo serie no se anima
    // con movimiento reducido no hay reproducción automática: ▶ abre la ventana en 0 s, en pausa, y se avanza con ← →
    if(reduce){ if(mode === "idle"){ begin(); pt = 0; mode = "paused"; ui(); show(0); } return; }
    if(mode === "playing"){ pause(); return; }
    if(mode === "idle"){ begin(); pt = 0; } else if(pt >= 300) pt = 0;
    mode = "playing"; ui(); show(pt);
    // setInterval y no requestAnimationFrame: avanza igual aunque la pestaña esté en segundo plano
    clearInterval(tmr); tmr = setInterval(tick, 50);
  }
  function pause(){ clearInterval(tmr); tmr = null; if(mode === "playing") mode = "paused"; ui(); }
  function step(d){
    if(mode !== "paused") return;
    show(Math.max(0, Math.min(300, pt+d*4)));
  }
  // parada completa: todo vuelve a su estado anterior
  function stopPlay(opts){
    clearInterval(tmr); tmr = null;
    const was = mode !== "idle"; mode = "idle"; clearPlay(); ui();
    if(opts && opts.keep){ held = false; openedSec = null; return; }   // otra acción cambió el estado (arrastre, comparación…): se respeta
    if(was || held) release();
  }
  { const on = (id, f) => { const e = $(id); if(e) e.addEventListener("click", f); };
    on("playbtn", play); on("stopbtn", () => stopPlay()); on("prevbtn", () => step(-1)); on("nextbtn", () => step(1)); }
  // ayuda común de la ⓘ: cómo se elige una ventana y qué vale cada duración
  const WINDOW_HELP = "Click the chart to show a window of the chosen length (Window: 32, 60 or 100 s) on the maps; drag to set your own interval. Shorter windows follow faster changes but are noisier; σθ needs at least 60 s (15 epochs). Clear returns to the full five minutes.";
  function title(){
    // puntos dentro de la ventana elegida (por su tiempo central), o todos
    const idx = d3.range(XS.length).filter(i => !S.win || (XS[i] >= S.win[0]*4 && XS[i] <= (S.win[1]+1)*4));
    const post = S.win ? `, ${winTxt(S.win)}` : "", unit = isVar() ? "windows" : "epochs";
    // con un electrodo elegido la serie es la de ese electrodo, no la de la región (escalas distintas: no se superponen)
    const src = S.elec && ELEP ? ` · electrode ${S.elec}` : ` · ${ROI[S.roi].name}`;
    const upOf = s => idx.filter(i => s.mean[i] != null && s.mean[i] > 0).length;
    // el título no se ve en la vista (solo su ⓘ en la cabecera): lo usa la figura del reporte
    const key = "Shaded band: ± SE; dashed line: linear trend. Legend box: drag to move it, click to minimize it. The y-axis is fixed: it only changes with the band, the metric, the region or electrode, the window length and whether a comparison is shown." +
      (clipped ? " Part of this series falls outside the fixed y-axis and is cut at the edge of the chart." : "");
    if(G){
      const u = cur.D.map(upOf);
      setTitle("t-dyn", `${isVar() ? "Δ moving σθ" : "Δθ per epoch"}${src}: two groups${post}`, nb(`n = ${cur.D[0].n} and ${cur.D[1].n}`),
        notes(`Δ (deprivation − normal), mean ± SE per group: Δ &gt; 0 in ${u[0]} (${G[0].name}) and ${u[1]} (${G[1].name}) of ${idx.length} ${unit}.`, key, WINDOW_HELP));
      return;
    }
    const d = idx.map(i => cur.SD.mean[i]-cur.NS.mean[i]), up = d.filter(v => v > 0).length;
    setTitle("t-dyn", `${isVar() ? `Moving σθ, ${S.winLen*4}-s windows` : "Relative θ per epoch"}${src}${S.selected ? " · your selection" : ""}${post}`, nb(`n = ${cur.SD.n}`),
      notes(`${isVar() ? `SD of regional relative θ in ${S.winLen*4}-s windows (${S.winLen} epochs)` : "Regional relative θ per 4-s epoch"}, mean ± SE across people. Deprivation &gt; normal in ${up} of ${idx.length} ${unit}${S.win ? `; mean Δ ${fsr(d3.mean(d.filter(v => !isNaN(v))))}` : ""}.`, key,
        `${S.elec && ELEP ? `Series of electrode ${S.elec}: noisier than a region and on a larger scale (a region averages 16–28 electrodes). Set the Electrode selector in the header back to None to return to the region.` : "Choose an electrode in the header (or click one on a map or a heatmap row) to see its own series."} Rejected epochs (&gt; 200 µV) are gaps.`, WINDOW_HELP));
  }
  function tipFor(i){
    const r = s => s.mean[i] != null ? `${f3(s.mean[i])} <span class="m">± ${f3(s.sem[i])}</span>` : "n/d";
    const head = isVar() ? `Window ${i+1} <span class="m">${spanTxt(i)}</span>` : `Epoch ${i+1} <span class="m">${spanTxt(i)}</span>`;
    return `<div class="h">${head}</div>` +
      (G ? G.map((gr, k) => trow(`${gr.name}, Δ`, r(cur.D[k]), gr.color)).join("") : trow("Normal Sleep", r(cur.NS), C.ns) + trow("Sleep Deprivation", r(cur.SD), C.sd));
  }
  function drawHead(i, big){
    scan.attr("x1", ex(i)).attr("x2", ex(i)).style("opacity", 1);
    const pts = G ? cur.D.map((s, k) => ({c:G[k].color, v:s.mean[i]})) : [{c:C.ns, v:cur.NS.mean[i]}, {c:C.sd, v:cur.SD.mean[i]}];
    heads.selectAll("circle").data(pts.filter(o => o.v != null)).join("circle").attr("r", big ? 6.5 : 4).attr("cx", ex(i)).attr("cy", o => dy(o.v))
      .attr("fill", o => o.c).attr("stroke", C.panel).attr("stroke-width", 1.5);
  }
  bus.on("select.dyn", e => { if(!(e && e.live)) render(); }); bus.on("axes.dyn", () => render());
  // posición en pantalla del eje del tiempo (0 y 300 s): la serie de mapas se alinea con ella
  function plotX(){
    if(!svg) return null; const r = svg.node().getBoundingClientRect(), k = r.width/W;
    return {left:r.left+dx(0)*k, right:r.left+dx(300)*k};
  }
  // franja de un bloque de la serie bajo el cursor (k = índice del bloque o null)
  function hiBlock(k){
    if(!blk) return; blk.selectAll("rect").remove();
    if(k == null) return; const [a, b] = seriesBlocks()[k];
    blk.insert("rect", ":first-child").attr("x", dx(a*4)).attr("width", dx((b+1)*4)-dx(a*4)).attr("y", m.t).attr("height", H-m.t-m.b).attr("fill", C.ink).attr("opacity", .08);
  }
  // teclado (main.js): Espacio reproduce o pausa; ← → mueven la ventana una época (4 s) en pausa
  function key(k){
    if(k === " "){ play(); return true; }
    if(mode === "playing" && (k === "ArrowLeft" || k === "ArrowRight")) pause();
    if(mode === "paused"){ step(k === "ArrowLeft" ? -1 : 1); return true; }
    return false;
  }
  return {render, play, key, stop:() => stopPlay(), stopKeep:() => stopPlay({keep:true}), ui, plotX, hiBlock, withFullBox:fn => leg.withFull(fn), rebuild(){}};
})();
