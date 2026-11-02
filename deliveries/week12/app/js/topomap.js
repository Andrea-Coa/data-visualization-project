/* Vista 1 · Matriz de topomapas 2 × 3 (tareas T1, T2 y T4).
   Columnas: NS, SD y Δ (SD menos NS). Filas: σθ y μθ del grupo activo (las 68 personas o el grupo elegido).
   Con dos personas elegidas en la dispersión (A y B), las filas pasan a ser A y B con la métrica del header.
   Escalas: NS y SD comparten una secuencial por fila; Δ usa una divergente con cero oscuro. En el modo A y B
   ambas filas comparten las mismas escalas para que la comparación sea honesta.
   Marcas de significancia (t pareada, FDR) solo en Δ de las 68 personas: con subgrupos no hay prueba por electrodo. */
const topo = (() => {
  const el = $("topo"), GN = 96;
  let MAPS = [], linkG = null, curSpec = null;   // posiciones de los 6 mapas para enlazar un mismo electrodo en todos
  const cnv = document.createElement("canvas"); cnv.width = GN; cnv.height = GN; const ctx = cnv.getContext("2d");
  const val = (t, cond, met) => cond === "D" ? (met === "var" ? t.dVar : t.dMean) : (t[cond] ? t[cond][met] : null);

  // promedio por electrodo del grupo activo; sin grupo, el agregado de los 68 con sus pruebas
  // promedio por electrodo de un conjunto de personas (o el agregado de los 68, con sus pruebas)
  function groupTopo(sel){
    if(!sel) return {T:TOPO, mode:"all"};
    const ids = sel.filter(id => SUBTOPO[id]);
    if(!ids.length) return {T:TOPO, mode:"all"};
    const out = {};
    ELEC.forEach(e => {
      const nm = [], nv = [], sm = [], sv = [];
      ids.forEach(id => { const t = SUBTOPO[id][e]; if(t){ nm.push(t.NS.mean); nv.push(t.NS.var); sm.push(t.SD.mean); sv.push(t.SD.var); } });
      if(!nm.length) return;
      const NS = {mean:d3.mean(nm), var:d3.mean(nv)}, SD = {mean:d3.mean(sm), var:d3.mean(sv)};
      out[e] = {NS, SD, dMean:SD.mean-NS.mean, dVar:SD.var-NS.var, nPaired:nm.length};
    });
    return {T:out, mode:"group", n:ids.length};
  }
  function spec(){
    // dos personas lado a lado: las fijadas con Mayús + clic (A y B) o una selección de exactamente dos;
    // con tres o más, el promedio del grupo
    const sel2 = S.selected && S.selected.length === 2 ? S.selected : null;
    const [a, b] = S.pair.length === 2 ? S.pair.map(d => d.id) : (sel2 || []);
    if(a && b && SUBTOPO[a] && SUBTOPO[b]){
      const lab = S.pair.length === 2 ? ["A · ", "B · "] : ["", ""];
      return {mode:"pair", names:[lab[0]+a, lab[1]+b], rows:[{label:lab[0]+a, met:S.met, T:SUBTOPO[a]}, {label:lab[1]+b, met:S.met, T:SUBTOPO[b]}]};
    }
    const G = cmpGroups();
    if(G){
      const ts = G.map(gr => groupTopo(gr.ids));
      return {mode:"cmp", G, rows:G.map((gr, i) => ({label:`${gr.name} (${ts[i].n || gr.ids.length})`, met:S.met, T:ts[i].T, color:gr.color}))};
    }
    const g = groupTopo(S.selected);
    return {mode:g.mode, n:g.n, rows:[{label:"σθ", met:"var", T:g.T}, {label:"μθ", met:"mean", T:g.T}]};
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
  let METHOD = (q => METHODS[q] ? q : DEFAULT_METHOD)(new URLSearchParams(location.search).get("interp"));
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
    const sp = spec(), sc = scalesFor(sp.rows);
    // con el interruptor Δ apagado solo se dibujan NS y SD, con su barra de color
    const conds = S.showD ? ["NS", "SD", "D"] : ["NS", "SD"], nC = conds.length, nB = nC-1;
    // en pantallas angostas las barras se achican y la unidad pasa al ícono ⓘ del panel (no cabe girada)
    const narrow = W < 560, labW = 22, barW = narrow ? 50 : 66, topH = 22, rowGap = 10;
    const s = Math.floor(Math.max(80, Math.min((W-labW-nB*barW-8)/nC, (H-topH-rowGap-4)/2)));
    const usedW = labW+nC*s+nB*barW, x0 = Math.max(0, (W-usedW)/2), y0 = Math.max(0, (H-(topH+2*s+rowGap))/2);
    const X = {lab:x0, NS:x0+labW, SD:x0+labW+s, bar1:x0+labW+2*s+6, D:x0+labW+2*s+barW, bar2:x0+labW+3*s+barW+6};
    const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("height", H).style("height", H+"px")
      .attr("role", "img").attr("aria-label", `Topomap matrix: columns ${S.showD ? "NS, SD and Δ" : "NS and SD"}; rows ${sp.rows.map(r => r.label).join(" and ")}`);
    const defs = svg.append("defs");
    [["NS", "NS", ""], ["SD", "SD", ""], ["D", "Δ", " SD − NS"]].filter(([k]) => conds.includes(k)).forEach(([k, a, b]) => {
      const t = svg.append("text").attr("class", "colhead").attr("x", X[k]+s/2).attr("y", y0+14);
      t.append("tspan").text(a); t.append("tspan").attr("class", "m").text(b);
    });
    const shared = sp.mode === "pair" || sp.mode === "cmp" ? sc(sp.rows) : null;
    MAPS = []; curSpec = sp;
    sp.rows.forEach((row, ri) => {
      const y = y0+topH+ri*(s+rowGap), dom = shared || sc([row]);
      const seqF = v => C.seq((v-dom.seq[0])/((dom.seq[1]-dom.seq[0]) || 1)), divF = v => C.div((v+dom.div)/(2*dom.div));
      svg.append("text").attr("class", "rowhead").attr("transform", `translate(${X.lab+labW/2+2},${y+s/2})${row.label.length > 3 ? " rotate(-90)" : ""}`).style("fill", row.color || null).text(row.label);
      conds.forEach(cond => drawMap(svg, defs, `${ri}${cond}`, X[cond], y, s, row, cond, cond === "D" ? divF : seqF, cond === "D" ? divF : seqF, sp.mode));
      bar(svg, defs, `s${ri}`, X.bar1, y, s, dom.seq, C.seq, false, narrow ? null : UNIT[row.met]);
      if(S.showD) bar(svg, defs, `d${ri}`, X.bar2, y, s, [-dom.div, dom.div], C.div, true, narrow ? null : "Δ " + UNIT[row.met]);
    });
    // capa de enlace: anillo del electrodo bajo el cursor (blanco) y del electrodo que manda en la dispersión (ámbar)
    linkG = svg.append("g").style("pointer-events", "none");
    drawLink(null);
    header(sp);
  }
  function drawMap(svg, defs, id, x, y, s, row, cond, color, _c, mode){
    const R = s/2-10, cx = x+s/2, cy = y+s/2+3, cid = `tc${id}`;
    MAPS.push({cx, cy, R});
    defs.append("clipPath").attr("id", cid).append("circle").attr("cx", cx).attr("cy", cy).attr("r", R);
    const f = field(row.T, cond, row.met, color);
    const g = svg.append("g");
    g.append("image").attr("x", cx-R).attr("y", cy-R).attr("width", 2*R).attr("height", 2*R).attr("preserveAspectRatio", "none").attr("clip-path", `url(#${cid})`).attr("href", f.href);
    const proj = d3.geoTransform({point(px, py){ this.stream.point(cx-R+px*2*R/GN, cy-R+py*2*R/GN); }});
    const dom = d3.extent(f.grid);
    g.append("g").attr("clip-path", `url(#${cid})`).selectAll("path").data(d3.contours().size([GN, GN]).thresholds(d3.ticks(dom[0], dom[1], 7))(Array.from(f.grid)))
      .join("path").attr("class", "contour").attr("d", d3.geoPath(proj));
    g.append("circle").attr("class", "head").attr("cx", cx).attr("cy", cy).attr("r", R);
    g.append("path").attr("class", "head").attr("d", `M ${cx-7} ${cy-R+1.5} L ${cx} ${cy-R-8} L ${cx+7} ${cy-R+1.5}`).attr("stroke-linejoin", "round");
    g.append("path").attr("class", "head").attr("d", `M ${cx-R} ${cy-10} C ${cx-R-7} ${cy-9} ${cx-R-7} ${cy+9} ${cx-R} ${cy+10}`);
    g.append("path").attr("class", "head").attr("d", `M ${cx+R} ${cy-10} C ${cx+R+7} ${cy-9} ${cx+R+7} ${cy+9} ${cx+R} ${cy+10}`);
    const marks = cond === "D" && mode === "all";
    const pts = ELEC.filter(e => row.T[e]).map(e => ({e, t:row.T[e], px:cx+COORDS[e][0]*R, py:cy-COORDS[e][1]*R}));
    g.append("g").selectAll("circle").data(pts).join("circle").attr("cx", d => d.px).attr("cy", d => d.py)
      .attr("r", d => marks && pOf(d.t, row.met) < .05 ? 4 : 1.1)
      .attr("fill", d => marks && qOf(d.t, row.met) < .05 ? C.ink : (marks && pOf(d.t, row.met) < .05 ? "none" : C.edot))
      .attr("stroke", d => marks && pOf(d.t, row.met) < .05 ? C.ink : "none").attr("stroke-width", 1.5).style("pointer-events", "none");
    g.append("g").selectAll("circle").data(pts).join("circle").attr("class", "ehit").attr("cx", d => d.px).attr("cy", d => d.py).attr("r", Math.max(5, R*.09))
      .on("pointerenter", (e, d) => { drawLink(d.e); showTip(e, tipFor(d.e)); }).on("pointermove", e => moveTip(e))
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
    const at = (m, k) => ({x:m.cx+COORDS[k][0]*m.R, y:m.cy-COORDS[k][1]*m.R});
    const rings = [];
    if(S.elec && COORDS[S.elec]) MAPS.forEach(m => rings.push({...at(m, S.elec), c:C.vuln, w:2}));
    if(e && e !== S.elec) MAPS.forEach(m => rings.push({...at(m, e), c:C.ink, w:1.6}));
    linkG.selectAll("circle").data(rings).join("circle").attr("cx", d => d.x).attr("cy", d => d.y).attr("r", 6).attr("fill", "none").attr("stroke", d => d.c).attr("stroke-width", d => d.w);
  }
  // tooltip: las dos filas del electrodo (NS, SD, Δ) y su relación con el marcador del eje Y
  function tipFor(e){
    const sp = curSpec, all68 = sp.mode === "all";
    return `<div class="h">${e}</div>` + sp.rows.map(row => {
      const t = row.T[e]; if(!t) return "";
      const met = row.met, dv = met === "var" ? t.dVar : t.dMean, r = sp.mode === "pair" ? null : elecRho(e, met);
      return `<div class="m" style="margin-top:4px">${row.label}</div>` + trow("NS · SD", `${fr(t.NS[met])} · ${fr(t.SD[met])}`) +
        trow("Δ SD − NS", `${fsr(dv)}${all68 ? ` <span class="m">p ${fp(pOf(t, met))}, q ${fp(qOf(t, met))}</span>` : ""}`) +
        // tamaño de efecto de la prueba t pareada (solo con las 68 personas, donde hay prueba por electrodo)
        (all68 && t.tVar != null ? (sf => trow("95% CI of Δ", `[${fsr(t["ci"+sf][0])}, ${fsr(t["ci"+sf][1])}]`) +
          trow(`t(${t.nPaired-1}) · d<sub>z</sub>`, `${f2(t["t"+sf])} · ${f2(t["dz"+sf])}`))(met === "var" ? "Var" : "Mean") : "") +
        (r && !isNaN(r.rho) ? trow(`ρ with ${MK[S.y].short}`, `${f2(r.rho)} <span class="m">n = ${r.n}</span>`) : "");
    }).join("");
  }
  function header(sp){
    const k = d3.select("#k-topo"); k.selectAll("*").remove();
    const meanD = (T, met) => d3.mean(ELEC.filter(e => T[e]).map(e => met === "var" ? T[e].dVar : T[e].dMean));
    const up = (T, met) => ELEC.filter(e => T[e] && (met === "var" ? T[e].dVar : T[e].dMean) > 0).length;
    const base = ["NS: normal sleep; SD: after 24–30 h without sleep; Δ = SD − NS. σθ: variability of relative theta power across 75 4-s epochs; μθ: its mean.",
      (METHODS[stats.method] || "") + " NS and SD share a sequential scale per row; Δ uses a diverging scale centered at 0."];
    if(sp.mode === "pair" || sp.mode === "cmp"){
      const [r0, r1] = sp.rows, m0 = meanD(r0.T, S.met), m1 = meanD(r1.T, S.met);
      const n0 = sp.mode === "pair" ? sp.names[0] : sp.G[0].name, n1 = sp.mode === "pair" ? sp.names[1] : sp.G[1].name;
      setTitle("t-topo", `θ topomaps: ${sp.mode === "pair" ? "two people" : "two groups"}`,
        `mean Δ${METN[S.met]}: ${n0} ${fsr(m0)}, ${n1} ${fsr(m1)}`, notes(...base, "Both rows share the same scales. No per-electrode test."));
      return;
    }
    if(sp.mode === "group"){
      setTitle("t-topo", sp.n === 1 && S.selected ? `θ topomaps: ${S.selected[0]}` : "θ topomaps: your selection", nb(`n = ${sp.n}`),
        notes(...base, `Δσθ &gt; 0 at ${up(sp.rows[0].T, "var")} of 61 electrodes. No per-electrode test in subgroups.`));
      return;
    }
    const v = sigCount("var"), m = sigCount("mean");
    setTitle("t-topo", S.showD ? "θ topomaps: NS, SD and Δ" : "θ topomaps: NS and SD", `${v.q + m.q} of 61 electrodes with q &lt; 0.05`,
      notes(...base, `Paired t-test per electrode, n = 68. Ring: uncorrected p &lt; 0.05 (σθ ${v.p}, μθ ${m.p}); filled dot: q &lt; 0.05 after Benjamini–Hochberg FDR (σθ ${v.q}, μθ ${m.q}).`));
    // las marcas de p y FDR solo se dibujan sobre los mapas Δ
    if(S.showD) k.html(`<span class="k"><i class="ring"></i>p &lt; 0.05</span><span class="k"><i class="dot" style="background:var(--ink)"></i>FDR</span>`);
  }
  bus.on("select.topo", e => { if(!(e && e.live)) render(); });
  // selector del método de interpolación (para comparar con EEGLAB, FieldTrip y MNE); queda en la URL como ?interp=
  const isel = document.getElementById("interpsel");
  if(isel){
    isel.value = METHOD;
    isel.addEventListener("change", () => {
      METHOD = METHODS[isel.value] ? isel.value : DEFAULT_METHOD;
      try { const u = new URL(location.href); if(METHOD === DEFAULT_METHOD) u.searchParams.delete("interp"); else u.searchParams.set("interp", METHOD); history.replaceState(null, "", u); } catch(e){}
      render();
    });
  }
  bus.on("pin.topo", () => render());
  // mapa suelto para las vistas secundarias: mismo método de interpolación que la matriz
  function mini(values, color){ const T = {}; for(const e in values) if(values[e] != null) T[e] = {dMean:values[e]}; return field(T, "D", "mean", color); }
  return {render, rebuild(){}, stats, mini};
})();
