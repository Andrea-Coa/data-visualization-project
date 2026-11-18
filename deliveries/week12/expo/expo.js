/* Exposición final: navegación, cronómetro, notas del orador, aplicación en vivo en las demostraciones, gráfico de
   personas con datos reales y código QR. Teclas: ↓ → espacio avanzan, ↑ ← retroceden, T cronómetro, N notas. */
(() => {
  const slides = [...document.querySelectorAll(".slide")], $ = id => document.getElementById(id);
  const frame = $("appframe"), box = $("stagebox"), stage = $("stage");
  let cur = 0, ready = false, last = null, free = false;

  /* ---------------------------------------------------------------- navegación */
  const go = i => { i = Math.max(0, Math.min(slides.length-1, i)); slides[i].scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"}); };
  addEventListener("keydown", e => {
    if(e.target.closest("iframe") || e.ctrlKey || e.metaKey || e.altKey) return;
    if(free && !["Escape"].includes(e.key)) return;
    const k = e.key;
    if(["ArrowDown", "ArrowRight", "PageDown", " "].includes(k)){ e.preventDefault(); go(cur+1); }
    else if(["ArrowUp", "ArrowLeft", "PageUp"].includes(k)){ e.preventDefault(); go(cur-1); }
    else if(k === "Home"){ e.preventDefault(); go(0); } else if(k === "End"){ e.preventDefault(); go(slides.length-1); }
    else if(k === "t" || k === "T") toggleClock(); else if(k === "n" || k === "N") toggleNotes();
    else if(k === "Escape" && free) toggleFree();
  });
  document.querySelectorAll("[data-goto]").forEach(b => b.addEventListener("click", () => { const i = slides.findIndex(s => s.id === b.dataset.goto); go(i); }));

  /* ---------------------------------------------------------------- aplicación en vivo */
  const send = s => { if(!ready || !s.classList.contains("demo")) return;
    frame.contentWindow.postMessage({batimix:true, type:"step", focus:free ? null : (s.dataset.focus || null), do:free ? [] : (s.dataset.do || "").split(" ").filter(Boolean)}, "*"); };
  function zoom(r){
    last = r; const W = box.clientWidth, H = box.clientHeight, pad = r.w > 1000 ? 0 : 18;
    const k = Math.min((W-2*pad)/r.w, (H-2*pad)/r.h, 2.2);
    let tx = W/2-(r.x+r.w/2)*k, ty = H/2-(r.y+r.h/2)*k;
    tx = Math.min(0, Math.max(W-1440*k, tx)); ty = Math.min(0, Math.max(H-860*k, ty));
    frame.style.transform = `translate(${tx}px,${ty}px) scale(${k})`;
  }
  addEventListener("message", e => {
    if(e.source !== frame.contentWindow || !e.data || !e.data.batimix) return;
    if(e.data.type === "ready"){ ready = true; send(slides[cur]); }
    if(e.data.type === "rect") zoom(e.data.rect);
  });
  addEventListener("resize", () => { if(last) zoom(last); });
  function toggleFree(){ free = !free; $("free").textContent = free ? "Volver a la presentación" : "Probar la herramienta"; box.classList.toggle("free", free); send(slides[cur]); }
  $("free").addEventListener("click", toggleFree);

  /* ---------------------------------------------------------------- diapositiva activa */
  const note = $("notebar");
  function setActive(i){
    cur = i; const s = slides[i];
    $("count").textContent = `${i+1} / ${slides.length}`; $("prog").style.width = ((i+1)/slides.length*100)+"%";
    document.querySelectorAll(".pt").forEach(b => b.classList.toggle("on", b.dataset.p === s.dataset.part));
    document.body.classList.toggle("on-demo", s.classList.contains("demo"));
    $("notett").textContent = `${s.dataset.title} · ${s.dataset.sec} s`; $("notetx").textContent = s.dataset.notes || "";
    if(free){ free = false; box.classList.remove("free"); $("free").textContent = "Probar la herramienta"; }
    send(s);
  }
  const io = new IntersectionObserver(es => es.forEach(e => { if(e.isIntersecting) setActive(slides.indexOf(e.target)); }), {threshold:.55});
  slides.forEach(s => io.observe(s));
  function toggleNotes(){ note.hidden = !note.hidden; }
  $("notesbtn").addEventListener("click", toggleNotes);
  if(new URLSearchParams(location.search).has("notes")) note.hidden = false;

  /* ---------------------------------------------------------------- cronómetro: 10 min, con el presupuesto de cada parte */
  const budget = {1:120, 2:360, 3:120}; let t0 = 0, acc = 0, timer = null;
  const fmt = s => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2, "0")}`;
  function tick(){
    const el = acc+(performance.now()-t0)/1000; $("clk").textContent = fmt(el);
    // tiempo acumulado previsto hasta el final de la parte actual
    const p = +slides[cur].dataset.part, upto = Object.keys(budget).filter(k => +k <= p).reduce((a, k) => a+budget[k], 0);
    $("clock").classList.toggle("over", el > upto+10 && el < 600+1e9);
  }
  function toggleClock(){
    const b = $("clock");
    if(timer){ acc += (performance.now()-t0)/1000; clearInterval(timer); timer = null; b.classList.remove("run"); }
    else { t0 = performance.now(); timer = setInterval(tick, 500); b.classList.add("run"); }
  }
  $("clock").addEventListener("click", toggleClock);

  /* ---------------------------------------------------------------- gráfico de personas (datos reales) */
  fetch("../app/data/participants.json").then(r => r.json()).then(P => {
    const rows = P.filter(d => d.d_front_var != null).map(d => ({id:d.id, v:d.d_front_var})).sort((a, b) => a.v-b.v);
    const W = 640, H = 340, m = {l:28, r:28, t:34, b:56}, ext = d3ext(rows.map(d => d.v)), lim = Math.max(Math.abs(ext[0]), Math.abs(ext[1]));
    const x = v => m.l+(v+lim)/(2*lim)*(W-m.l-m.r), up = rows.filter(d => d.v > 0).length, down = rows.length-up;
    const mean = rows.reduce((a, d) => a+d.v, 0)/rows.length, NS = "#0B7FA3", SD = "#D6245F";
    // los puntos se apilan por columnas para que no se tapen
    const col = new Map(); let dots = "";
    rows.forEach(d => { const c = Math.round(x(d.v)/10), n = col.get(c) || 0; col.set(c, n+1);
      dots += `<circle cx="${x(d.v).toFixed(1)}" cy="${(H-m.b-12-n*15).toFixed(1)}" r="6.2" fill="${d.v > 0 ? SD : NS}" fill-opacity=".85" stroke="#fff" stroke-width="1.2"/>`; });
    $("strip").innerHTML = `<svg viewBox="0 0 ${W} ${H}" font-family="Roboto, Arial">
      <line x1="${x(0)}" x2="${x(0)}" y1="${m.t}" y2="${H-m.b}" stroke="#14181F" stroke-width="1.5"/>
      <line x1="${m.l}" x2="${W-m.r}" y1="${H-m.b}" y2="${H-m.b}" stroke="#CDD2DA"/>
      ${dots}
      <line x1="${x(mean)}" x2="${x(mean)}" y1="${m.t+8}" y2="${H-m.b}" stroke="#14181F" stroke-width="2.4" stroke-dasharray="6 4"/>
      <text x="${x(mean)+8}" y="${m.t+16}" font-size="15" font-weight="700" fill="#14181F">promedio del grupo</text>
      <text x="${x(0)-8}" y="${H-m.b+26}" text-anchor="end" font-size="15" font-weight="700" fill="${NS}">← más estable (${down})</text>
      <text x="${x(0)+8}" y="${H-m.b+26}" font-size="15" font-weight="700" fill="${SD}">más inestable (${up}) →</text>
      <text x="${(m.l+W-m.r)/2}" y="${H-8}" text-anchor="middle" font-size="12.5" fill="#5E6675">Δσθ frontal (privación − normal)</text></svg>`;
    $("stripcap").textContent = `${up} suben y ${down} bajan.`;
  }).catch(() => { $("strip").innerHTML = "<p style='padding:20px;color:#5E6675'>No se pudieron leer los datos (¿abierto sin servidor local?).</p>"; });
  function d3ext(a){ return [Math.min(...a), Math.max(...a)]; }

  /* ---------------------------------------------------------------- código QR y capturas para la versión impresa */
  try{ const url = "https://andrea-coa.github.io/data-visualization-project/deliveries/week12/project/", q = qrcode(0, "M"); q.addData(url); q.make(); $("qr").innerHTML = q.createSvgTag({cellSize:6, margin:0, scalable:true}); }
  catch(e){ $("qr").innerHTML = "<p>andrea-coa.github.io/data-visualization-project</p>"; }
  document.querySelectorAll(".demo").forEach(s => { const f = document.createElement("figure"); f.className = "shot"; f.innerHTML = `<img src="img/demo-${s.dataset.img}.png" alt="">`; s.appendChild(f); });
  setActive(0);
})();
