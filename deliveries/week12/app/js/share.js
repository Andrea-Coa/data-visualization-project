/* Shareable links and image export.
   - The state of the app (region, metric, Y marker, electrode, comparison, time window, selection, A/B) lives in the
     URL, so a link opens the exact view that was cited. The link button in the header copies it.
   - The ↓ button of every view saves it as a PNG (Shift+click: SVG), always in the light theme, with its title and the
     current settings. */
(() => {
  const q = s => document.querySelector(s);
  /* ---------------------------------------------------------------- state in the URL */
  const KEYS = ["roi", "met", "y", "elec", "cmp", "win", "sel", "ab"];
  let urlOn = false, urlT = null;
  function writeURL(){
    if(!urlOn) return;
    clearTimeout(urlT);
    urlT = setTimeout(() => {
      const u = new URLSearchParams(location.search); KEYS.forEach(k => u.delete(k));
      if(S.roi !== "front") u.set("roi", S.roi);
      if(S.met !== "var") u.set("met", S.met);
      if(S.y !== "d_pvt") u.set("y", S.y);
      if(S.elec) u.set("elec", S.elec);
      if(S.cmp !== "none") u.set("cmp", S.cmp);
      if(S.win) u.set("win", S.win.join("-"));
      if(S.selected) u.set("sel", S.selected.join(","));
      if(S.pair.length) u.set("ab", S.pair.map(d => d.id).join(","));
      const s = u.toString();
      try{ history.replaceState(null, "", location.pathname + (s ? "?"+s : "") + location.hash); }catch(e){}
    }, 150);
  }
  function readURL(){
    const u = new URLSearchParams(location.search), has = k => u.has(k);
    if(has("roi") && ROI[u.get("roi")]) setRoi(u.get("roi"));
    if(has("met") && ["var", "mean"].includes(u.get("met"))) setMet(u.get("met"));
    if(has("y") && MK[u.get("y")]) setY(u.get("y"));
    if(has("cmp") && COMPARES.some(c => c.k === u.get("cmp"))) setCmp(u.get("cmp"));
    if(has("elec") && ELEC.includes(u.get("elec"))) setElec(u.get("elec"));
    if(has("win")){ const w = u.get("win").split("-").map(Number); if(w.length === 2 && w.every(Number.isFinite)) setWin(w); }
    const ids = k => (u.get(k) || "").split(",").filter(id => EEG_IDS.includes(id));
    if(has("sel") && ids("sel").length) setSelected(ids("sel"));
    if(has("ab")){ S.pair = []; ids("ab").slice(0, 2).forEach(id => pin(P.find(d => d.id === id))); }
  }

  /* ---------------------------------------------------------------- export a view */
  const PROPS = ["fill", "fill-opacity", "stroke", "stroke-width", "stroke-opacity", "stroke-dasharray", "opacity", "font-family", "font-size",
    "font-weight", "font-style", "text-anchor", "paint-order", "stroke-linejoin", "stroke-linecap", "letter-spacing", "text-transform"];
  function inline(src, dst){
    const cs = getComputedStyle(src);
    PROPS.forEach(p => { const v = cs.getPropertyValue(p); if(v) dst.style.setProperty(p, v); });
    if(cs.display === "none") dst.setAttribute("display", "none");
    [...src.children].forEach((c, i) => inline(c, dst.children[i]));
  }
  const dl = (href, name) => { const a = document.createElement("a"); a.href = href; a.download = name; document.body.appendChild(a); a.click(); a.remove(); };
  const esc = t => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  function stateLine(){
    const bits = [ROI[S.roi].name, S.met === "var" ? "σθ" : "μθ", MK[S.y].name];
    if(S.elec) bits.push("electrode "+S.elec);
    if(S.cmp !== "none") bits.push(COMPARES.find(c => c.k === S.cmp).name);
    if(S.selected) bits.push(S.selected.length+" selected");
    return bits.join(" · ");
  }
  function exportView(box, asSvg){
    const view = box.querySelector(".view"), src = view && view.querySelector("svg");
    if(!src) return;
    const lab = (box.querySelector(".vh > span, .sec-lbl b") || document.createElement("b")).cloneNode(true);
    lab.querySelectorAll(".info, .vmet").forEach(n => n.remove());
    const title = lab.textContent.trim() || "view", file = "batimix-" + title.toLowerCase().replace(/[^\w]+/g, "-").replace(/^-|-$/g, "");
    const r = src.getBoundingClientRect(), W = Math.round(r.width), H = Math.round(r.height), top = 40;
    const copy = src.cloneNode(true); inline(src, copy);
    const NS = "http://www.w3.org/2000/svg", out = document.createElementNS(NS, "svg");
    out.setAttribute("xmlns", NS); out.setAttribute("width", W); out.setAttribute("height", H+top); out.setAttribute("viewBox", `0 0 ${W} ${H+top}`);
    out.innerHTML = `<rect width="${W}" height="${H+top}" fill="#FFFFFF"/><text x="10" y="18" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="700" fill="#14181F">${esc(title)}</text>` +
      `<text x="10" y="33" font-family="Arial, Helvetica, sans-serif" font-size="10.5" fill="#5E6675">BATIMIX · ds004902 · ${esc(stateLine())}</text>`;
    copy.setAttribute("x", 0); copy.setAttribute("y", top); copy.removeAttribute("style"); out.appendChild(copy);
    const xml = new XMLSerializer().serializeToString(out);
    if(asSvg){ dl("data:image/svg+xml;charset=utf-8,"+encodeURIComponent(xml), file+".svg"); return; }
    const img = new Image(), k = 2;
    img.onload = () => {
      const c = document.createElement("canvas"); c.width = W*k; c.height = (H+top)*k; const g = c.getContext("2d");
      g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
      c.toBlob(b => dl(URL.createObjectURL(b), file+".png"));
    };
    img.src = "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(xml);
  }
  async function exportLight(box, asSvg){
    const dark = themeNow() === "dark";
    if(dark){ setTheme("light"); await new Promise(r => setTimeout(r, 700)); }
    try{ exportView(box, asSvg); } finally { if(dark) setTimeout(() => setTheme("dark"), 400); }
  }
  function addExportButtons(){
    document.querySelectorAll(".panel .vh .vx, .sec .ph .vx").forEach(vx => {
      const b = document.createElement("button"); b.type = "button"; b.className = "vexp";
      b.title = "Save this view as PNG (Shift+click: SVG)"; b.setAttribute("aria-label", "Save view as image");
      b.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2v8M4.8 7 8 10.2 11.2 7M2.5 13h11"/></svg>';
      b.addEventListener("click", e => { e.stopPropagation(); exportLight(vx.closest(".panel, .sec"), e.shiftKey); });
      vx.parentNode.insertBefore(b, vx);
    });
  }

  /* ---------------------------------------------------------------- start-up */
  addExportButtons();
  ["select", "pin", "axes"].forEach(t => bus.on(t+".url", writeURL));
  const wait = setInterval(() => {
    if(!$("boot").classList.contains("done") || !P.length) return;
    clearInterval(wait);
    setTimeout(() => { readURL(); urlOn = true; writeURL(); }, 400);
  }, 200);
  const lb = $("linkbtn");
  if(lb) lb.addEventListener("click", () => {
    const ico = lb.innerHTML;
    clearTimeout(urlT); const was = urlOn; urlOn = true; writeURL(); urlOn = was;
    setTimeout(() => {
      const done = () => { lb.textContent = "✓"; setTimeout(() => lb.innerHTML = ico, 1400); };
      (navigator.clipboard ? navigator.clipboard.writeText(location.href) : Promise.reject()).then(done, () => { prompt("Copy this link", location.href); });
    }, 200);
  });
})();
