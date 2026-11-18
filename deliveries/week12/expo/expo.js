/* Exposición final: navegación, revelado de cada diapositiva, aplicación en vivo en las demostraciones, gráfico de
   personas con datos reales y código QR. Atajos del orador (sin elementos visibles para el público):
   ↓ → espacio avanzan, ↑ ← retroceden, N notas, T cronómetro, F pantalla completa, Esc libera la herramienta. */
(() => {
  const slides = [...document.querySelectorAll(".slide")], $ = id => document.getElementById(id);
  const frame = $("appframe"), box = $("stagebox"), pgEl = $("pg");
  let cur = 0, ready = false, last = null, free = false;
  $("pt").textContent = slides.length;
  if(new URLSearchParams(location.search).has("static")) document.body.classList.add("static");   // sin animaciones de entrada (capturas)

  /* navegación */
  const go = i => { i = Math.max(0, Math.min(slides.length-1, i)); slides[i].scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"}); };
  addEventListener("keydown", e => {
    if(e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    if(free){ if(k === "Escape") toggleFree(); return; }
    if(["ArrowDown", "ArrowRight", "PageDown", " "].includes(k)){ e.preventDefault(); go(cur+1); }
    else if(["ArrowUp", "ArrowLeft", "PageUp"].includes(k)){ e.preventDefault(); go(cur-1); }
    else if(k === "Home"){ e.preventDefault(); go(0); } else if(k === "End"){ e.preventDefault(); go(slides.length-1); }
    else if(k === "n" || k === "N") $("notebar").hidden = !$("notebar").hidden;
    else if(k === "t" || k === "T") toggleClock();
    else if(k === "f" || k === "F"){ if(document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); }
  });
  $("mark").addEventListener("click", e => { e.preventDefault(); go(0); });

  /* aplicación en vivo */
  const send = s => { if(!ready || !s.classList.contains("demo")) return;
    frame.contentWindow.postMessage({batimix:true, type:"step", focus:free ? null : (s.dataset.focus || null), do:free ? [] : (s.dataset.do || "").split(" ").filter(Boolean)}, "*"); };
  function zoom(r){
    last = r; const W = box.clientWidth, H = box.clientHeight, pad = r.w > 1000 ? 0 : 16;
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

  /* diapositiva activa */
  const counted = new WeakSet(), parts = {1:slides.filter(s => s.dataset.part === "1"), 2:slides.filter(s => s.dataset.part === "2"), 3:slides.filter(s => s.dataset.part === "3")};
  slides.forEach(s => [...s.querySelectorAll(".rv")].forEach((el, i) => el.style.setProperty("--i", i)));
  function countUp(s){
    if(counted.has(s)) return; counted.add(s);
    s.querySelectorAll(".cnt").forEach(el => { const to = +el.dataset.to, t0 = performance.now(), dur = 1100;
      const step = t => { const k = Math.min(1, (t-t0)/dur), e = 1-Math.pow(1-k, 3); el.textContent = Math.round(to*e); if(k < 1) requestAnimationFrame(step); }; el.textContent = "0"; requestAnimationFrame(step); });
  }
  function setActive(i){
    cur = i; const s = slides[i];
    slides.forEach((x, j) => x.classList.toggle("active", j === i));
    pgEl.textContent = i+1;
    document.body.classList.toggle("on-dark", s.classList.contains("dark"));
    document.body.classList.toggle("on-demo", s.classList.contains("demo"));
    [1, 2, 3].forEach(p => { const idx = parts[p].indexOf(s), el = document.querySelector(`.rail i[data-p="${p}"]`);
      el.style.setProperty("--f", (idx >= 0 ? (idx+1)/parts[p].length : (+s.dataset.part > p ? 1 : 0))*100+"%"); });
    $("notett").textContent = s.dataset.title; $("notetx").textContent = s.dataset.notes || "";
    if(free){ free = false; box.classList.remove("free"); $("free").textContent = "Probar la herramienta"; }
    countUp(s); send(s);
  }
  const io = new IntersectionObserver(es => es.forEach(e => { if(e.isIntersecting) setActive(slides.indexOf(e.target)); }), {threshold:.55});
  slides.forEach(s => io.observe(s));
  if(new URLSearchParams(location.search).has("notes")) $("notebar").hidden = false;

  /* cronómetro del orador: solo aparece con T */
  let t0 = 0, acc = 0, timer = null;
  const fmt = s => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2, "0")}`;
  function toggleClock(){
    const p = $("clockpill");
    if(!timer && p.hidden){ p.hidden = false; t0 = performance.now(); timer = setInterval(() => { $("clk").textContent = fmt(acc+(performance.now()-t0)/1000); }, 500); }
    else if(timer){ acc += (performance.now()-t0)/1000; clearInterval(timer); timer = null; }
    else { p.hidden = true; acc = 0; $("clk").textContent = "0:00"; }   // tercera pulsación: lo oculta y lo reinicia
  }

  /* gráfico de personas (datos reales de la aplicación) */
  fetch("../app/data/participants.json").then(r => r.json()).then(P => {
    const rows = P.filter(d => d.d_front_var != null).map(d => ({id:d.id, v:d.d_front_var})).sort((a, b) => a.v-b.v);
    const W = 680, H = 400, m = {l:30, r:30, t:44, b:64}, vs = rows.map(d => d.v), lim = Math.max(Math.abs(Math.min(...vs)), Math.abs(Math.max(...vs)));
    const x = v => m.l+(v+lim)/(2*lim)*(W-m.l-m.r), up = rows.filter(d => d.v > 0).length, down = rows.length-up, mean = vs.reduce((a, b) => a+b, 0)/vs.length;
    const NS = "#0B7FA3", SD = "#D6245F", col = new Map(); let dots = "";
    rows.forEach(d => { const c = Math.round(x(d.v)/11), n = col.get(c) || 0; col.set(c, n+1);
      dots += `<circle cx="${x(d.v).toFixed(1)}" cy="${(H-m.b-14-n*17).toFixed(1)}" r="7" fill="${d.v > 0 ? SD : NS}" fill-opacity=".88" stroke="#fff" stroke-width="1.4"/>`; });
    $("strip").innerHTML = `<svg viewBox="0 0 ${W} ${H}" font-family="Roboto, Arial">
      <line x1="${x(0)}" x2="${x(0)}" y1="${m.t}" y2="${H-m.b}" stroke="#0E1726" stroke-width="1.6"/>
      <line x1="${m.l}" x2="${W-m.r}" y1="${H-m.b}" y2="${H-m.b}" stroke="#CBD2DE"/>
      ${dots}
      <line x1="${x(mean)}" x2="${x(mean)}" y1="${m.t+10}" y2="${H-m.b}" stroke="#0E1726" stroke-width="2.6" stroke-dasharray="7 5"/>
      <text x="${x(mean)+10}" y="${m.t+20}" font-size="17" font-weight="700" fill="#0E1726">promedio del grupo</text>
      <text x="${x(0)-10}" y="${H-m.b+30}" text-anchor="end" font-size="17" font-weight="700" fill="${NS}">← más estable (${down})</text>
      <text x="${x(0)+10}" y="${H-m.b+30}" font-size="17" font-weight="700" fill="${SD}">más inestable (${up}) →</text>
      <text x="${(m.l+W-m.r)/2}" y="${H-10}" text-anchor="middle" font-size="13.5" fill="#68728A">cambio en la variabilidad de theta frontal (privación − normal)</text></svg>`;
    $("stripcap").textContent = `${up} suben y ${down} bajan.`;
  }).catch(() => { $("strip").innerHTML = "<p style='padding:20px;color:#68728A'>No se pudieron leer los datos (¿abierto sin servidor local?).</p>"; });

  /* código QR y capturas para la versión impresa */
  try{ const url = "https://andrea-coa.github.io/data-visualization-project/deliveries/week12/project/", q = qrcode(0, "M"); q.addData(url); q.make(); $("qr").innerHTML = q.createSvgTag({cellSize:6, margin:0, scalable:true}); }
  catch(e){ $("qr").innerHTML = "<p style='color:#fff'>andrea-coa.github.io/data-visualization-project</p>"; }
  document.querySelectorAll(".demo").forEach(s => { const f = document.createElement("figure"); f.className = "shot"; f.innerHTML = `<img src="img/demo-${s.dataset.img}.png" alt="">`; s.appendChild(f); });
  setActive(0);
})();
