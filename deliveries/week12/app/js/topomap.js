/* Vista 1 · Matriz de topomapas 2 × 3 (tareas T1, T2 y T4).
   Columnas: NS, SD y Δ (SD menos NS). Filas: σθ y μθ del grupo activo (las 68 personas o el grupo elegido).
   Con dos personas elegidas en la dispersión (A y B), las filas pasan a ser A y B con la métrica del header.
   Escalas: NS y SD comparten una secuencial por fila; Δ usa una divergente con cero oscuro. En el modo A y B
   ambas filas comparten las mismas escalas para que la comparación sea honesta.
   Marcas de significancia (t pareada, FDR) en Δ: de las 68 o de cada grupo comparado por una variable externa a Δθ.
   Sin prueba: dos personas, selecciones y vulnerables vs resto (grupos definidos por el propio Δθ: sería circular). */
const topo = (() => {
  const el = $("topo"), GN = 96;
  let MAPS = [], linkG = null, curSpec = null;
  // Reproducción: mientras corre, los mapas muestran una ventana del largo elegido (S.winLen épocas; 60 s por defecto) que avanza por el registro:
  // μθ = media de la ventana y σθ = desviación estándar dentro de ella, por electrodo, para el grupo activo.
  // frame = [época inicial, época final] o null; lock = escalas fijas durante la reproducción (los colores no se reescalan).
  let frame = null, lock = null;
  const winCache = new Map();
  // test = prueba t pareada por electrodo dentro de la ventana (misma regla que sin reproducción: n ≥ 3 y grupos no circulares)
  function winTopo(ids, [a, b], test = false){
    const key = S.band+"|"+ids.join(",")+"|"+a+"|"+b+"|"+(test ? 1 : 0); if(winCache.has(key)) return winCache.get(key);   // la banda cambia ELEP
    const out = {};
    ELEC.forEach(e => {
      const i = ELEP.idx[e]; if(i == null) return;
      const nm = [], nv = [], sm = [], sv = [];
      ids.forEach(id => {
        const p = ELEP.persons[id]; if(!p || !p.NS || !p.SD) return;
        const f = c => { const arr = p[c][i].slice(a, b+1).filter(v => v != null).map(v => v/ELEP.scale); return arr.length >= 3 ? [d3.mean(arr), sdPop(arr)] : null; };
        const n = f("NS"), sd = f("SD"); if(n && sd){ nm.push(n[0]); nv.push(n[1]); sm.push(sd[0]); sv.push(sd[1]); }
      });
      if(!nm.length) return;
      const NS = {mean:d3.mean(nm), var:d3.mean(nv)}, SD = {mean:d3.mean(sm), var:d3.mean(sv)};
      out[e] = {NS, SD, dMean:SD.mean-NS.mean, dVar:SD.var-NS.var, nPaired:nm.length, ...pairedTests(test, nm, nv, sm, sv)};
    });
    if(test) addFDR(out);
    if(winCache.size > 4000) winCache.clear();
    winCache.set(key, out); return out;
  }   // posiciones de los 6 mapas para enlazar un mismo electrodo en todos
  const cnv = document.createElement("canvas"); cnv.width = GN; cnv.height = GN; const ctx = cnv.getContext("2d");
  // misma prueba que con los 68: t pareada (Δ de cada persona contra 0) en el conjunto, para σθ y μθ
  function pairedTests(test, nm, nv, sm, sv){
    const tv = test ? tTest1(sv.map((v, i) => v-nv[i])) : null, tm = test ? tTest1(sm.map((v, i) => v-nm[i])) : null;
    return {sigVar:tv ? tv.p : null, sigMean:tm ? tm.p : null, tVar:tv ? tv.t : null, tMean:tm ? tm.t : null};
  }
  // FDR de Benjamini y Hochberg sobre los electrodos con prueba, por métrica
  function addFDR(out){
    [["sigVar", "qVar"], ["sigMean", "qMean"]].forEach(([pk, qk]) => {
      const es = Object.keys(out).filter(e => out[e][pk] != null), q = bh(es.map(e => out[e][pk]));
      es.forEach((e, i) => { out[e][qk] = q[i]; });
    });
  }
  const val = (t, cond, met) => cond === "D" ? (met === "var" ? t.dVar : t.dMean) : (t[cond] ? t[cond][met] : null);

  // promedio por electrodo del grupo activo; sin grupo, el agregado de los 68 con sus pruebas
  // promedio por electrodo de un conjunto de personas (o el agregado de los 68, con sus pruebas)
  // test: hacer la prueba por electrodo (sin selección = los 68; grupos de comparación no circulares)
  function groupTopo(sel, test){
    if(frame){ const ids = (sel || EEG_IDS).filter(id => ELEP.persons[id]); return {T:winTopo(ids, frame, !!test && ids.length >= 3), mode:"group", n:ids.length}; }
    if(!sel) return {T:TOPO, mode:"all"};
    const ids = sel.filter(id => SUBTOPO[id]);
    if(!ids.length) return {T:TOPO, mode:"all"};
    const out = {};
    ELEC.forEach(e => {
      const nm = [], nv = [], sm = [], sv = [];
      ids.forEach(id => { const t = SUBTOPO[id][e]; if(t){ nm.push(t.NS.mean); nv.push(t.NS.var); sm.push(t.SD.mean); sv.push(t.SD.var); } });
      if(!nm.length) return;
      const NS = {mean:d3.mean(nm), var:d3.mean(nv)}, SD = {mean:d3.mean(sm), var:d3.mean(sv)};
      out[e] = {NS, SD, dMean:SD.mean-NS.mean, dVar:SD.var-NS.var, nPaired:nm.length, ...pairedTests(test, nm, nv, sm, sv)};
    });
    addFDR(out);
    return {T:out, mode:"group", n:ids.length, tested:!!test && ids.length >= 3};
  }
  function spec(){
    // dos personas lado a lado: las fijadas con Mayús + clic (A y B) o una selección de exactamente dos;
    // con tres o más, el promedio del grupo. La selección manda sobre la comparación: con personas elegidas,
    // los mapas son de ellas; sin selección, de los dos grupos
    const sel2 = S.selected && S.selected.length === 2 ? S.selected : null;
    const [a, b] = S.pair.length === 2 ? S.pair.map(d => d.id) : (sel2 || []);
    if(a && b && SUBTOPO[a] && SUBTOPO[b]){
      const lab = S.pair.length === 2 ? ["A · ", "B · "] : ["", ""];
      return {mode:"pair", names:[lab[0]+a, lab[1]+b], rows:[{label:lab[0]+a, met:S.met, T:frame ? winTopo([a], frame) : SUBTOPO[a]}, {label:lab[1]+b, met:S.met, T:frame ? winTopo([b], frame) : SUBTOPO[b]}]};
    }
    const G = viewGroups();
    if(G){
      const ts = G.map(gr => groupTopo(gr.ids, !gr.circular));
      return {mode:"cmp", G, circular:G[0].circular, rows:G.map((gr, i) => ({label:`${gr.name} (${ts[i].n || gr.ids.length})`, met:S.met, T:ts[i].T, color:gr.color, ids:gr.ids, test:!gr.circular}))};
    }
    const g = groupTopo(S.selected, !S.selected);
    const ids = (S.selected || EEG_IDS).filter(id => SUBTOPO[id]);
    return {mode:g.mode, n:g.n, rows:[{label:"σθ", met:"var", T:g.T, ids, test:!S.selected}, {label:"μθ", met:"mean", T:g.T, ids, test:!S.selected}]};
  }
  function scalesFor(rows){
    const seqDom = rs => d3.extent(rs.flatMap(r => ELEC.flatMap(e => r.T[e] ? [val(r.T[e], "NS", r.met), val(r.T[e], "SD", r.met)] : [])).filter(v => v != null));
    const divMax = rs => d3.max(rs.flatMap(r => ELEC.map(e => r.T[e] ? Math.abs(val(r.T[e], "D", r.met)) : 0))) || 1;
    return rs => ({seq:seqDom(rs), div:divMax(rs)});
  }
  // ---------- spline esférico (Perrin et al., 1989) ----------
  // Los electrodos son puntos de la esfera unitaria (data/coords3d.json, posiciones reales de ds004902).
  // Campo: f(q) = c0 + Σ cᵢ·g(q·pᵢ), con g(x) = 1/(4π) Σₙ (2n+1)/(n(n+1))^m · Pₙ(x), m = 4, y los cᵢ que
  // resuelven [G 1; 1ᵀ 0][c; c0] = [v; 0]. Sin regularización: el mapa pasa exacto por cada electrodo.
  // g(píxel, electrodo) depende solo de la geometría, así que se calcula una vez (SPL.M) y cada mapa cuesta
  // un sistema (n+1)×(n+1) y una multiplicación matriz × vector. Con 7 términos de Legendre (los de eeg_interp de
  // EEGLAB, que resuelve con pseudoinversa) el sistema de 61 electrodos queda mal condicionado para una solución
  // directa; con 20 el resultado ya es igual que con 50 (MNE interpolate_bads usa 50 con α = 1e-5).
  // Métodos de interpolación de las herramientas de referencia. Por defecto v4 (EEGLAB topoplot y FieldTrip
  // ft_topoplotER); el selector del panel (o ?interp=ct|spline en la URL) cambia a la cúbica de MNE o al spline esférico.
  // Las tres implementaciones se verificaron contra las originales (MATLAB R2022a con EEGLAB y FieldTrip; MNE 1.8):
  // la diferencia máxima es del orden de 1e-10 del rango del mapa.
  const METHODS = {
    v4:"Biharmonic v4 interpolation (Sandwell, 1987), as in EEGLAB topoplot and FieldTrip ft_topoplotER.",
    ct:"2D Clough-Tocher cubic interpolation with a border ring, as in MNE plot_topomap.",
    spline:"Spherical spline interpolation (Perrin et al., 1989) on the 3D positions of the 61 electrodes."};
  const DEFAULT_METHOD = "v4";
  const METHOD = DEFAULT_METHOD;   // interpolación fija: v4 (EEGLAB topoplot, FieldTrip ft_topoplotER)
  const SPL_M = 4, SPL_K = 20;
  let SPL = null, V4 = null;
  const CT = new Map();
  const stats = {method:null, setupMs:0, lastMs:0, maps:0};
  const LEG = Float64Array.from({length:SPL_K+1}, (_, n) => n ? (2*n+1)/Math.pow(n*(n+1), SPL_M)/(4*Math.PI) : 0);
  function legG(x){   // recurrencia de Bonnet para Pₙ(x)
    let p0 = 1, p1 = x, s = LEG[1]*x;
    for(let n = 2; n <= SPL_K; n++){ const p2 = ((2*n-1)*x*p1-(n-1)*p0)/n; p0 = p1; p1 = p2; s += LEG[n]*p1; }
    return s;
  }
  function spline(){
    if(SPL !== null) return SPL;
    if(!COORDS3 || !COORDS3.pos || ELEC.some(e => !COORDS3.pos[e])) return (SPL = false);
    const t0 = performance.now(), N = ELEC.length, P = ELEC.map(e => COORDS3.pos[e]), edge = COORDS3.edgeDeg*Math.PI/180;
    const Gee = new Float64Array(N*N), M = new Float64Array(GN*GN*N);
    for(let i = 0; i < N; i++) for(let j = 0; j < N; j++) Gee[i*N+j] = legG(P[i][0]*P[j][0]+P[i][1]*P[j][1]+P[i][2]*P[j][2]);
    for(let iy = 0; iy < GN; iy++) for(let ix = 0; ix < GN; ix++){
      // píxel → esfera: inversa de la proyección azimutal equidistante; fuera del círculo se repite el borde
      const ux = -1+(ix+.5)*2/GN, uy = 1-(iy+.5)*2/GN, th = Math.min(1, Math.hypot(ux, uy))*edge, ph = Math.atan2(uy, ux);
      const qx = Math.sin(th)*Math.cos(ph), qy = Math.sin(th)*Math.sin(ph), qz = Math.cos(th), o = (iy*GN+ix)*N;
      for(let i = 0; i < N; i++) M[o+i] = legG(qx*P[i][0]+qy*P[i][1]+qz*P[i][2]);
    }
    stats.setupMs = performance.now()-t0;
    return (SPL = {N, Gee, M});
  }
  // eliminación gaussiana con pivoteo parcial; null si el sistema es singular
  function solve(A, b, n){
    for(let k = 0; k < n; k++){
      let p = k; for(let i = k+1; i < n; i++) if(Math.abs(A[i*n+k]) > Math.abs(A[p*n+k])) p = i;
      if(Math.abs(A[p*n+k]) < 1e-14) return null;
      if(p !== k){ for(let j = 0; j < n; j++){ const t = A[k*n+j]; A[k*n+j] = A[p*n+j]; A[p*n+j] = t; } const t = b[k]; b[k] = b[p]; b[p] = t; }
      for(let i = k+1; i < n; i++){ const f = A[i*n+k]/A[k*n+k]; if(!f) continue; for(let j = k; j < n; j++) A[i*n+j] -= f*A[k*n+j]; b[i] -= f*b[k]; }
    }
    for(let i = n-1; i >= 0; i--){ let s = b[i]; for(let j = i+1; j < n; j++) s -= A[i*n+j]*b[j]; b[i] = s/A[i*n+i]; }
    return b;
  }
  function splineGrid(S3, idx, vals){
    const n = idx.length, n1 = n+1, N = S3.N, A = new Float64Array(n1*n1), b = new Float64Array(n1);
    for(let a = 0; a < n; a++){ for(let c = 0; c < n; c++) A[a*n1+c] = S3.Gee[idx[a]*N+idx[c]]; A[a*n1+n] = 1; A[n*n1+a] = 1; b[a] = vals[a]; }
    const c = solve(A, b, n1); if(!c || !c.every(isFinite)) return null;
    const grid = new Float64Array(GN*GN);
    for(let p = 0; p < GN*GN; p++){ const o = p*N; let s = c[n]; for(let a = 0; a < n; a++) s += c[a]*S3.M[o+idx[a]]; grid[p] = s; }
    return grid;
  }
  // centro del píxel p en el plano de la cabeza; fuera del círculo se usa el punto del borde en la misma dirección
  function pixXY(p){
    let x = -1+(p%GN+.5)*2/GN, y = 1-((p/GN|0)+.5)*2/GN; const r = Math.hypot(x, y);
    if(r > 1){ x /= r; y /= r; }
    return [x, y];
  }
  // ---------- biarmónico v4 (EEGLAB topoplot, FieldTrip ft_topoplotER) ----------
  // griddata 'v4' de MATLAB (Sandwell, 1987): f(q) = Σ wᵢ·g(|q − pᵢ|), g(d) = d²(ln d − 1), sobre las posiciones 2D.
  // g no es invariante a la escala, así que se usan las unidades de topoplot: radio = colatitud/180 (0.5 en el
  // ecuador), comprimido por squeeze = 0.5/plotrad con plotrad = 1.02 × el radio máximo de los electrodos.
  function v4Geom(){
    if(V4) return V4;
    const N = ELEC.length, edgeDeg = COORDS3 ? COORDS3.edgeDeg : 100;
    const maxR = d3.max(ELEC, e => Math.hypot(...COORDS[e]))*edgeDeg/180, plotrad = Math.max(.5, Math.min(1, maxR*1.02));
    const s = edgeDeg/180*(.5/plotrad), X = ELEC.map(e => [COORDS[e][0]*s, COORDS[e][1]*s]);
    const gr = d => d > 0 ? d*d*(Math.log(d)-1) : 0, Gee = new Float64Array(N*N), M = new Float64Array(GN*GN*N);
    for(let i = 0; i < N; i++) for(let j = 0; j < N; j++) Gee[i*N+j] = gr(Math.hypot(X[i][0]-X[j][0], X[i][1]-X[j][1]));
    for(let p = 0; p < GN*GN; p++){ const [x, y] = pixXY(p); for(let i = 0; i < N; i++) M[p*N+i] = gr(Math.hypot(x*s-X[i][0], y*s-X[i][1])); }
    return (V4 = {N, Gee, M});
  }
  function v4Grid(G, idx, vals){
    const n = idx.length, N = G.N, A = new Float64Array(n*n), b = Float64Array.from(vals);
    for(let a = 0; a < n; a++) for(let c = 0; c < n; c++) A[a*n+c] = G.Gee[idx[a]*N+idx[c]];
    const w = solve(A, b, n); if(!w || !w.every(isFinite)) return null;
    const grid = new Float64Array(GN*GN);
    for(let p = 0; p < GN*GN; p++){ const o = p*N; let s = 0; for(let a = 0; a < n; a++) s += w[a]*G.M[o+idx[a]]; grid[p] = s; }
    return grid;
  }
  // ---------- cúbica de Clough-Tocher (MNE plot_topomap: image_interp="cubic", extrapolate="head", border="mean") ----------
  // Igual que mne.viz.topomap._GridData + scipy CloughTocher2DInterpolator: se agrega un anillo de puntos a radio
  // 1.1 + d (d = distancia mediana entre electrodos vecinos), cada uno con el promedio de sus electrodos vecinos;
  // se triangula todo (Delaunay), se estiman los gradientes minimizando la curvatura (Nielson, 1983; Renka y Cline,
  // 1984) y en cada triángulo se evalúa el parche cúbico de Clough-Tocher en forma de Bézier.
  function bary(P, a, b, c, x, y){
    const det = (P[b][1]-P[c][1])*(P[a][0]-P[c][0])+(P[c][0]-P[b][0])*(P[a][1]-P[c][1]);
    const l0 = ((P[b][1]-P[c][1])*(x-P[c][0])+(P[c][0]-P[b][0])*(y-P[c][1]))/det;
    const l1 = ((P[c][1]-P[a][1])*(x-P[c][0])+(P[a][0]-P[c][0])*(y-P[c][1]))/det;
    return [l0, l1, 1-l0-l1];
  }
  function ctGeom(idx){
    const key = idx.join(","); if(CT.has(key)) return CT.get(key);
    const n = idx.length, pos = idx.map(i => COORDS[ELEC[i]]);
    const t0 = d3.Delaunay.from(pos).triangles, ds = [];   // MNE: aristas 1-2 y 2-3 de cada triángulo
    for(let t = 0; t < t0.length; t += 3){ const [a, b, c] = [pos[t0[t]], pos[t0[t+1]], pos[t0[t+2]]]; ds.push(Math.hypot(a[0]-b[0], a[1]-b[1]), Math.hypot(b[0]-c[0], b[1]-c[1])); }
    // con los 61 electrodos se usa la distancia exacta de MNE, precalculada con qhull (tools/build_coords.py)
    const dist = n === ELEC.length && COORDS3 && COORDS3.mneRingDist ? COORDS3.mneRingDist : d3.median(ds), nr = Math.max(12, Math.round(2*Math.PI/Math.asin(Math.min(dist, 1)))), rr = 1.1+dist;
    const P = pos.concat(d3.range(nr).map(k => [Math.cos(2*Math.PI*k/nr)*rr, Math.sin(2*Math.PI*k/nr)*rr]));
    const D = d3.Delaunay.from(P), tri = D.triangles, he = D.halfedges, nt = tri.length/3, m = P.length;
    const nb = d3.range(m).map(i => Array.from(D.neighbors(i)));
    // g[k] de cada triángulo, con el vecino opuesto al vértice k (scipy _clough_tocher_2d_single)
    const gk = new Float64Array(nt*3);
    for(let t = 0; t < nt; t++) for(let k = 0; k < 3; k++){
      const o = he[3*t+(k+1)%3]; if(o < 0){ gk[3*t+k] = -.5; continue; }
      const u = 3*Math.floor(o/3), cx = (P[tri[u]][0]+P[tri[u+1]][0]+P[tri[u+2]][0])/3, cy = (P[tri[u]][1]+P[tri[u+1]][1]+P[tri[u+2]][1])/3;
      const c = bary(P, tri[3*t], tri[3*t+1], tri[3*t+2], cx, cy), i0 = (k+2)%3, i1 = (k+1)%3;
      gk[3*t+k] = (2*c[i0]+c[i1]-1)/(2-3*c[i0]-3*c[i1]);
    }
    // triángulo y coordenadas baricéntricas de cada píxel
    const pt = new Int32Array(GN*GN), pb = new Float64Array(GN*GN*3);
    for(let p = 0; p < GN*GN; p++){
      const [x, y] = pixXY(p); let best = -1, bm = -Infinity, bb = null;
      for(let t = 0; t < nt; t++){
        const b = bary(P, tri[3*t], tri[3*t+1], tri[3*t+2], x, y), mn = Math.min(b[0], b[1], b[2]);
        if(mn > bm){ bm = mn; best = t; bb = b; if(mn >= 0) break; }
      }
      pt[p] = best; pb[3*p] = bb[0]; pb[3*p+1] = bb[1]; pb[3*p+2] = bb[2];
    }
    const G = {n, m, P, tri, nt, nb, gk, pt, pb};
    CT.set(key, G); return G;
  }
  function ctGrid(G, vals){
    const {n, m, P, tri, nt, nb, gk, pt, pb} = G, f = new Float64Array(m);
    for(let i = 0; i < n; i++) f[i] = vals[i];
    const used = [];
    for(let j = n; j < m; j++){ const g = nb[j].filter(i => i < n); if(g.length){ f[j] = d3.mean(g, i => f[i]); used.push(j); } }
    if(used.length < m-n){ const mu = d3.mean(used, j => f[j]); for(let j = n; j < m; j++) if(!used.includes(j)) f[j] = mu; }
    // gradientes: Gauss-Seidel de scipy estimate_gradients_2d_global (maxiter 400, tol 1e-6)
    const gx = new Float64Array(m), gy = new Float64Array(m);
    for(let it = 0; it < 400; it++){
      let err = 0;
      for(let i = 0; i < m; i++){
        let q0 = 0, q1 = 0, q3 = 0, s0 = 0, s1 = 0;
        for(const j of nb[i]){
          const ex = P[j][0]-P[i][0], ey = P[j][1]-P[i][1], L = Math.hypot(ex, ey), L3 = L*L*L, df2 = -ex*gx[j]-ey*gy[j];
          q0 += 4*ex*ex/L3; q1 += 4*ex*ey/L3; q3 += 4*ey*ey/L3;
          const h = 6*(f[i]-f[j])-2*df2; s0 += h*ex/L3; s1 += h*ey/L3;
        }
        const det = q0*q3-q1*q1, r0 = (q3*s0-q1*s1)/det, r1 = (-q1*s0+q0*s1)/det;
        const ch = Math.max(Math.abs(gx[i]+r0), Math.abs(gy[i]+r1))/Math.max(1, Math.abs(r0), Math.abs(r1));
        gx[i] = -r0; gy[i] = -r1; err = Math.max(err, ch);
      }
      if(err < 1e-6) break;
    }
    // coeficientes de Bézier de cada triángulo
    const C = new Float64Array(nt*19);
    for(let t = 0; t < nt; t++){
      const a = tri[3*t], b = tri[3*t+1], c = tri[3*t+2];
      const e12x = P[b][0]-P[a][0], e12y = P[b][1]-P[a][1], e23x = P[c][0]-P[b][0], e23y = P[c][1]-P[b][1], e31x = P[a][0]-P[c][0], e31y = P[a][1]-P[c][1];
      const f1 = f[a], f2 = f[b], f3 = f[c];
      const df12 = gx[a]*e12x+gy[a]*e12y, df21 = -(gx[b]*e12x+gy[b]*e12y), df23 = gx[b]*e23x+gy[b]*e23y;
      const df32 = -(gx[c]*e23x+gy[c]*e23y), df31 = gx[c]*e31x+gy[c]*e31y, df13 = -(gx[a]*e31x+gy[a]*e31y);
      const c3000 = f1, c2100 = (df12+3*c3000)/3, c2010 = (df13+3*c3000)/3;
      const c0300 = f2, c1200 = (df21+3*c0300)/3, c0210 = (df23+3*c0300)/3;
      const c0030 = f3, c1020 = (df31+3*c0030)/3, c0120 = (df32+3*c0030)/3;
      const c2001 = (c2100+c2010+c3000)/3, c0201 = (c1200+c0300+c0210)/3, c0021 = (c1020+c0120+c0030)/3;
      const g0 = gk[3*t], g1 = gk[3*t+1], g2 = gk[3*t+2];
      const c0111 = (g0*(-c0300+3*c0210-3*c0120+c0030)+(-c0300+2*c0210-c0120+c0021+c0201))/2;
      const c1011 = (g1*(-c0030+3*c1020-3*c2010+c3000)+(-c0030+2*c1020-c2010+c2001+c0021))/2;
      const c1101 = (g2*(-c3000+3*c2100-3*c1200+c0300)+(-c3000+2*c2100-c1200+c2001+c0201))/2;
      const c1002 = (c1101+c1011+c2001)/3, c0102 = (c1101+c0111+c0201)/3, c0012 = (c1011+c0111+c0021)/3, c0003 = (c1002+c0102+c0012)/3;
      C.set([c3000, c2100, c2010, c2001, c1200, c1101, c1020, c1011, c1002, c0300, c0210, c0201, c0120, c0111, c0102, c0030, c0021, c0012, c0003], 19*t);
    }
    const grid = new Float64Array(GN*GN);
    for(let p = 0; p < GN*GN; p++){
      const k = 19*pt[p], b0 = pb[3*p], b1_ = pb[3*p+1], b2_ = pb[3*p+2], mv = Math.min(b0, b1_, b2_);
      const b1 = b0-mv, b2 = b1_-mv, b3 = b2_-mv, b4 = 3*mv;
      grid[p] = b1**3*C[k] + 3*b1**2*b2*C[k+1] + 3*b1**2*b3*C[k+2] + 3*b1**2*b4*C[k+3] + 3*b1*b2**2*C[k+4]
        + 6*b1*b2*b4*C[k+5] + 3*b1*b3**2*C[k+6] + 6*b1*b3*b4*C[k+7] + 3*b1*b4**2*C[k+8] + b2**3*C[k+9]
        + 3*b2**2*b3*C[k+10] + 3*b2**2*b4*C[k+11] + 3*b2*b3**2*C[k+12] + 6*b2*b3*b4*C[k+13] + 3*b2*b4**2*C[k+14]
        + b3**3*C[k+15] + 3*b3**2*b4*C[k+16] + 3*b3*b4**2*C[k+17] + b4**3*C[k+18];
    }
    return grid;
  }
  function field(T, cond, met, color){
    const t0 = performance.now(), idx = [], pts = [];
    ELEC.forEach((e, i) => { const v = T[e] ? val(T[e], cond, met) : null; if(v != null){ idx.push(i); pts.push({x:COORDS[e][0], y:COORDS[e][1], v}); } });
    const vs = pts.map(p => p.v), run = {
      v4:() => v4Grid(v4Geom(), idx, vs),
      ct:() => idx.length >= 4 ? ctGrid(ctGeom(idx), vs) : null,
      spline:() => { const S3 = spline(); return S3 ? splineGrid(S3, idx, vs) : null; }};
    // si el método elegido no puede (p. ej. sin posiciones 3D), se usa v4, que solo necesita las posiciones 2D
    let grid = null;
    for(const m of [METHOD, DEFAULT_METHOD]){
      try { grid = run[m](); } catch(err){ console.warn("interpolación", m, err); grid = null; }
      if(grid){ stats.method = m; break; }
    }
    if(!grid){ stats.method = null; grid = new Float64Array(GN*GN).fill(d3.mean(vs)); }
    const im = ctx.createImageData(GN, GN);
    for(let p = 0; p < GN*GN; p++){ const c = d3.rgb(color(grid[p])), k = p*4; im.data[k] = c.r; im.data[k+1] = c.g; im.data[k+2] = c.b; im.data[k+3] = 255; }
    ctx.putImageData(im, 0, 0);
    stats.lastMs = performance.now()-t0; stats.maps++;
    return {href:cnv.toDataURL(), grid};
  }
  function render(){
    d3.select(el).selectAll("*").remove();
    const W = el.clientWidth || 600, H = Math.max(200, el.clientHeight || 400);
    if(S.series && ELEP){ renderSeries(W, H); return; }
    const sp = spec(), sc0 = scalesFor(sp.rows), sc = frame && lock ? (rs => lock[rs[0].met] || sc0(rs)) : sc0;
    // con el interruptor Δ apagado solo se dibujan NS y SD, con su barra de color
    const conds = S.showD ? ["NS", "SD", "D"] : ["NS", "SD"], nC = conds.length, nB = nC-1;
    // en pantallas angostas las barras se achican y la unidad pasa al ícono ⓘ del panel (no cabe girada)
    const narrow = W < 560, labW = 22, barW = narrow ? 58 : 66, topH = 22;
    // espacios horizontales por agrupación: juntos lo que se lee junto (NS y SD con su barra, Δ con la suya);
    // más aire entre el bloque NS/SD y el bloque Δ (otra codificación de color)
    const gapPair = 8, gapBlock = S.showD ? 20 : 0, rowGap = 10;
    const s = Math.floor(Math.max(64, Math.min((W-labW-nB*barW-gapPair-gapBlock-8)/nC, (H-topH-rowGap-4)/2)));
    const usedW = labW+nC*s+gapPair+nB*barW+gapBlock, x0 = Math.max(0, (W-usedW)/2), y0 = Math.max(0, (H-(topH+2*s+rowGap))/2);
    const sd = x0+labW+s+gapPair;
    const X = {lab:x0, NS:x0+labW, SD:sd, bar1:sd+s+6, D:sd+s+barW+gapBlock, bar2:sd+2*s+barW+gapBlock+6};
    const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("height", H).style("height", H+"px")
      .attr("role", "img").attr("aria-label", `Topomap matrix: columns ${S.showD ? "NS, SD and Δ" : "NS and SD"}; rows ${sp.rows.map(r => r.label).join(" and ")}`);
    const defs = svg.append("defs");
    (s < 130 ? [["NS", "Normal", ""], ["SD", "Deprivation", ""], ["D", "Δ", ""]] : [["NS", "Normal Sleep", ""], ["SD", "Sleep Deprivation", ""], ["D", "Δ", " Deprivation − Normal"]]).filter(([k]) => conds.includes(k)).forEach(([k, a, b]) => {
      const t = svg.append("text").attr("class", "colhead").attr("x", X[k]+s/2).attr("y", y0+14);
      t.append("tspan").text(a); t.append("tspan").attr("class", "m").text(b);
    });
    const shared = sp.mode === "pair" || sp.mode === "cmp" ? sc(sp.rows) : null;
    if(sp.mode !== "pair") sp.rows.forEach(r => { r.cl = clustersFor(r); });   // resultado global de la leyenda y la ⓘ
    MAPS = []; curSpec = sp;
    sp.rows.forEach((row, ri) => {
      const y = y0+topH+ri*(s+rowGap), dom = shared || sc([row]);
      const seqF = v => C.seq((v-dom.seq[0])/((dom.seq[1]-dom.seq[0]) || 1)), divF = v => C.div((v+dom.div)/(2*dom.div));
      svg.append("text").attr("class", "rowhead").attr("transform", `translate(${X.lab+labW/2+2},${y+s/2})${row.label.length > 3 ? " rotate(-90)" : ""}`).style("fill", row.color || null).text(row.label);
      conds.forEach(cond => drawMap(svg, defs, `${ri}${cond}`, X[cond], y, s, row, cond, cond === "D" ? divF : seqF, cond === "D" ? divF : seqF, sp.mode));
      // una barra por fila cuando las filas son métricas distintas (σθ y μθ tienen rangos distintos)
      if(!shared){
        bar(svg, defs, `s${ri}`, X.bar1, y, s, dom.seq, C.seq, false, narrow ? null : UNIT[row.met]);
        if(S.showD) bar(svg, defs, `d${ri}`, X.bar2, y, s, [-dom.div, dom.div], C.div, true, narrow ? null : "Δ " + UNIT[row.met]);
      }
    });
    // dos personas o dos grupos: las filas comparten escala, así que basta una barra larga por columna de color
    if(shared){
      const y = y0+topH, span = sp.rows.length*s+(sp.rows.length-1)*rowGap, met = sp.rows[0].met;
      bar(svg, defs, "s", X.bar1, y, span, shared.seq, C.seq, false, narrow ? null : UNIT[met]);
      if(S.showD) bar(svg, defs, "d", X.bar2, y, span, [-shared.div, shared.div], C.div, true, narrow ? null : "Δ " + UNIT[met]);
    }
    // capa de enlace: anillo del electrodo bajo el cursor (blanco) y del electrodo que manda en la dispersión (ámbar)
    linkG = svg.append("g").style("pointer-events", "none");
    drawLink(null);
    if(frame){
      // rótulo fijo: qué datos muestran los mapas (contra la confusión entre los cinco minutos, una ventana y la serie)
      const len = (frame[1]-frame[0]+1)*4;
      status(svg, W, H, lock ? `Playing · window ${winTxt(frame)} · ${len} s` : `Window ${winTxt(frame)} · ${len} s · exploratory, not corrected across time`);
      if(!lock) frameHeader(sp);   // durante la reproducción no se reescriben el título ni la leyenda
      return;
    }
    header(sp);
  }
  function drawMap(svg, defs, id, x, y, s, row, cond, color, _c, mode, tip){
    const R = s/2-10, cx = x+s/2, cy = y+s/2+3, cid = `tc${id}`;
    MAPS.push({cx, cy, R});
    defs.append("clipPath").attr("id", cid).append("circle").attr("cx", cx).attr("cy", cy).attr("r", R);
    const f = field(row.T, cond, row.met, color);
    const g = svg.append("g");
    g.append("image").attr("x", cx-R).attr("y", cy-R).attr("width", 2*R).attr("height", 2*R).attr("preserveAspectRatio", "none").attr("clip-path", `url(#${cid})`).attr("href", f.href);
    const proj = d3.geoTransform({point(px, py){ this.stream.point(cx-R+px*2*R/GN, cy-R+py*2*R/GN); }});
    // contornos: durante la reproducción, umbrales fijos (los de la escala de color fija), para que las líneas no
    // salten de cuadro en cuadro; fuera de ella, los del propio mapa
    const fx = frame && lock && lock[row.met], dom = fx ? (cond === "D" ? [-fx.div, fx.div] : fx.seq) : d3.extent(f.grid);
    g.append("g").attr("clip-path", `url(#${cid})`).selectAll("path").data(d3.contours().size([GN, GN]).thresholds(d3.ticks(dom[0], dom[1], 7))(Array.from(f.grid)))
      .join("path").attr("class", "contour").attr("d", d3.geoPath(proj));
    g.append("circle").attr("class", "head").attr("cx", cx).attr("cy", cy).attr("r", R);
    g.append("path").attr("class", "head").attr("d", `M ${cx-7} ${cy-R+1.5} L ${cx} ${cy-R-8} L ${cx+7} ${cy-R+1.5}`).attr("stroke-linejoin", "round");
    g.append("path").attr("class", "head").attr("d", `M ${cx-R} ${cy-10} C ${cx-R-7} ${cy-9} ${cx-R-7} ${cy+9} ${cx-R} ${cy+10}`);
    g.append("path").attr("class", "head").attr("d", `M ${cx+R} ${cy-10} C ${cx+R+7} ${cy-9} ${cx+R+7} ${cy+9} ${cx+R} ${cy+10}`);
    // marcas en Δ donde hay prueba por electrodo: los 68 o cada grupo de una comparación definida fuera de Δθ
    // (sexo, orden, PSQI). Sin prueba: dos personas, selecciones (se eligen por su Δθ) y vulnerables vs resto (circular)
    // una sola capa de marcas, la elegida en la leyenda (S.marks): cluster = contorno de la zona significativa;
    // fdr = punto en los electrodos con q < 0.05; p = anillo en los de p < 0.05 sin corregir (exploratorio)
    const mm = cond === "D" && mode !== "pair" ? S.marks : "none";
    const pts = ELEC.filter(e => row.T[e]).map(e => ({e, t:row.T[e], px:cx+dpos(e)[0]*R, py:cy-dpos(e)[1]*R}));
    // null < .05 es verdadero en JS: sin prueba (n < 3) no hay marca
    const p05 = d => pOf(d.t, row.met) != null && pOf(d.t, row.met) < .05;
    // Convención de Cui et al. (2026, mismo dataset y métrica, el estudio que BATIMIX reexamina; Fig. 3B): aro fino sin
    // relleno en los electrodos que sobreviven a FDR (o en los canales del cluster), punto pequeño relleno en los de
    // p < 0.05 sin corregir; el resto, puntos de sensor; color = diferencia en unidades; isolíneas finas. Aro y punto
    // van en el color de tinta del tema (negro en el claro, como en la figura de Cui).
    const inCl = d => mm === "cluster" && row.cl && row.cl.at[d.e] != null;
    const isQ = d => inCl(d) || (mm === "fdr" && p05(d) && qOf(d.t, row.met) < .05), isP = d => isQ(d) || (mm === "p" && p05(d));
    const mr = Math.max(1.6, Math.min(3.4, R*.03));   // radio según el tamaño del mapa (en mapas chicos, celular o serie, no tapan la cabeza)
    g.append("g").selectAll("circle").data(pts).join("circle").attr("cx", d => d.px).attr("cy", d => d.py)
      .attr("r", d => isQ(d) ? mr : (isP(d) ? mr*.55 : 1.1))
      .attr("fill", d => isQ(d) ? "none" : (isP(d) ? C.mark : C.edot))
      .attr("stroke", d => isQ(d) ? C.mark : "none")
      .attr("stroke-width", d => isQ(d) ? 1.2 : 0).style("pointer-events", "none");
    g.append("g").selectAll("circle").data(pts).join("circle").attr("class", "ehit").attr("cx", d => d.px).attr("cy", d => d.py).attr("r", Math.max(5, R*.09))
      .on("pointerenter", (e, d) => { drawLink(d.e); showTip(e, (tip || tipFor)(d.e)); }).on("pointermove", e => moveTip(e))
      .on("pointerleave", () => { drawLink(null); hideTip(); })
      .on("click", (e, d) => { hideTip(); setElec(d.e); });
  }
  // unidades de las barras de color: θ relativa es una fracción de la potencia de 1 a 40 Hz (sin unidades físicas)
  const UNIT = {mean:"fraction of 1–40 Hz", var:"SD across epochs"};
  function bar(svg, defs, id, x, y, s, dom, ramp, div, unit){
    const h = s-30, top = y+18, gid = `tg${id}`;
    if(unit) svg.append("text").attr("class", "bunit").attr("text-anchor", "middle")
      .attr("transform", `translate(${x+60},${top+h/2}) rotate(-90)`).text(unit)
      .append("title").text("Relative θ = 4–8 Hz power divided by 1–40 Hz power (unitless); σθ is its standard deviation across the 75 4-s epochs and μθ its mean.");
    const lg = defs.append("linearGradient").attr("id", gid).attr("x1", "0%").attr("y1", "100%").attr("x2", "0%").attr("y2", "0%");
    d3.range(0, 1.001, .1).forEach(t => lg.append("stop").attr("offset", t).attr("stop-color", div ? ramp(t) : ramp(t)));
    svg.append("rect").attr("x", x).attr("y", top).attr("width", 7).attr("height", h).attr("rx", 3).attr("fill", `url(#${gid})`);
    const sy = d3.scaleLinear().domain(dom).range([top+h, top]);
    svg.append("g").attr("class", "axis").attr("transform", `translate(${x+9},0)`)
      .call(d3.axisRight(sy).ticks(3).tickSize(3).tickFormat(fTick(div ? L.format("+.2~r") : L.format(".2~r")))).call(a => a.select(".domain").remove());
  }
  // un mismo electrodo marcado en los seis mapas
  function drawLink(e){
    if(!linkG) return;
    const at = (m, k) => ({x:m.cx+dpos(k)[0]*m.R, y:m.cy-dpos(k)[1]*m.R});
    const rings = [];
    if(S.elec && COORDS[S.elec]) MAPS.forEach(m => rings.push({...at(m, S.elec), c:C.vuln, w:2}));
    if(e && e !== S.elec) MAPS.forEach(m => rings.push({...at(m, e), c:C.mark, w:1.6}));
    linkG.selectAll("circle").data(rings).join("circle").attr("cx", d => d.x).attr("cy", d => d.y).attr("r", 6).attr("fill", "none").attr("stroke", d => d.c).attr("stroke-width", d => d.w);
  }
  // tooltip: las dos filas del electrodo (NS, SD, Δ) y su relación con el marcador del eje Y
  function tipFor(e){
    const sp = curSpec, all68 = sp.mode === "all";
    return `<div class="h">${e}</div>` + sp.rows.map(row => {
      const t = row.T[e]; if(!t) return "";
      const met = row.met, dv = met === "var" ? t.dVar : t.dMean, r = sp.mode === "pair" ? null : elecRho(e, met), hasP = pOf(t, met) != null;
      return `<div class="m" style="margin-top:4px">${row.label}</div>` + trow("Normal · Deprivation", `${fr(t.NS[met])} · ${fr(t.SD[met])}`) +
        trow("Δ Deprivation − Normal", `${fsr(dv)}${hasP ? ` <span class="m">p ${fp(pOf(t, met))}, q ${fp(qOf(t, met))}</span>` : ""}`) +
        // tamaño de efecto de la prueba t pareada (solo con las 68 personas, donde hay prueba por electrodo)
        (all68 && t.tVar != null ? (sf => trow("95% CI of Δ", `[${fsr(t["ci"+sf][0])}, ${fsr(t["ci"+sf][1])}]`) +
          trow(`t(${t.nPaired-1}) · d<sub>z</sub>`, `${f2(t["t"+sf])} · ${f2(t["dz"+sf])}`))(met === "var" ? "Var" : "Mean") : "") +
        (r && !isNaN(r.rho) ? trow(`ρ with ${MK[S.y].short}`, `${f2(r.rho)} <span class="m">n = ${r.n}</span>`) : "");
    }).join("");
  }
  // el título no se ve en la vista (su ⓘ va en la cabecera, igual que la leyenda de p y FDR): lo usa el reporte
  function header(sp){
    const k = d3.select("#k-topo"); k.selectAll("*").remove();
    const meanD = (T, met) => d3.mean(ELEC.filter(e => T[e]).map(e => met === "var" ? T[e].dVar : T[e].dMean));
    const up = (T, met) => ELEC.filter(e => T[e] && (met === "var" ? T[e].dVar : T[e].dMean) > 0).length;
    const base = ["σθ: SD of relative θ (4–8 / 1–40 Hz) across 4-s epochs; μθ: its mean. Δ = deprivation − normal. v4 interpolation (EEGLAB, FieldTrip)."];
    // conteos de p y q de un conjunto de mapas ya probado
    const cnt = (T, met) => ({p: ELEC.filter(e => T[e] && pOf(T[e], met) != null && pOf(T[e], met) < .05).length,
      q: ELEC.filter(e => T[e] && qOf(T[e], met) != null && qOf(T[e], met) < .05).length});
    const legend = () => marksKey(sp.rows);
    if(sp.mode === "pair" || sp.mode === "cmp"){
      const [r0, r1] = sp.rows, m0 = meanD(r0.T, S.met), m1 = meanD(r1.T, S.met);
      const n0 = sp.mode === "pair" ? sp.names[0] : sp.G[0].name, n1 = sp.mode === "pair" ? sp.names[1] : sp.G[1].name;
      const test = sp.mode === "pair" ? "No per-electrode test for single people."
        : sp.circular ? "No per-electrode test: these groups are defined by Δθ itself, so testing their Δθ would be circular."
        : `Paired t-test per electrode within each group, FDR per group. Ring: p &lt; 0.05; dot: q &lt; 0.05 (${n0}: ${cnt(r0.T, S.met).p} and ${cnt(r0.T, S.met).q}; ${n1}: ${cnt(r1.T, S.met).p} and ${cnt(r1.T, S.met).q}). Marks show where each group changes, not where the groups differ.`;
      setTitle("t-topo", `θ topomaps: ${sp.mode === "pair" ? "two people" : "two groups"}`,
        `mean Δ${METN[S.met]}: ${n0} ${fsr(m0)}, ${n1} ${fsr(m1)}`, notes(...base, "Both rows share the same scales.", test, sp.mode === "cmp" && !sp.circular ? marksNote(sp.rows) : ""));
      if(sp.mode === "cmp" && !sp.circular) legend();
      return;
    }
    if(sp.mode === "group"){
      setTitle("t-topo", sp.n === 1 && S.selected ? `θ topomaps: ${S.selected[0]}` : "θ topomaps: your selection", nb(`n = ${sp.n}`),
        notes(...base, `Δσθ &gt; 0 at ${up(sp.rows[0].T, "var")} of 61 electrodes.`,
          "No per-electrode test: a selection is usually picked by its Δθ, so the test would be circular."));
      return;
    }
    const v = sigCount("var"), m = sigCount("mean");
    // una cifra por métrica: sumarlas daba «113 of 61» cuando las dos tienen electrodos significativos
    setTitle("t-topo", `θ maps · q &lt; 0.05: σθ ${v.q}, μθ ${m.q} of 61 electrodes`, "",
      notes(...base, `Paired t-test per electrode (n = 68): p &lt; 0.05 at σθ ${v.p} and μθ ${m.p} electrodes; FDR q &lt; 0.05 at ${v.q} and ${m.q}.`, marksNote(sp.rows)));
    // las marcas solo se dibujan sobre los mapas Δ: una capa a la vez, elegida en la leyenda
    marksKey(sp.rows);
  }
  // ---------------------------------------------------------------- marcas: cluster, FDR, p o ninguna
  // Prueba por clusters de una fila (sus personas, su métrica, la ventana actual); se guarda por banda, métrica,
  // personas y ventana. Durante la reproducción usa 200 permutaciones (p con menos resolución) para no frenarla.
  const clCache = new Map();
  function clustersFor(row){
    if(!row.test || !row.ids || row.ids.length < 3) return null;
    const perms = frame && lock ? 200 : CLUSTER.perms;
    const key = [S.band, row.met, frame ? frame.join("-") : "all", perms, row.ids.join(",")].join("|");
    if(!clCache.has(key)){ if(clCache.size > 300) clCache.clear(); clCache.set(key, clusterTest(deltaMatrix(row.ids, row.met, frame), elecAdjacency(), {perms})); }
    return toMarks(clCache.get(key), ELEC.length, 0);
  }
  // electrodos de los clusters significativos (p < 0.05) de un bloque: {e: signo}, más los clusters para la leyenda
  function toMarks(res, m, block){
    if(!res) return null;
    const sig = res.clusters.filter(c => c.p < CLUSTER.alpha), at = {};
    sig.forEach(c => c.nodes.forEach(k => { if(Math.floor(k/m) === block) at[ELEC[k % m]] = c.sign; }));
    return {at, clusters:res.clusters, sig, perms:res.perms, n:res.n};
  }
  const MARKS = [["fdr", "FDR"], ["cluster", "Cluster channels"], ["p", "p < 0.05"], ["none", "None"]];
  // la leyenda de la vista es el selector de marcas; debajo, la lectura de la marca elegida
  function marksKey(rows, series){
    const k = d3.select("#k-topo"); k.selectAll("*").remove();
    if(!S.showD) return;
    const seg = k.append("span").attr("class", "mk-seg").attr("role", "group").attr("aria-label", "Marks on the Δ maps");
    seg.selectAll("button").data(MARKS).join("button").attr("type", "button").attr("aria-pressed", d => d[0] === S.marks).text(d => d[1])
      .attr("title", d => ({cluster:"Channels inside the clusters of the cluster-based permutation test (descriptive: the test says the maps differ, not where; Sassenhagen and Draschkow, 2019)",
        fdr:"Electrodes that survive Benjamini–Hochberg FDR across the 61 electrodes (supports per-electrode statements)", p:"Electrodes with p < 0.05 before any correction (exploratory: about 3 of 61 reach it by chance)",
        none:"Only the color map"})[d[0]])
      .on("click", (ev, d) => { S.marks = d[0]; try{ localStorage.setItem("batimix-marks", d[0]); }catch(e){} render(); });
    if(S.marks === "fdr") k.append("span").attr("class", "k").html(`<i class="ring"></i>FDR q &lt; 0.05`);
    else if(S.marks === "cluster") k.append("span").attr("class", "k").html(`<i class="ring"></i>in a cluster`);
    else if(S.marks === "p") k.append("span").attr("class", "k").html(`<i class="bdot"></i>uncorrected`);
    // resultado global de la prueba de clusters, con cualquier marca: dice si los mapas difieren entre noches
    const tested = (rows || []).filter(r => r.cl);
    if(tested.length){
      const best = tested.map(r => r.cl.clusters.length ? d3.min(r.cl.clusters, c => c.p) : 1), worst = d3.max(best);
      k.append("span").attr("class", "k cl-test").attr("title", "Cluster-based permutation test (Maris and Oostenveld, 2007): whether the Δ maps differ from zero anywhere; see ⓘ")
        .text(worst < CLUSTER.alpha ? `cluster test ${(v => v.startsWith("<") ? `p ${v}` : `p ${tested.length > 1 ? "≤ " : ""}${v}`)(fp(worst))}` : `cluster test n.s.`);
    }
  }
  // nota de la ⓘ sobre la marca elegida
  function marksNote(rows){
    const tested = (rows || []).filter(r => r.cl);
    const res = tested.map(r => { const c = r.cl.clusters[0]; return `${r.label.replace(/ \(\d+\)$/, "")}: ${c && c.p < CLUSTER.alpha ? `p ${fp(c.p)}, largest cluster ${c.nodes.length} electrodes` : "no cluster with p &lt; 0.05"}`; }).join("; ");
    const glob = tested.length ? `Cluster-based permutation test (Maris and Oostenveld, 2007; neighbors by Delaunay, ${CLUSTER.perms} sign-flip permutations, checked against MNE): ${res}. It shows that the Δ map differs from zero; it does not establish where (Sassenhagen and Draschkow, 2019): the color shows where the change is largest.` : "";
    const mk = {cluster:"Marks: channels inside the clusters (descriptive, not a per-electrode test).",
      fdr:"Marks: rings at the electrodes that survive Benjamini–Hochberg FDR across the 61 electrodes (q &lt; 0.05), as in Cui et al. (2026) on this dataset.",
      p:"Marks: small dots at electrodes with p &lt; 0.05 before correction. Exploratory: with 61 tests about 3 reach it by chance.",
      none:"Marks hidden: only the color map."}[S.marks];
    return [mk, glob].filter(Boolean).join(" ");
  }

  // rótulo de estado al pie de la vista, con un enlace para volver a los cinco minutos completos
  function status(svg, W, H, txt){
    const t = svg.append("text").attr("class", "tstatus").attr("x", W/2).attr("y", H-5).attr("text-anchor", "middle");
    t.append("tspan").text(txt + " · ");
    t.append("tspan").attr("class", "tlink").attr("role", "button").attr("tabindex", 0).text("Back to the full recording")
      .on("click", () => backToFull()).on("keydown", ev => { if(ev.key === "Enter" || ev.key === " "){ ev.preventDefault(); backToFull(); } });
  }
  // ⓘ de una ventana elegida en la Vista de tiempo
  function frameHeader(sp){
    const k = d3.select("#k-topo"); k.selectAll("*").remove();
    const n = frame[1]-frame[0]+1, tested = sp.rows.some(r => ELEC.some(e => r.T[e] && pOf(r.T[e], r.met) != null));
    setTitle("t-topo", `θ maps · window ${winTxt(frame)}`, nb(`${n} epochs`),
      notes(`Only the ${n} epochs (${n*4} s) of this window: μθ is their mean and σθ their SD. This window σθ is a different and noisier measure than the five-minute σθ, which also contains the slow drift across the recording.`,
        tested ? `Paired t-test per electrode within this window, FDR across the 61 electrodes of this window only. Exploratory: not corrected across windows, and a window chosen after looking at the data favours large effects. For a corrected view across time, use Series.`
          : "No per-electrode test here (selection, two people or groups defined by Δθ).",
        "Click another moment in the Time View to move the window; Back to the full recording (or Clear) returns to the five minutes.", tested ? marksNote(sp.rows) : ""));
    if(tested) marksKey(sp.rows);
  }
  // ---------------------------------------------------------------- serie completa (botón «Series»)
  // Bloques consecutivos sin solapamiento (seriesBlocks: 5 × 60 s o 3 × 100 s), solo mapas Δ, alineados con el eje
  // de la Vista de tiempo que queda debajo: el mapa de 60–120 s está sobre los segundos 60–120 de la curva.
  // Filas: Δσθ y Δμθ del grupo activo; con comparación, un grupo por fila (métrica del header); con dos personas, una
  // persona por fila. Una escala de color por fila (la misma en todos sus bloques; compartida entre filas cuando
  // son grupos o personas con la misma métrica).
  // Prueba: t pareada por electrodo y bloque con las mismas reglas que el resto (los 68 o grupos no circulares,
  // n ≥ 3) y FDR de Benjamini y Hochberg sobre todos los bloques × electrodos de la fila (5 × 61 = 305 pruebas):
  // más estricta que la de un solo mapa, así que es esperable ver menos marcas que en el mapa de cinco minutos.
  function seriesSpec(){
    const sel2 = S.selected && S.selected.length === 2 ? S.selected : null;
    const [a, b] = S.pair.length === 2 ? S.pair.map(d => d.id) : (sel2 || []);
    if(a && b && ELEP.persons[a] && ELEP.persons[b]){
      const lab = S.pair.length === 2 ? ["A · ", "B · "] : ["", ""];
      return {mode:"pair", rows:[a, b].map((id, i) => ({label:lab[i]+id, met:S.met, ids:[id], test:false}))};
    }
    const G = viewGroups();
    if(G) return {mode:"cmp", circular:G[0].circular, rows:G.map(gr => ({label:gr.name, color:gr.color, met:S.met, ids:gr.ids.filter(id => ELEP.persons[id]), test:!gr.circular}))};
    const ids = (S.selected || EEG_IDS).filter(id => ELEP.persons[id]);
    return {mode:S.selected ? "group" : "all", rows:[{label:"Δσθ", met:"var", ids, test:!S.selected}, {label:"Δμθ", met:"mean", ids, test:!S.selected}]};
  }
  function renderSeries(W, H){
    const sp = seriesSpec(), blocks = seriesBlocks(), nBlk = blocks.length, len = seriesLen();
    // celdas: mapa de cada bloque, con su FDR recalculado sobre todos los bloques de la fila
    sp.rows.forEach(row => {
      const test = row.test && row.ids.length >= 3, P = row.met === "var" ? "sigVar" : "sigMean", Q = row.met === "var" ? "qVar" : "qMean";
      const raw = blocks.map(w => winTopo(row.ids, w, test));
      const all = []; raw.forEach((T, k) => ELEC.forEach(e => { if(T[e] && T[e][P] != null) all.push([k, e, T[e][P]]); }));
      const q = bh(all.map(d => d[2])), qOf2 = new Map(all.map((d, i) => [d[0]+"|"+d[1], q[i]]));
      row.cells = raw.map((T, k) => { const out = {}; for(const e in T) out[e] = {...T[e], [Q]:test ? qOf2.get(k+"|"+e) : null}; return out; });
      row.tested = test;
      // clusters sobre electrodos × bloques: vecinos en la cabeza y el mismo electrodo en bloques contiguos
      if(test){
        const key = ["series", S.band, row.met, blocks.length, row.ids.join(",")].join("|");
        if(!clCache.has(key)){
          const parts = blocks.map(w => deltaMatrix(row.ids, row.met, w));
          clCache.set(key, clusterTest(row.ids.map((id, i) => parts.flatMap(P => P[i])), stAdjacency(blocks.length)));
        }
        const res = clCache.get(key);
        row.clBlocks = blocks.map((w, k) => toMarks(res, ELEC.length, k)); row.cl = row.clBlocks[0];
      }
    });
    const divOf = rows => d3.max(rows.flatMap(r => r.cells.flatMap(T => ELEC.map(e => T[e] ? Math.abs(val(T[e], "D", r.met)) : 0)))) || 1;
    const sharedDiv = sp.mode === "pair" || sp.mode === "cmp" ? divOf(sp.rows) : null;
    // alineación con el eje de la Vista de tiempo (si no está, se usa todo el ancho con el mismo margen)
    const px = dyn.plotX ? dyn.plotX() : null, er = el.getBoundingClientRect(), kk = W/(er.width || W);
    const x0 = px ? (px.left-er.left)*kk : 58, x1 = px ? (px.right-er.left)*kk : W-18, tx = t => x0+(x1-x0)*t/300;
    const nR = sp.rows.length, topH = 20, botH = 40, rowGap = 8;
    const bw = tx(len*4)-tx(0), s = Math.floor(Math.max(40, Math.min(bw-6, (H-topH-botH-(nR-1)*rowGap)/nR, 170)));
    const y0 = Math.max(0, (H-botH-topH-nR*s-(nR-1)*rowGap)/2);
    const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("height", H).style("height", H+"px")
      .attr("role", "img").attr("aria-label", `Series of Δ topomaps: ${nBlk} blocks of ${len*4} s; rows ${sp.rows.map(r => r.label).join(" and ")}`);
    const defs = svg.append("defs");
    MAPS = []; curSpec = {mode:sp.mode, rows:[]};
    blocks.forEach(([a, b], k) => svg.append("text").attr("class", "colhead").attr("x", tx((a+b+1)*2)).attr("y", y0+14).text(`${a*4}–${(b+1)*4} s`));
    const tipCell = k => e => `<div class="h">${e} <span class="m">${blocks[k][0]*4}–${(blocks[k][1]+1)*4} s</span></div>` + sp.rows.map(r => {
      const t = r.cells[k][e]; if(!t) return ""; const pv = pOf(t, r.met);
      return trow(r.label.startsWith("Δ") ? r.label : `${r.label}, Δ${METN[r.met]}`, `${fsr(val(t, "D", r.met))}${pv != null ? ` <span class="m">p ${fp(pv)}, q ${fp(qOf(t, r.met))}</span>` : ""}`, r.color);
    }).join("");
    const legends = [];
    sp.rows.forEach((row, ri) => {
      const y = y0+topH+ri*(s+rowGap), div = sharedDiv || divOf([row]), divF = v => C.div((v+div)/(2*div));
      svg.append("text").attr("class", "rowhead").attr("transform", `translate(${Math.max(10, x0-14)},${y+s/2}) rotate(-90)`).style("fill", row.color || null).text(row.label);
      blocks.forEach(([a, b], k) => {
        const cx = tx((a+b+1)*2), cell = svg.append("g").attr("class", "scell").style("cursor", "pointer")
          .on("pointerenter", () => dyn.hiBlock && dyn.hiBlock(k)).on("pointerleave", () => dyn.hiBlock && dyn.hiBlock(null));
        // clic en el fondo de un bloque: ver ese bloque como ventana (sale de la serie); clic en un electrodo: elegirlo
        cell.append("rect").attr("x", cx-s/2).attr("y", y).attr("width", s).attr("height", s).attr("fill", "transparent")
          .on("click", () => setWin([a, b]));
        cell.append("title").text(`${a*4}–${(b+1)*4} s · click to open this block as a window`);
        drawMap(cell, defs, `s${ri}_${k}`, cx-s/2, y, s, {T:row.cells[k], met:row.met, cl:row.clBlocks ? row.clBlocks[k] : null}, "D", divF, divF, sp.mode === "pair" ? "pair" : "series", tipCell(k));
      });
      if(!sharedDiv || ri === 0) legends.push({lab:sharedDiv ? `Δ${METN[S.met]}` : row.label, div});
    });
    // leyendas de color horizontales al pie (no hay margen a la derecha: el eje del tiempo llega al borde)
    const ly = H-botH+6;
    legends.forEach((lg, i) => {
      const lx = x0+i*190, gid = `sg${i}`, grad = defs.append("linearGradient").attr("id", gid);
      d3.range(0, 1.001, .1).forEach(t => grad.append("stop").attr("offset", t).attr("stop-color", C.div(t)));
      svg.append("text").attr("class", "mdim").attr("x", lx).attr("y", ly+8).text(lg.lab);
      svg.append("rect").attr("x", lx+34).attr("y", ly).attr("width", 90).attr("height", 8).attr("rx", 3).attr("fill", `url(#${gid})`);
      svg.append("text").attr("class", "mdim").attr("x", lx+130).attr("y", ly+8).text(`±${L.format(".2~r")(lg.div)}`);
    });
    linkG = svg.append("g").style("pointer-events", "none"); drawLink(null);
    const tested = sp.rows.some(r => r.tested);
    const how = {cluster:" · cluster test over electrodes × blocks", fdr:" · FDR across blocks × electrodes", p:" · p < 0.05 uncorrected", none:""}[S.marks];
    status(svg, W, H, `Series · ${nBlk} blocks of ${len*4} s${tested ? how : ""}`);
    seriesHeader(sp, nBlk, len, tested);
  }
  function seriesHeader(sp, nBlk, len, tested){
    const k = d3.select("#k-topo"); k.selectAll("*").remove();
    const cnt = row => { let p = 0, q = 0; row.cells.forEach(T => ELEC.forEach(e => { const t = T[e]; if(t && pOf(t, row.met) != null){ if(pOf(t, row.met) < .05) p++; if(qOf(t, row.met) < .05) q++; } })); return {p, q}; };
    const counts = sp.rows.filter(r => r.tested).map(r => { const c = cnt(r); return `${r.label}: ${c.p} with p &lt; 0.05, ${c.q} with q &lt; 0.05`; }).join("; ");
    setTitle("t-topo", `θ series · ${nBlk} blocks of ${len*4} s`, sp.mode === "pair" ? "" : nb(`n = ${sp.rows[0].ids.length}`),
      notes(`Δ maps (deprivation − normal) in ${nBlk} consecutive, non-overlapping blocks of ${len*4} s, aligned with the Time View below. Hover a map to highlight its block; click it to open that block as a window.`,
        "σθ of a block is the SD within that block only (fast fluctuations). The five-minute σθ also includes the slow drift between blocks (for example, growing drowsiness), so comparing the two tells which part the deprivation effect comes from.",
        tested ? `Paired t-test per electrode and block, Benjamini–Hochberg FDR across all ${nBlk} × 61 tests of each row (stricter than one map, so fewer marks than in the five-minute map are expected). ${counts}.` : "No per-electrode test (selection, two people or groups defined by Δθ).",
        tested ? "Cluster test over electrodes × blocks: neighbors are adjacent electrodes in the same block and the same electrode in consecutive blocks. " + marksNote(sp.rows) : "",
        "Limits: five minutes with eyes open and no vigilance marker, so a drift over time can be drowsiness, fatigue or time on task."));
    if(tested) marksKey(sp.rows, true);
  }
  bus.on("select.topo", e => { if(!(e && e.live)) render(); });
  bus.on("pin.topo", () => render());
  // mapa suelto para las vistas secundarias: mismo método de interpolación que la matriz
  function mini(values, color){ const T = {}; for(const e in values) if(values[e] != null) T[e] = {dMean:values[e]}; return field(T, "D", "mean", color); }
  // reproducción: se prueban todas las ventanas una vez para fijar las escalas, y luego se avanza ventana a ventana
  function startFrames(){
    if(!ELEP) return false;
    const L = S.winLen; lock = {}; frame = [0, L-1];
    const upd = (met, d) => { const l = lock[met] || (lock[met] = {seq:[Infinity, -Infinity], div:0});
      l.seq = [Math.min(l.seq[0], d.seq[0]), Math.max(l.seq[1], d.seq[1])]; l.div = Math.max(l.div, d.div); };
    const sc0 = scalesFor();
    for(let a = 0; a <= 75-L; a += 3){ frame = [a, a+L-1]; const sp = spec(); sp.rows.forEach(r => upd(r.met, scalesFor(sp.rows)([r]))); }
    frame = [0, L-1]; render(); return true;
  }
  // ventana cualquiera [época, época]: la de la reproducción o un intervalo elegido sobre la serie; null = estado normal
  const setFrame = w => { if(!w){ endFrames(); return; } if(!frame || frame[0] !== w[0] || frame[1] !== w[1]){ frame = w; render(); } };
  function endFrames(){ if(!frame) return; frame = null; lock = null; render(); }
  return {render, rebuild(){}, stats, mini, startFrames, setFrame, endFrames, framing:() => !!frame, winT:(ids, w) => ELEP ? winTopo(ids.filter(id => ELEP.persons[id]), w) : {}, winOne:(id, w) => ELEP && ELEP.persons[id] ? winTopo([id], w) : null};
})();
