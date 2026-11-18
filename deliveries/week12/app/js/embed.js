/* Guided tour support: when the app runs inside the project page (iframe), the page tells it which view to
   highlight and what to do there (play the time view, open a validation section); the app dims the rest and answers
   with the view's rectangle so the page can zoom onto it. Without a parent page this file does nothing. */
(() => {
  const q = new URLSearchParams(location.search);
  if(parent === window){
    if(q.has("focus") || q.has("tab")){   // static preview of a state (expo screenshots)
      const t = setInterval(() => { if(!$("boot").classList.contains("done")) return; clearInterval(t);
        if(q.get("tab")){ const b = document.querySelector(`[data-tab="${q.get("tab")}"]`); if(b) b.click(); }
        (q.get("sec") || "").split(",").filter(Boolean).forEach(id => { const b = $(id); if(b && b.closest(".sec").dataset.open !== "true") b.click(); });
        if(q.get("row")) setTimeout(() => { const b = document.querySelectorAll("#vlist .vrow2")[+q.get("row")]; if(b) b.click(); }, 500);
        if(q.get("person")) setTimeout(() => { if(window.ML) ML.pick(q.get("person")); }, 1400);
        if(q.get("focus")) setTimeout(() => { document.body.dataset.focus = q.get("focus"); }, 2200); }, 250);
    }
    return;
  }
  document.documentElement.classList.add("embed");
  const SEL = {bar:".bar", scatter:".p-scatter", heat:".p-heat", topo:".p-topo", dyn:".p-dyn", side:"#side", maps:".col-c", compare:"#cmpsel", valsum:".valsum:not(.mlsum)", float:".sidebox .sec[data-open=true]", mlsum:".mlsum", mlrec:".ml-rec", mlfeat:".ml-feat", mlimp:".ml-imp", mlmet:".ml-met", mlperson:".ml-person"};
  const post = m => parent.postMessage({batimix:true, ...m}, "*");
  const rectOf = f => {
    const el = f && SEL[f] && document.querySelector(SEL[f]);
    if(!el) return {x:0, y:0, w:innerWidth, h:innerHeight};
    const b = (f === "compare" ? el.closest(".fld") : el).getBoundingClientRect();
    return {x:b.x, y:b.y, w:b.width, h:b.height};
  };
  const openTab = n => { const b = document.querySelector(`[data-tab="${n}"]`); if(b && b.getAttribute("aria-selected") !== "true") b.click(); };
  const openSec = id => { const b = $(id); if(b && b.closest(".sec").dataset.open !== "true") b.click(); };
  function apply(m){
    dyn.stop();
    if(m.focus) document.body.dataset.focus = m.focus; else delete document.body.dataset.focus;
    (m.do || []).forEach(a => {
      if(a.startsWith("sec:")) openSec(a.slice(4));
      else if(a.startsWith("tab:")) openTab(a.slice(4));
      else if(a.startsWith("row:")) setTimeout(() => { const b = document.querySelectorAll("#vlist .vrow2")[+a.slice(4)]; if(b) b.click(); }, 500);
      else if(a.startsWith("person:")) setTimeout(() => { if(window.ML) ML.pick(a.slice(7)); }, 1400);
      else if(a === "play") setTimeout(() => dyn.play(), 700);
    });
    // measured twice: opening a section or toggling a view moves the layout for a moment
    [450, 1300].forEach(t => setTimeout(() => post({type:"rect", focus:m.focus || null, rect:rectOf(m.focus), vw:innerWidth, vh:innerHeight}), t));
  }
  addEventListener("message", e => { const m = e.data; if(m && m.batimix && m.type === "step") apply(m); });
  const t = setInterval(() => { if($("boot").classList.contains("done")){ clearInterval(t); post({type:"ready"}); } }, 250);
})();
