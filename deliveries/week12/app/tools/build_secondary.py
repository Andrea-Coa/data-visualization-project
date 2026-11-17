"""Genera los datos de las vistas secundarias desde el EEG crudo: data/aperiodic.json y data/connectivity.json.

Ambos parten del pipeline principal de la app (tools/eeg_ica.py): notebook 02 (notch 50 Hz, 1–40 Hz, canales
malos por log-varianza e interpolación), FCz reinsertado y referencia promedio, ICA (componentes oculares y
musculares fuera), 75 épocas de 4 s con rechazo > 200 µV; solo ojos abiertos. Usa las ICA en caché de build_eeg_ica.py.

aperiodic.json  (¿el efecto theta es oscilatorio o es el fondo 1/f?; Bai et al., 2024; Li, 2026; Monchy et al.)
  specparam (FOOOF 1.1) con los ajustes de Bai et al. (2024) sobre este mismo dataset: peak_width_limits 1–12,
  max_n_peaks 8, min_peak_height 0.1, peak_threshold 2, modo "fixed", 1–40 Hz; referencia promedio, como la app.
  - por electrodo (espectro promedio de las épocas, Welch 4 s, 0.25 Hz): exponente, offset, theta periódica
    (media en 4–8 Hz del espectro aplanado, log10) y si hay un pico en 4–8 Hz;
  - por época y región (Welch de 1 s con 50 % de solapamiento dentro de cada época, 1 Hz): θ relativa y θ
    periódica, para comparar Δσθ con Δσθ periódica (épocas con R² ≥ 0.8; al menos 50 por registro).
  - por banda (fase 3 de PLAN.md, opcional): lo mismo para delta [1, 4), alfa (8, 13) y beta [13, 30) con los bordes de
    eeg_ica.BANDS, en "bands" (theta sigue en las claves de siempre, con los mismos valores). Delta cae en el borde
    inferior del ajuste (1 Hz) y con Welch de 1 s solo tiene 3 frecuencias: es el menos fiable.
connectivity.json  (sincronía theta entre regiones)
  con FCz y referencia promedio; wPLI² debiased (Vinck et al., 2011), multitaper, 4–8 Hz; 10 regiones
  laterales (la línea media queda fuera); prueba t pareada por par con FDR y prueba conjunta por permutación.

Requisitos: ds004902 en <raíz>/ds004902 y Python con mne, mne-connectivity, fooof==1.1.0, scipy, statsmodels,
pandas, pymatreader. Tarda unos 5 minutos con 6 procesos.
Uso (desde deliveries/week12/app/):  python3 tools/build_secondary.py [--procs 6] [--cache carpeta]
"""
import argparse
import itertools
import json
import os
import sys
import tempfile
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import eeg_ica  # noqa: E402
REPO = HERE.parents[3]
NB = REPO / "deliveries" / "week06" / "code" / "02_eeg_pipeline.ipynb"
DATA = HERE.parent / "data"
FOOOF_SET = dict(peak_width_limits=(1, 12), max_n_peaks=8, min_peak_height=0.1, peak_threshold=2.0, aperiodic_mode="fixed", verbose=False)
REGIONS = {"F-L": "Fp1 AF3 AF7 F1 F3 F5 F7", "F-R": "Fp2 AF4 AF8 F2 F4 F6 F8", "C-L": "FC1 FC3 FC5 C1 C3 C5",
           "C-R": "FC2 FC4 FC6 C2 C4 C6", "T-L": "FT7 T7 TP7 TP9", "T-R": "FT8 T8 TP8 TP10",
           "P-L": "CP1 CP3 CP5 P1 P3 P5 P7", "P-R": "CP2 CP4 CP6 P2 P4 P6 P8", "O-L": "PO3 PO7 O1", "O-R": "PO4 PO8 O2"}
REGIONS = {k: v.split() for k, v in REGIONS.items()}
PAIRS = list(itertools.combinations(REGIONS, 2))
R2MIN, MIN_EPOCHS = 0.8, 50
# bandas del ajuste: theta primero (columnas 3 y 4, como antes); luego delta, alfa y beta (eeg_ica.BANDS)
BORD = [("theta", (4.0, 8.0, "[]"))] + [(b, eeg_ica.BANDS[b]) for b in ("delta", "alpha", "beta")]
NFIT = 3 + 2 * len(BORD)   # exponente, offset, R², y por banda: potencia periódica y si hay pico


