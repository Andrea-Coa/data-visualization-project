/* Reporte descargable: un HTML autocontenido con lo que el usuario está viendo.
   Incluye el estado de la vista (región, métrica, marcador, comparación, personas A y B, electrodo, ventana,
   análisis del multiverso), los cuatro gráficos tal como están en pantalla (SVG), qué muestra cada uno y cómo
   leerlo, la tabla de las personas activas y su CSV. Se abre sin conexión y se puede imprimir o guardar en PDF. */
const report = (() => {
  // estilos mínimos para que los SVG copiados se vean igual que en la app
  const tokens = () => { const cs = getComputedStyle(document.documentElement);
    return ["--bg", "--panel", "--raise", "--rule", "--rule2", "--ink", "--ink2", "--muted", "--faint", "--ns", "--sd", "--vuln", "--rest", "--null", "--sans", "--mono", "--head"]
      .map(n => `${n}:${cs.getPropertyValue(n).trim() || "inherit"}`).join(";"); };
  const CSS = () => `
:root{${tokens()}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--sans);font-size:14px;line-height:1.55;-webkit-print-color-adjust:exact;print-color-adjust:exact}
main{max-width:1120px;margin:0 auto;padding:32px 28px 48px}
h1{font-family:var(--head,var(--sans));font-size:26px;margin:0 0 4px;letter-spacing:-.01em}h2{font-size:17px;margin:30px 0 6px}h3{font-size:14px;margin:0 0 4px}
.sub{color:var(--ink2);margin:0 0 18px}.m{color:var(--muted)}
.state{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px 18px;padding:14px 16px;border:1px solid var(--rule2);border-radius:10px;background:var(--panel)}
.state div{font-size:13px}.state b{display:block;font-family:var(--mono);font-weight:500;color:var(--ink)}
.state span{color:var(--muted);font-size:12px}
section.fig{margin-top:22px;border:1px solid var(--rule);border-radius:10px;background:var(--panel);padding:14px 16px}
section.fig .t{font-weight:600}
section.fig p{color:var(--ink2);margin:6px 0 10px;max-width:90ch}
section.fig svg{display:block;width:100%;height:auto;max-height:520px}
table{width:100%;border-collapse:collapse;font-size:12.5px;font-variant-numeric:tabular-nums}th{text-align:left;color:var(--muted);font-weight:500;border-bottom:1px solid var(--rule2);padding:5px 8px}
td{border-bottom:1px solid var(--rule);padding:4px 8px}a{color:var(--ns)}
.btns{display:flex;gap:10px;margin:14px 0 0}.btns a,.btns button{font:inherit;font-size:13px;background:var(--raise);color:var(--ink);border:1px solid var(--rule2);border-radius:7px;padding:6px 12px;cursor:pointer;text-decoration:none}
.axis text{font-family:var(--mono);font-size:10.5px;fill:var(--muted)}.axis path,.axis line{stroke:var(--rule2)}
.gridl line{stroke:var(--rule)}.gridl path{display:none}.atitle{font-size:11px;font-weight:500;fill:var(--ink2)}
.alab{font-family:var(--mono);font-size:10.5px;fill:var(--muted)}.ann{font-size:11.5px;font-weight:600;fill:var(--ink)}
.zero{stroke:var(--rule2)}.median{stroke:var(--muted);stroke-dasharray:3 3;stroke-opacity:.7}.quad{fill:rgba(255,181,71,.07)}
.lasso-surface{fill:transparent}.lasso-selection{fill:var(--ns);fill-opacity:.06;stroke:var(--ns);stroke-width:1.5;stroke-dasharray:4 3}
.ab{font-family:var(--mono);font-size:12px;font-weight:500;fill:var(--ink);paint-order:stroke;stroke:var(--panel);stroke-width:4px}
.head{fill:none;stroke:#6B7489;stroke-width:1.2}.contour{fill:none;stroke:#fff;stroke-opacity:.09;stroke-width:.7}
.colhead,.rowhead{font-size:12px;font-weight:600;fill:var(--ink);text-anchor:middle}.colhead tspan.m{fill:var(--muted);font-weight:500}
.ts-line{fill:none;stroke-width:2}.scan{display:none}.mlabel{font-size:10.5px;fill:var(--ink2)}.mlabel.on{fill:var(--vuln);font-weight:600}
.mdim{font-family:var(--mono);font-size:10px;fill:var(--muted)}.mhit{fill:transparent}.mhit.on{fill:rgba(255,181,71,.08)}
.sep{stroke:var(--rule)}.null-band{fill:var(--null)}.ref-line{stroke:var(--ink2);stroke-dasharray:5 4}.ehit{fill:transparent}
.brush .selection{fill:rgba(255,181,71,.10);stroke:var(--vuln)}.brush .overlay{fill:none}.brush .handle{display:none}
@media print{main{padding:12px}section.fig{break-inside:avoid}.btns{display:none}}`;

  const READ = {
    topo:"Cada círculo es la cabeza vista desde arriba (nariz arriba) con 61 electrodos interpolados. Columnas: tras dormir normal (NS), tras la privación (SD) y su diferencia Δ = SD − NS. NS y SD comparten la escala secuencial de su fila; Δ usa una escala divergente con el cero oscuro: magenta = sube tras la privación, cian = baja. Anillo = p < 0.05 sin corregir; relleno = sobrevive la corrección FDR (solo con las 68 personas). Con dos personas o dos grupos, las filas pasan a ser esas personas o grupos, con escalas compartidas.",
    scatter:"Cada punto es una persona: en x, el cambio theta (SD − NS) de la región, el electrodo o la ventana elegidos; en y, el cambio en el marcador conductual (arriba = peor). Las líneas punteadas son las medianas y el área ámbar es el cuadrante vulnerable (sobre ambas medianas). La franja inferior muestra a las 68 personas sobre el mismo eje x, incluidas las que no tienen el marcador. ρ es la correlación de Spearman con su IC 95 %.",
    dyn:"Potencia theta relativa en cada una de las 75 épocas de 4 s del registro de 5 minutos: media del grupo activo ± error estándar, tras dormir normal (NS) y tras la privación (SD). La línea punteada es la tendencia lineal. Con una comparación de grupos se muestra el cambio Δ = SD − NS de cada grupo. Un recuadro ámbar indica la ventana de tiempo elegida.",
    heat:"Cada fila es una persona y cada columna un electrodo, agrupados en frontal, centro-temporal y posterior (de adelante hacia atrás). El color es su cambio Δ = SD − NS: magenta = sube tras la privación, cian = baja, oscuro = sin cambio. Las filas forman dos grupos definidos solo por la conducta (vulnerables: peor que la mediana del marcador; resistentes: el resto), o los dos grupos de la comparación, y se ordenan por su cambio medio en la región elegida. Sobre cada bloque, C(e) es la consistencia del grupo (proporción que sube menos la que baja); arriba, la media de todos. Una firma compartida se ve como un bloque del mismo color; si el efecto lo dominan pocas personas, se ven una o dos filas muy intensas.",
    graph:"Cada nodo es una persona, con el color de su grupo. Cada una se une a las 3 personas cuyo patrón de cambio en los 61 electrodos más se le parece (correlación de Pearson); las aristas dentro de un grupo llevan su color. Si un grupo comparte firma, sus nodos quedan juntos; si están repartidos, cada persona cambia a su manera. El título cuenta cuántos de esos vecinos son del mismo grupo frente a lo esperado por azar. No es conectividad funcional entre electrodos.",
    multi:"Cada punto es un análisis completo de la relación entre el cambio theta y el cambio conductual, con una combinación distinta de región, métrica, forma de cambio, marcador, correlación y manejo de atípicos (448 en total), ordenados por su correlación. La franja gris es el 95 % de lo que produciría el azar (2000 permutaciones). A la derecha, la mediana y el rango intercuartil de r para cada decisión. Si theta predijera el deterioro, la curva quedaría por encima de la franja.",
  };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;"}[c]));
  const svgOf = id => { const s = document.querySelector(`#${id} svg`); if(!s) return ""; const c = s.cloneNode(true); c.removeAttribute("style"); c.setAttribute("xmlns", "http://www.w3.org/2000/svg"); return c.outerHTML; };
  const titleOf = id => $(id).innerHTML;

  function state(){
    const c = COMPARES.find(c => c.k === S.cmp), rows = [
      ["Región EEG", ROI[S.roi].name, S.elec ? "sustituida por un electrodo" : ""],
      ["Métrica theta", S.met === "var" ? "σθ, variabilidad entre épocas" : "μθ, media", ""],
      ["Marcador del eje Y", S.spec ? mvLabel("marker", S.spec.marker) : MK[S.y].name, ""],
      ["Eje x", xName(), S.spec ? "definido por un análisis del multiverso" : ""],
      ["Comparación", c ? c.name : "Sin comparación", ""],
      ["Personas activas", S.selected ? `${S.selected.length} (tu selección con lazo)` : `${EEG.length} (todas con EEG pareado)`, ""],
      ["Personas A y B", S.pair.length ? S.pair.map((d, i) => `${"AB"[i]} ${d.id}`).join(", ") : "ninguna", ""],
    ];
    if(S.win) rows.push(["Ventana de tiempo", winTxt(S.win), "dentro del registro de 5 min"]);
    if(S.spec) rows.push(["Análisis del multiverso", MULTI.dims.map(d => mvLabel(d.key, S.spec[d.key])).join(" · "), `r = ${f2(S.spec.r)} [${f2(S.spec.lo)}, ${f2(S.spec.hi)}], n = ${S.spec.n}`]);
    return rows;
  }
  function people(){
    const xk = S.xKey(), yk = yK(), G = cmpGroups(), ids = new Set(activeIds());
    return P.filter(d => d[xk] != null && ids.has(d.id)).map(d => ({
      id:d.id, sexo:d.gender === "F" ? "mujer" : "hombre", edad:d.age, psqi:d.psqi ?? "", x:d[xk], y:d[yk] ?? "",
      grupo:G ? ((G.find(g => g.set.has(d.id)) || {}).name || "") : "", vulnerable:S.vuln.has(d.id) ? "sí" : "", AB:pairLetter(d) || "",
    })).sort((a, b) => b.x-a.x);
  }
  function csv(rows){
    const head = ["participante", "sexo", "edad", "psqi", xName(), mkY().ax2, "grupo", "cuadrante_vulnerable", "A_B"];
    const lines = rows.map(r => [r.id, r.sexo, r.edad, r.psqi, r.x, r.y, r.grupo, r.vulnerable, r.AB].map(v => /[",;\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v).join(","));
    return [head.map(h => `"${h}"`).join(",")].concat(lines).join("\n");
  }
  function build(){
    const now = new Date(), stamp = now.toLocaleString("es-PE", {dateStyle:"long", timeStyle:"short"});
    const rows = people(), csvTxt = csv(rows), csvHref = "data:text/csv;charset=utf-8," + encodeURIComponent("﻿" + csvTxt);
    const st = state().map(([k, v, n]) => `<div><span>${esc(k)}</span><b>${esc(v)}</b>${n ? `<span>${esc(n)}</span>` : ""}</div>`).join("");
    const fig = (id, tid, key) => `<section class="fig"><div class="t">${titleOf(tid)}</div><p>${READ[key]}</p>${svgOf(id)}</section>`;
    const tbl = `<table><thead><tr><th>Participante</th><th>Sexo</th><th>Edad</th><th>PSQI</th><th>${esc(xName())}</th><th>${esc(mkY().ax2)}</th><th>Grupo</th><th>Vulnerable</th><th>A/B</th></tr></thead><tbody>` +
      rows.map(r => `<tr><td>${r.id}</td><td>${r.sexo}</td><td>${r.edad ?? ""}</td><td>${r.psqi}</td><td>${fsr(r.x)}</td><td>${r.y === "" ? "sin dato" : fsr(r.y)}</td><td>${esc(r.grupo)}</td><td>${r.vulnerable}</td><td>${r.AB}</td></tr>`).join("") + "</tbody></table>";
    return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>BATIMIX, reporte de la vista (${esc(stamp)})</title>
${[...document.querySelectorAll('link[href*="fonts.googleapis"][rel="stylesheet"]')].map(l => l.outerHTML).join("")}
<style>${CSS()}</style></head><body><main>
<h1>BATIMIX</h1>
<p class="sub">Reporte de la vista generado el ${esc(stamp)}; EEG de reposo de 68 personas tras dormir normal (NS) y tras 24 a 30 horas sin dormir (SD); OpenNeuro ds004902 (Xiang et al., 2024), CC0.</p>
<div class="state">${st}</div>
<div class="btns"><button onclick="print()">Imprimir o guardar como PDF</button><a download="BATIMIX_datos_vista.csv" href="${csvHref}">Descargar los datos (CSV)</a></div>
<h2>Lo que muestra la vista</h2>
${$("drawer").classList.contains("open") ? fig("heat", "t-heat", "heat") + fig("graph", "t-graph", "graph") : ""}
${fig("topo", "t-topo", "topo")}
${fig("scatter", "t-sc", "scatter")}
${fig("dyn", "t-dyn", "dyn")}
${fig("curve", "t-multi", "multi")}
<h2>Conclusión preliminar del proyecto</h2>
<p>Sin dormir, la theta de cada persona cambia en direcciones distintas, y ese cambio no predice de forma robusta quién se deteriora: en 448 análisis alternativos ningún estadístico conjunto supera al azar. La única pista consistente es con el ánimo (afecto positivo), no con la vigilancia. Es una herramienta de screening exploratorio, no un diagnóstico.</p>
<h2>Personas en esta vista (${rows.length})</h2>
${tbl}
<h2>Método en breve</h2>
<p class="m">Potencia theta relativa (4 a 8 Hz dividida por 1 a 40 Hz, Welch) en 75 épocas de 4 s por registro, ojos abiertos, 61 electrodos, referencia FCz, sin ICA. σθ = desviación estándar entre épocas; μθ = media; Δ = SD − NS. Electrodos: t pareada con corrección FDR de Benjamini y Hochberg. Asociaciones: Spearman con IC 95 % (Fisher). Multiverso: 448 especificaciones con inferencia conjunta por permutación (Simonsohn, Simmons y Nelson, 2020). Equipo: Jimena Gurbillon, Andrea Coa y Paolo Medrano, DS5343 Data Visualization, UTEC 2026-2.</p>
</main></body></html>`;
  }
  function download(){
    const html = build(), blob = new Blob([html], {type:"text/html;charset=utf-8"}), url = URL.createObjectURL(blob);
    const d = new Date(), pad = n => String(n).padStart(2, "0");
    const a = document.createElement("a"); a.href = url; a.download = `BATIMIX_reporte_${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}.html`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  return {download, build};
})();
