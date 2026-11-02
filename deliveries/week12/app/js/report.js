/* Reporte descargable: un HTML autocontenido con lo que el usuario está viendo.
   Incluye el estado de la vista (región, métrica, marcador, comparación, personas A y B, electrodo, ventana),
   los cuatro gráficos tal como están en pantalla (SVG), qué muestra cada uno y cómo
   leerlo, la tabla de las personas activas y su CSV. Se abre sin conexión y se puede imprimir o guardar en PDF. */
const report = (() => {
  // estilos mínimos para que los SVG copiados se vean igual que en la app
  const tokens = () => { const cs = getComputedStyle(document.documentElement);
    return ["--bg", "--panel", "--raise", "--rule", "--rule2", "--ink", "--ink2", "--muted", "--faint", "--ns", "--sd", "--vuln", "--rest", "--null", "--sans"]
      .map(n => `${n}:${cs.getPropertyValue(n).trim() || "inherit"}`).join(";"); };
  const CSS = () => `
:root{${tokens()}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--sans);font-size:14px;line-height:1.55;-webkit-print-color-adjust:exact;print-color-adjust:exact}
main{max-width:1120px;margin:0 auto;padding:32px 28px 48px}
h1{font-size:26px;margin:0 0 4px;letter-spacing:-.01em}h2{font-size:17px;margin:30px 0 6px}h3{font-size:14px;margin:0 0 4px}
.sub{color:var(--ink2);margin:0 0 18px}.m{color:var(--muted)}
.state{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px 18px;padding:14px 16px;border:1px solid var(--rule2);border-radius:10px;background:var(--panel)}
.state div{font-size:13px}.state b{display:block;font-weight:500;color:var(--ink)}
.state span{color:var(--muted);font-size:12px}
section.fig{margin-top:22px;border:1px solid var(--rule);border-radius:10px;background:var(--panel);padding:14px 16px}
section.fig .t{font-weight:600}
section.fig p{color:var(--ink2);margin:6px 0 10px;max-width:90ch}
section.fig svg{display:block;width:100%;height:auto;max-height:520px}
table{width:100%;border-collapse:collapse;font-size:12.5px;font-variant-numeric:tabular-nums}th{text-align:left;color:var(--muted);font-weight:500;border-bottom:1px solid var(--rule2);padding:5px 8px}
td{border-bottom:1px solid var(--rule);padding:4px 8px}a{color:var(--ns)}
.btns{display:flex;gap:10px;margin:14px 0 0}.btns a,.btns button{font:inherit;font-size:13px;background:var(--raise);color:var(--ink);border:1px solid var(--rule2);border-radius:7px;padding:6px 12px;cursor:pointer;text-decoration:none}
.axis text{font-size:10.5px;fill:var(--muted)}.axis path,.axis line{stroke:var(--rule2)}
.gridl line{stroke:var(--rule)}.gridl path{display:none}.atitle{font-size:11px;font-weight:500;fill:var(--ink2)}
.alab{font-size:10.5px;fill:var(--muted)}
.sbox-bg{fill:var(--panel);fill-opacity:.92;stroke:var(--rule2)}.sbox text{font-size:11px;fill:var(--ink2)}.sbox .m{fill:var(--muted)}.sbox .strong{fill:var(--ink);font-weight:600}.qlab{font-size:10.5px;font-weight:500;fill:var(--vuln)}
.zero{stroke:var(--rule2)}.median{stroke:var(--muted);stroke-dasharray:3 3;stroke-opacity:.7}.quad{fill:rgba(255,181,71,.07)}
.lasso-surface{fill:transparent}.lasso-selection{fill:var(--ns);fill-opacity:.06;stroke:var(--ns);stroke-width:1.5;stroke-dasharray:4 3}
.ab{font-size:12px;font-weight:500;fill:var(--ink);paint-order:stroke;stroke:var(--panel);stroke-width:4px}
.head{fill:none;stroke:#6B7489;stroke-width:1.2}.contour{fill:none;stroke:#fff;stroke-opacity:.09;stroke-width:.7}
.colhead,.rowhead{font-size:12px;font-weight:600;fill:var(--ink);text-anchor:middle}.colhead tspan.m{fill:var(--muted);font-weight:500}
.ts-line{fill:none;stroke-width:2}.scan{display:none}.mlabel{font-size:10.5px;fill:var(--ink2)}.mlabel.on{fill:var(--vuln);font-weight:600}
.mdim{font-size:10px;fill:var(--muted)}.mhit{fill:transparent}.mhit.on{fill:rgba(255,181,71,.08)}
.sep{stroke:var(--rule)}.null-band{fill:var(--null)}.ref-line{stroke:var(--ink2);stroke-dasharray:5 4}.ehit{fill:transparent}
.brush .selection{fill:rgba(255,181,71,.10);stroke:var(--vuln)}.brush .overlay{fill:none}.brush .handle{display:none}
@media print{main{padding:12px}section.fig{break-inside:avoid}.btns{display:none}}`;

  const READ = {
    topo:"Each circle is the head seen from above (nose up) with 61 interpolated electrodes. Columns: after normal sleep (NS), after deprivation (SD) and their difference Δ = SD − NS. NS and SD share the sequential scale of their row; Δ uses a diverging scale centered at zero: warm = increases after deprivation, cool = decreases. Ring = uncorrected p < 0.05; filled = survives FDR correction (only with all 68 people). With two people or two groups, the rows become those people or groups, with shared scales.",
    scatter:"Each point is a person: on x, the theta change (SD − NS) in the chosen region, electrode or time window; on y, the change in the behavioral marker (up = worse). Dotted lines are the medians and the amber area is the vulnerable quadrant (above both medians). ρ is the Spearman correlation with its 95% CI.",
    dyn:"Follows the chosen metric. With μθ: relative theta power in each of the 75 4-s epochs of the 5-minute recording. With σθ: moving σθ, the standard deviation of regional theta in 40-s windows (10 epochs) sliding by one epoch; it shows when instability appears within the recording, but its scale is smaller than the scatter σθ because it starts from the region-averaged series. In both cases: mean of the active group ± standard error, after normal sleep (NS) and after deprivation (SD). The dotted line is the linear trend. With a group comparison, the change Δ = SD − NS of each group is shown. An amber box marks the chosen time window.",
    heat:"Each column is a person and each row an electrode, grouped into frontal, centrotemporal and posterior (front to back). The color is the change Δ = SD − NS: warm = increases after deprivation, cool = decreases, neutral = no change. Columns form two groups defined by behavior only (vulnerable: worse than the marker median; resilient: the rest), or the two groups of the comparison, ordered by their mean change in the chosen region. Next to each block, C(e) is the group consistency (share that increases minus share that decreases); the mean of everyone is shown alongside. A shared signature appears as a block of the same color; if a few people dominate the effect, one or two very intense columns stand out.",
  };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;"}[c]));
  const svgOf = id => { const s = document.querySelector(`#${id} svg`); if(!s) return ""; const c = s.cloneNode(true); c.removeAttribute("style"); c.setAttribute("xmlns", "http://www.w3.org/2000/svg"); return c.outerHTML; };
  const titleOf = id => { const n = $(id).cloneNode(true); n.querySelectorAll(".info").forEach(x => x.remove()); return n.innerHTML; };

  function state(){
    const c = COMPARES.find(c => c.k === S.cmp), rows = [
      ["EEG region", ROI[S.roi].name, S.elec ? "replaced by one electrode" : ""],
      ["Theta metric", S.met === "var" ? "σθ, variability across epochs" : "μθ, mean", ""],
      ["Y-axis marker", MK[S.y].name, ""],
      ["X-axis", xName(), ""],
      ["Comparison", c ? c.name : "No comparison", ""],
      ["Active people", S.selected ? `${S.selected.length} (your selection)` : `${EEG.length} (all with paired EEG)`, ""],
      ["People A and B", S.pair.length ? S.pair.map((d, i) => `${"AB"[i]} ${d.id}`).join(", ") : "none", ""],
    ];
    if(S.win) rows.push(["Time window", winTxt(S.win), "within the 5-min recording"]);
    return rows;
  }
  function people(){
    const xk = S.xKey(), yk = yK(), G = cmpGroups(), ids = new Set(activeIds());
    return P.filter(d => d[xk] != null && ids.has(d.id)).map(d => ({
      id:d.id, sexo:d.gender === "F" ? "woman" : "man", edad:d.age, psqi:d.psqi ?? "", x:d[xk], y:d[yk] ?? "",
      grupo:G ? ((G.find(g => g.set.has(d.id)) || {}).name || "") : "", vulnerable:S.vuln.has(d.id) ? "yes" : "", AB:pairLetter(d) || "",
    })).sort((a, b) => b.x-a.x);
  }
  function csv(rows){
    const head = ["participant", "sex", "age", "psqi", xName(), mkY().ax2, "group", "vulnerable_quadrant", "A_B"];
    const lines = rows.map(r => [r.id, r.sexo, r.edad, r.psqi, r.x, r.y, r.grupo, r.vulnerable, r.AB].map(v => /[",;\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v).join(","));
    return [head.map(h => `"${h}"`).join(",")].concat(lines).join("\n");
  }
  function build(){
    const now = new Date(), stamp = now.toLocaleString("en-US", {dateStyle:"long", timeStyle:"short"});
    const rows = people(), csvTxt = csv(rows), csvHref = "data:text/csv;charset=utf-8," + encodeURIComponent("﻿" + csvTxt);
    const st = state().map(([k, v, n]) => `<div><span>${esc(k)}</span><b>${esc(v)}</b>${n ? `<span>${esc(n)}</span>` : ""}</div>`).join("");
    const fig = (id, tid, key) => `<section class="fig"><div class="t">${titleOf(tid)}</div><p>${READ[key]}</p>${id === "scatter" ? scatter.withFullBox(() => svgOf(id)) : svgOf(id)}</section>`;
    const tbl = `<table><thead><tr><th>Participant</th><th>Sex</th><th>Age</th><th>PSQI</th><th>${esc(xName())}</th><th>${esc(mkY().ax2)}</th><th>Group</th><th>Vulnerable</th><th>A/B</th></tr></thead><tbody>` +
      rows.map(r => `<tr><td>${r.id}</td><td>${r.sexo}</td><td>${r.edad ?? ""}</td><td>${r.psqi}</td><td>${fsr(r.x)}</td><td>${r.y === "" ? "no data" : fsr(r.y)}</td><td>${esc(r.grupo)}</td><td>${r.vulnerable}</td><td>${r.AB}</td></tr>`).join("") + "</tbody></table>";
    return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>BATIMIX, view report (${esc(stamp)})</title>
${[...document.querySelectorAll('link[href*="fonts.googleapis"][rel="stylesheet"]')].map(l => l.outerHTML).join("")}
<style>${CSS()}</style></head><body><main>
<h1>BATIMIX</h1>
<p class="sub">View report generated on ${esc(stamp)}; resting EEG of 68 people after normal sleep (NS) and after 24–30 hours without sleep (SD); OpenNeuro ds004902 (Xiang et al., 2024), CC0.</p>
<div class="state">${st}</div>
<div class="btns"><button onclick="print()">Print or save as PDF</button><a download="BATIMIX_view_data.csv" href="${csvHref}">Download the data (CSV)</a></div>
<h2>What the view shows</h2>
${fig("scatter", "t-sc", "scatter")}
${fig("heat", "t-heat", "heat")}
${fig("topo", "t-topo", "topo")}
${fig("dyn", "t-dyn", "dyn")}
<h2>Preliminary conclusion of the project</h2>
<p>Without sleep, each person\'s theta changes in different directions, and that change does not robustly predict who deteriorates: across 448 alternative analyses no joint statistic exceeds chance. The only consistent hint is with mood (positive affect), not with vigilance. This is an exploratory screening tool, not a diagnosis.</p>
<h2>People in this view (${rows.length})</h2>
${tbl}
<h2>Method in brief</h2>
<p class="m">Relative theta power (4–8 Hz divided by 1–40 Hz, Welch) in 75 4-s epochs per recording, eyes open, 61 electrodes, FCz reference, no ICA. σθ = standard deviation across epochs; μθ = mean; Δ = SD − NS. Electrodes: paired t-test with Benjamini–Hochberg FDR correction. Associations: Spearman with 95% CI (Fisher). Multiverse: 448 specifications with joint permutation inference (Simonsohn, Simmons and Nelson, 2020). Team: Jimena Gurbillon, Andrea Coa and Paolo Medrano, DS5343 Data Visualization, UTEC 2026-2.</p>
</main></body></html>`;
  }
  function download(){
    const html = build(), blob = new Blob([html], {type:"text/html;charset=utf-8"}), url = URL.createObjectURL(blob);
    const d = new Date(), pad = n => String(n).padStart(2, "0");
    const a = document.createElement("a"); a.href = url; a.download = `BATIMIX_report_${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}.html`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  return {download, build};
})();