def notebook_defs():
    cells = ["".join(c["source"]) for c in json.loads(NB.read_text(encoding="utf-8"))["cells"] if c["cell_type"] == "code"]
    ns = {"__name__": "nb02"}; cwd = os.getcwd(); os.chdir(NB.parent)   # el notebook calcula REPO_ROOT desde cwd
    try:
        for i in (0, 1, 2, 3):
            exec(cells[i], ns)
    finally:
        os.chdir(cwd)
    return eeg_ica.fix_sessions(ns)   # ses-1 = NS y ses-2 = SD (ver eeg_ica.session_to_condition)


def fit_many(freqs, spectra):
    import numpy as np
    from fooof import FOOOF
    res = np.full((len(spectra), NFIT), np.nan)   # exponente, offset, R², y por banda (BORD): periódica y pico
    for i, s in enumerate(spectra):
        fm = FOOOF(**FOOOF_SET)
        try:
            fm.fit(freqs, s, [1, 40])
        except Exception:
            continue
        if not fm.has_model:
            continue
        peaks, flat = fm.peak_params_, fm.power_spectrum - fm._ap_fit
        row = [fm.aperiodic_params_[1], fm.aperiodic_params_[0], fm.r_squared_]
        for _, (lo, hi, ed) in BORD:
            m = eeg_ica.band_mask(fm.freqs, lo, hi, ed)
            row += [flat[m].mean() if m.any() else np.nan,
                    float(any(eeg_ica.band_mask(np.array([p[0]]), lo, hi, ed)[0] for p in peaks)) if len(peaks) else 0.0]
        res[i] = row
    return res


def process(rec, cond, cache):
    import mne
    import numpy as np
    from mne_connectivity import spectral_connectivity_epochs
    mne.set_log_level("ERROR")
    out = Path(cache) / f"{rec['participant_id']}_{cond}.npz"
    if out.exists():
        return rec["participant_id"], cond, "en caché"
    ns = notebook_defs()
    raw, _ = eeg_ica.clean_raw(rec, ns)                       # pipeline principal: referencia promedio + ICA
    ea, _, _ = eeg_ica.clean_epochs(raw, ns, drop_fcz=False)  # mismas épocas que la app (rechazo > 200 µV)
    ep = ea.copy().drop_channels(["FCz"]); ch = ep.ch_names
    # --- aperiódico (61 electrodos, como la app)
    ps, fr = ep.compute_psd(**eeg_ica.welch(ep.info["sfreq"]), fmin=1.0, fmax=40.0, verbose=False).get_data(return_freqs=True)
    elec = fit_many(fr, ps.mean(axis=0))
    ps1, f1 = ep.compute_psd(**eeg_ica.welch(ep.info["sfreq"], 1.0, 0.5), fmin=1.0, fmax=40.0, verbose=False).get_data(return_freqs=True)
    tot1 = ps1.sum(axis=2)   # potencia relativa por banda (1–40 Hz); columnas NFIT + k en el orden de BORD
    rel1 = np.stack([ps1[:, :, eeg_ica.band_mask(f1, lo, hi, ed)].sum(axis=2) / tot1 for _, (lo, hi, ed) in BORD], axis=2)
    roi = {}
    for name, members in (("front", ns["FRONTAL_ROI"]), ("ct", ns["CENTROTEMPORAL_ROI"])):
        idx = [ch.index(c) for c in members if c in ch]
        roi[name] = np.c_[fit_many(f1, ps1[:, idx, :].mean(axis=1)), rel1[:, idx, :].mean(axis=1)]
    # --- conectividad (con FCz, referencia promedio)
    con = spectral_connectivity_epochs(ea, method="wpli2_debiased", mode="multitaper", sfreq=ea.info["sfreq"], fmin=4.0, fmax=8.0, faverage=True, verbose=False)
    W = con.get_data(output="dense")[:, :, 0]; W = W + W.T; cha = ea.ch_names
    ridx = {r: [cha.index(c) for c in cs] for r, cs in REGIONS.items()}
    pairs = np.array([W[np.ix_(ridx[a], ridx[b])].mean() for a, b in PAIRS])
    np.savez_compressed(out, ch=np.array(ch), elec=elec, roi_front=roi["front"], roi_ct=roi["ct"], logpsd=np.log10(ps.mean(axis=(0, 1))),
                        freqs=fr, pairs=pairs)
    return rec["participant_id"], cond, f"{len(ep)} épocas"


def paired(a, b):
    import numpy as np
    from scipy import stats
    d = b - a; t = stats.ttest_1samp(d, 0, nan_policy="omit")
    return {"NS": float(np.nanmean(a)), "SD": float(np.nanmean(b)), "dz": float(np.nanmean(d) / np.nanstd(d, ddof=1)),
            "t": float(t.statistic), "p": float(t.pvalue), "n": int((~np.isnan(d)).sum())}


def aggregate(cache):
    import numpy as np
    from scipy import stats
    from statsmodels.stats.multitest import multipletests
    D = {}
    for f in Path(cache).glob("*.npz"):
        pid, cond = f.stem.rsplit("_", 1); D.setdefault(pid, {})[cond] = np.load(f)
    ids = sorted(p for p, v in D.items() if {"NS", "SD"} <= set(v)); n = len(ids)
    coords = json.loads((DATA / "coords.json").read_text(encoding="utf-8")); elecs = list(coords)
    r4 = lambda x: None if x is None or not np.isfinite(x) else round(float(x), 5)

    # ---------------- aperiódico ----------------
    def per_elec(p, c, k):
        ch = list(D[p][c]["ch"]); e = D[p][c]["elec"]; return np.array([e[ch.index(x), k] if x in ch else np.nan for x in elecs])
    A = {k: (np.array([per_elec(p, "NS", i) for p in ids]), np.array([per_elec(p, "SD", i) for p in ids])) for k, i in (("exp", 0), ("off", 1), ("thp", 3))}
    group = {}
    for k, (ns_, sd_) in A.items():
        d = sd_ - ns_; t = stats.ttest_1samp(d, 0, axis=0, nan_policy="omit"); p = np.nan_to_num(np.asarray(t.pvalue), nan=1.0)
        q = multipletests(p, method="fdr_bh")[1]
        group[k] = {"NS": [r4(v) for v in np.nanmean(ns_, 0)], "SD": [r4(v) for v in np.nanmean(sd_, 0)], "p": [r4(v) for v in p],
                    "q": [r4(v) for v in q], "dz": [r4(v) for v in np.nanmean(d, 0) / np.nanstd(d, 0, ddof=1)]}
    glob = {k: paired(np.nanmean(ns_, 1), np.nanmean(sd_, 1)) for k, (ns_, sd_) in A.items()}
    peak = {c: float(np.mean([np.nanmean(D[p][c]["elec"][:, 4]) for p in ids])) for c in ("NS", "SD")}
    freqs = D[ids[0]]["NS"]["freqs"]
    def sigma_of(k):
      # k: índice de la banda en BORD; periódica en la columna 3 + 2k y relativa en NFIT + k
      out = {}
      for roi, key in (("front", "roi_front"), ("ct", "roi_ct")):
        def sg(p, c, col):
            a = D[p][c][key]; ok = a[:, 2] >= R2MIN
            return np.nanstd(a[ok, col]) if ok.sum() >= MIN_EPOCHS else np.nan
        rows = {}
        for p in ids:
            dr = sg(p, "SD", NFIT + k) - sg(p, "NS", NFIT + k); dp = sg(p, "SD", 3 + 2 * k) - sg(p, "NS", 3 + 2 * k); de = sg(p, "SD", 0) - sg(p, "NS", 0)
            if np.isfinite(dr) and np.isfinite(dp):
                rows[p] = [r4(dr), r4(dp), r4(de)]
        x = np.array([v[0] for v in rows.values()]); y = np.array([v[1] for v in rows.values()]); z = np.array([v[2] if v[2] is not None else np.nan for v in rows.values()])
        r = stats.spearmanr(x, y); ok = np.isfinite(z); X = np.c_[np.ones(ok.sum()), z[ok]]
        res = x[ok] - X @ np.linalg.lstsq(X, x[ok], rcond=None)[0]
        out[roi] = {"persons": rows, "rho_periodic": round(float(r.statistic), 3), "p_periodic": float(r.pvalue),
                    "r2_exponent": round(float(1 - res.var() / x[ok].var()), 3), "n": len(rows)}
      return out
    sigma = sigma_of(0)
    # ---------------- por banda (delta, alfa, beta): misma estructura que theta ----------------
    bands = {}
    for k, (b, (lo, hi, ed)) in enumerate(BORD):
        if k == 0:
            continue
        col = 3 + 2 * k
        ns_, sd_ = np.array([per_elec(p, "NS", col) for p in ids]), np.array([per_elec(p, "SD", col) for p in ids])
        d = sd_ - ns_; t = stats.ttest_1samp(d, 0, axis=0, nan_policy="omit"); pv = np.nan_to_num(np.asarray(t.pvalue), nan=1.0)
        q = multipletests(pv, method="fdr_bh")[1]
        bands[b] = {"range": [lo, hi], "edges": ed,
                    "group": {"thp": {"NS": [r4(v) for v in np.nanmean(ns_, 0)], "SD": [r4(v) for v in np.nanmean(sd_, 0)], "p": [r4(v) for v in pv],
                                      "q": [r4(v) for v in q], "dz": [r4(v) for v in np.nanmean(d, 0) / np.nanstd(d, 0, ddof=1)]}},
                    "global": {"thp": paired(np.nanmean(ns_, 1), np.nanmean(sd_, 1))},
                    "peak_fraction": {c: float(np.mean([np.nanmean(D[p][c]["elec"][:, col + 1]) for p in ids])) for c in ("NS", "SD")},
                    "sigma": sigma_of(k)}
    aperiodic = {
        "meta": {"source": "ds004902, ojos abiertos; tools/build_secondary.py", "n": n, "electrodes": elecs,
                 "specparam": {k: (list(v) if isinstance(v, tuple) else v) for k, v in FOOOF_SET.items() if k != "verbose"} | {"freq_range": [1, 40]},
                 "sigma_epochs": f"Welch 1 s, 50 % de solapamiento; épocas con R² ≥ {R2MIN}; al menos {MIN_EPOCHS} por registro"},
        "group": group, "global": glob, "theta_peak_fraction": peak,
        "spectrum": {"freqs": [round(float(f), 2) for f in freqs],
                     "persons": {p: {c: [round(float(v), 4) for v in D[p][c]["logpsd"]] for c in ("NS", "SD")} for p in ids}},
        "persons": {p: {"exp": [[r4(v) for v in A["exp"][0][i]], [r4(v) for v in A["exp"][1][i]]],
                        "off": [[r4(v) for v in A["off"][0][i]], [r4(v) for v in A["off"][1][i]]]} for i, p in enumerate(ids)},
        "sigma": sigma,
        "bands": bands,
    }
    # ---------------- conectividad ----------------
    NSp = np.array([D[p]["NS"]["pairs"] for p in ids]); SDp = np.array([D[p]["SD"]["pairs"] for p in ids]); dP = SDp - NSp
    t = stats.ttest_1samp(dP, 0, axis=0); q = multipletests(t.pvalue, method="fdr_bh")[1]
    rng = np.random.default_rng(7); B = 5000; tobs = t.statistic; gl = dP.mean(1); mobs = gl.mean() / (gl.std(ddof=1) / np.sqrt(n))
    mx = np.empty(B); mm = np.empty(B)
    for b in range(B):
        s = rng.choice([-1, 1], size=(n, 1)); x = dP * s
        mx[b] = np.abs(x.mean(0) / (x.std(0, ddof=1) / np.sqrt(n))).max(); g = x.mean(1); mm[b] = g.mean() / (g.std(ddof=1) / np.sqrt(n))
    connectivity = {
        "meta": {"source": "ds004902, ojos abiertos; tools/build_secondary.py", "n": n, "measure": "wPLI² debiased, multitaper, 4–8 Hz",
                 "reference": "FCz reinsertado, referencia promedio, ICA (tools/eeg_ica.py)", "regions": REGIONS, "permutations": B},
        "pairs": [list(p) for p in PAIRS],
        "group": {"NS": [r4(v) for v in NSp.mean(0)], "SD": [r4(v) for v in SDp.mean(0)], "dz": [r4(v) for v in dP.mean(0) / dP.std(0, ddof=1)],
                  "t": [r4(v) for v in t.statistic], "p": [r4(v) for v in t.pvalue], "q": [r4(v) for v in q],
                  # media de Δ por par con su IC 95 % (t con n − 1 gl), para el gráfico de efectos por par
                  "mean_d": [r4(v) for v in dP.mean(0)],
                  "ci": [[r4(m - h), r4(m + h)] for m, h in zip(dP.mean(0), stats.t.ppf(.975, n - 1) * dP.std(0, ddof=1) / np.sqrt(n))]},
        "global": paired(NSp.mean(1), SDp.mean(1)) | {"p_perm": float((np.abs(mm) >= abs(mobs)).mean()), "p_maxt": float((mx >= np.abs(tobs).max()).mean()),
                                                     "pairs_down": int((dP.mean(0) < 0).sum())},
        "persons": {p: [[r4(v) for v in NSp[i]], [r4(v) for v in SDp[i]]] for i, p in enumerate(ids)},
    }
    for name, obj in (("aperiodic", aperiodic), ("connectivity", connectivity)):
        (DATA / f"{name}.json").write_text(json.dumps(obj, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
    g = connectivity["global"]; s = aperiodic["sigma"]
    print(f"\n{n} personas. Aperiódico: exponente d_z {glob['exp']['dz']:+.2f} (p {glob['exp']['p']:.3f}), offset d_z {glob['off']['dz']:+.2f} (p {glob['off']['p']:.3f}); "
          f"Δσθ ~ Δσθ periódica ρ = {s['front']['rho_periodic']} (frontal), {s['ct']['rho_periodic']} (centro-temporal).")
    for b, B in bands.items():
        print(f"  {b}: periódica global d_z {B['global']['thp']['dz']:+.2f} (p {B['global']['thp']['p']:.3g}), q < 0.05 en {sum(v < .05 for v in B['group']['thp']['q'])} de 61; "
              f"pico en la banda {B['peak_fraction']['NS']:.2f} → {B['peak_fraction']['SD']:.2f}; Δσ ~ Δσ periódica ρ = {B['sigma']['front']['rho_periodic']} (frontal, n {B['sigma']['front']['n']}), "
              f"{B['sigma']['ct']['rho_periodic']} (centrotemporal, n {B['sigma']['ct']['n']})")
    print(f"Conectividad: {g['pairs_down']} de 45 pares bajan; global d_z {g['dz']:+.2f}, p perm {g['p_perm']:.3f}, máx-t {g['p_maxt']:.3f}; q mínimo {min(q):.3f}.")


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--procs", type=int, default=6)
    ap.add_argument("--cache", type=Path, default=None, help="carpeta para los resultados por grabación (por defecto, temporal)")
    a = ap.parse_args()
    if not (eeg_ica.DS).exists():
        raise SystemExit(f"Falta el dataset en {REPO / 'ds004902'}: ver deliveries/week06/README.md")
    tmp = None
    if a.cache is None:
        tmp = tempfile.TemporaryDirectory(prefix="batimix_sec_"); a.cache = Path(tmp.name)
    a.cache.mkdir(parents=True, exist_ok=True)
    import pandas as pd
    ns = notebook_defs()
    cond = ns["session_to_condition"](pd.read_csv(ns["PARTICIPANTS_TSV"], sep="\t"))
    jobs = [(r, cond.get((r["participant_id"], r["session"]))) for r in ns["find_recordings"](eeg_ica.DS) if r["task"] == "eyesopen"]
    jobs = [j for j in jobs if j[1]]
    with ProcessPoolExecutor(a.procs) as ex:
        futs = {ex.submit(process, r, c, str(a.cache)): (r["participant_id"], c) for r, c in jobs}
        for i, f in enumerate(as_completed(futs), 1):
            pid, c = futs[f]
            try:
                f.result()
            except Exception as e:
                print(f"  omitida {pid} {c}: {str(e).splitlines()[0][:90]}", flush=True)
            if i % 20 == 0 or i == len(jobs):
                print(f"  {i}/{len(jobs)} grabaciones", flush=True)
    aggregate(a.cache)
    if tmp:
        tmp.cleanup()


if __name__ == "__main__":
    main()
