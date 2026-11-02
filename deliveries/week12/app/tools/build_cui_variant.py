"""Builds data/cui_variant.json: σθ recomputed with an ICA pipeline in the style of Cui et al. (2026) on the same dataset.

Cui et al. (2026) report that the change in frontal and centrotemporal theta variability (ΔσΘ) correlates with the change
in PVT median reaction time (Spearman ρ = 0.544 and 0.558, n = 28). Our Week-6 pipeline differs in several choices
(FCz reference, no ICA, 1–40 Hz, no epoch rejection). This script reruns the raw EEG with their choices, as far as the
paper describes them, to see which conclusions depend on the pipeline:

  1. 1–30 Hz band-pass; bad channels by log-variance |z| > 3 (notebook 02) and spherical-spline interpolation;
  2. FCz (the recording reference) re-inserted and average reference; FCz is placed halfway between Fz and Cz on the sphere;
  3. extended Infomax ICA keeping 99 % of the variance; ocular components = |r| > 0.85 with Fp1 or Fp2 (no EOG channel)
     and muscle components = ICLabel "muscle artifact" with p > 0.85; they are removed;
  4. 4-s epochs, the first 75, epochs with a peak-to-peak amplitude > 200 µV rejected;
  5. relative theta by Welch (same settings as notebook 02): 4–8 Hz over 4–30 Hz (Cui) and over 1–30 Hz;
  6. σθ per electrode = SD of relative theta across epochs, ROI mean (the app's definition).

To separate the effect of the reference from that of ICA, the same data are also summarized without removing components.
Outputs per person (Δ = SD − NS) and a summary: agreement with the app's Δσθ, group test and Spearman with ΔPVT.

Requires <root>/ds004902 and Python with mne, mne-icalabel, onnxruntime, numpy, scipy, pandas, pymatreader.
About 15 minutes with 6 processes. Usage (from deliveries/week12/app/):  python3 tools/build_cui_variant.py [--procs 6]
"""
import argparse
import itertools
import json
import os
import pickle
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[3]
NB = REPO / "deliveries" / "week06" / "code" / "02_eeg_pipeline.ipynb"
DATA = HERE.parent / "data"
BAND = (1.0, 30.0)
ICA_VAR, EOG_R, MUSCLE_P, REJECT_UV, SEED = 0.99, 0.85, 0.85, 200.0, 97
VARIANTS = {"noica_1_30": "average ref, 1–30 Hz, no ICA (denominator 1–30 Hz)",
            "ica_1_30": "average ref, 1–30 Hz, ICA (denominator 1–30 Hz)",
            "ica_4_30": "average ref, 1–30 Hz, ICA (denominator 4–30 Hz, Cui et al.)"}


def notebook_defs():
    cells = ["".join(c["source"]) for c in json.loads(NB.read_text(encoding="utf-8"))["cells"] if c["cell_type"] == "code"]
    ns = {"__name__": "nb02"}; cwd = os.getcwd(); os.chdir(NB.parent)
    try:
        for i in (0, 1, 2, 3):
            exec(cells[i], ns)
    finally:
        os.chdir(cwd)
    return ns


def process(rec, cond):
    for v in ("OMP_NUM_THREADS", "OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS"):
        os.environ[v] = "1"
    import mne
    import numpy as np
    from mne.preprocessing import ICA
    from mne_icalabel import label_components
    mne.set_log_level("ERROR")
    ns = notebook_defs()
    raw = mne.io.read_raw_eeglab(rec["set_path"], preload=True, verbose=False)
    montage = ns["build_montage"](rec["electrodes_tsv"])
    raw.set_montage(montage, on_missing="ignore", verbose=False)
    raw.filter(*BAND, verbose=False)
    bads = ns["detect_bad_channels"](raw)
    if bads and len(bads) < 0.2 * len(raw.ch_names):
        raw.info["bads"] = bads
        raw.interpolate_bads(reset_bads=True, verbose=False)
    # FCz (referencia de grabación) reinsertado; posición = punto medio Fz–Cz proyectado a la esfera
    mne.add_reference_channels(raw, "FCz", copy=False)
    pos = {ch["ch_name"]: ch["loc"][:3] for ch in raw.info["chs"]}
    mid = (pos["Fz"] + pos["Cz"]) / 2
    raw.info["chs"][raw.ch_names.index("FCz")]["loc"][:3] = mid / np.linalg.norm(mid) * np.linalg.norm(pos["Cz"])
    raw.set_eeg_reference("average", projection=False, verbose=False)
    ica = ICA(n_components=ICA_VAR, method="infomax", fit_params=dict(extended=True), random_state=SEED, max_iter="auto")
    ica.fit(raw, verbose=False)
    eog = set()
    for ch in ("Fp1", "Fp2"):
        idx, _ = ica.find_bads_eog(raw, ch_name=ch, measure="correlation", threshold=EOG_R, verbose=False)
        eog |= {int(i) for i in idx}
    lab = label_components(raw, ica, method="iclabel")
    muscle = {i for i, (l, p) in enumerate(zip(lab["labels"], lab["y_pred_proba"])) if l == "muscle artifact" and p > MUSCLE_P}
    ica.exclude = sorted(eog | muscle)
    clean = ica.apply(raw.copy(), verbose=False)
    out = {"n_components": int(ica.n_components_), "n_ocular": len(eog), "n_muscle": len(muscle - eog),
           "n_removed": len(ica.exclude), "bads": bads}
    for name, r in (("noica", raw), ("ica", clean)):
        ep = mne.make_fixed_length_epochs(r, duration=ns["EPOCH_DURATION_S"], preload=True, verbose=False)
        ep = ep[: min(ns["MAX_EPOCHS"], len(ep))]
        ep.drop_bad(reject=dict(eeg=REJECT_UV * 1e-6), verbose=False)
        out[f"epochs_{name}"] = len(ep)
        if len(ep) < 2:                     # sin ICA, una grabación pierde todas sus épocas por parpadeos
            continue
        psd, f = ep.compute_psd(method="welch", fmin=1.0, fmax=30.0, verbose=False).get_data(return_freqs=True)
        th = psd[:, :, (f >= 4) & (f <= 8)].sum(axis=2)
        dens = {"1_30": psd.sum(axis=2), "4_30": psd[:, :, f >= 4].sum(axis=2)}
        for dn, den in dens.items():
            key = f"{name}_{dn}"
            if key not in VARIANTS:
                continue
            rel = th / den
            for roi, members in (("front", ns["FRONTAL_ROI"]), ("ct", ns["CENTROTEMPORAL_ROI"])):
                idx = [ep.ch_names.index(c) for c in members if c in ep.ch_names]
                out[f"{key}_sigma_{roi}"] = float(rel[:, idx].std(axis=0).mean())
                out[f"{key}_mu_{roi}"] = float(rel[:, idx].mean())
    return rec["participant_id"], cond, out


def main():
    import numpy as np
    import pandas as pd
    from scipy import stats
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--procs", type=int, default=6)
    ap.add_argument("--cache", default=None, help="pickle with per-recording results (reused if it exists)")
    a = ap.parse_args()
    if not (REPO / "ds004902").exists():
        raise SystemExit(f"Dataset missing at {REPO / 'ds004902'}: see deliveries/week06/README.md")
    ns = notebook_defs()
    if a.cache and Path(a.cache).exists():
        R = pickle.loads(Path(a.cache).read_bytes())
    else:
        cond_map = ns["session_to_condition"](pd.read_csv(ns["PARTICIPANTS_TSV"], sep="\t"))
        jobs = [(r, cond_map.get((r["participant_id"], r["session"]))) for r in ns["find_recordings"](REPO / "ds004902") if r["task"] == "eyesopen"]
        jobs = [j for j in jobs if j[1]]
        R = {}
        with ProcessPoolExecutor(a.procs) as ex:
            futs = {ex.submit(process, r, c): (r["participant_id"], c) for r, c in jobs}
            for i, f in enumerate(as_completed(futs), 1):
                try:
                    pid, c, out = f.result(); R.setdefault(pid, {})[c] = out
                except Exception as e:
                    pid, c = futs[f]; print(f"  skipped {pid} {c}: {str(e).splitlines()[0][:80]}", flush=True)
                if i % 20 == 0 or i == len(jobs):
                    print(f"  {i}/{len(jobs)} recordings", flush=True)
        if a.cache:
            Path(a.cache).write_bytes(pickle.dumps(R))
    P = {d["id"]: d for d in json.loads((DATA / "participants.json").read_text(encoding="utf-8"))}
    paired = sorted(p for p in R if {"NS", "SD"} <= set(R[p]))
    persons = {}
    for p in paired:
        rec = {c: {k: R[p][c][k] for k in ("n_components", "n_ocular", "n_muscle", "n_removed", "epochs_ica")} for c in ("NS", "SD")}
        for v in VARIANTS:
            for roi in ("front", "ct"):
                for m in ("sigma", "mu"):
                    k = f"{v}_{m}_{roi}"
                    rec[f"d_{m}_{roi}_{v}"] = round(R[p]["SD"][k] - R[p]["NS"][k], 6) if all(k in R[p][c] for c in ("NS", "SD")) else None
        persons[p] = rec
    summary = {}
    for v in VARIANTS:
        for roi in ("front", "ct"):
            have = [p for p in paired if persons[p][f"d_sigma_{roi}_{v}"] is not None]
            d = np.array([persons[p][f"d_sigma_{roi}_{v}"] for p in have])
            app = np.array([P[p].get(f"d_{roi}_var") if P.get(p) and P[p].get(f"d_{roi}_var") is not None else np.nan for p in have])
            ok = ~np.isnan(app)
            t = stats.ttest_1samp(d, 0)
            pv = [(persons[p][f"d_sigma_{roi}_{v}"], P[p]["d_pvt"]) for p in have if P.get(p) and P[p].get("d_pvt") is not None]
            x, y = np.array(pv).T
            rs = stats.spearmanr(x, y)
            # Cui et al. tenían n = 28: rango de ρ dejando fuera cada par posible de personas
            l2o = [stats.spearmanr(np.delete(x, [i, j]), np.delete(y, [i, j])).statistic for i, j in itertools.combinations(range(len(x)), 2)]
            summary[f"{v}_{roi}"] = {
                "n": len(d), "mean": float(d.mean()), "t": float(t.statistic), "p": float(t.pvalue), "d_z": float(d.mean() / d.std(ddof=1)),
                "rho_vs_app": float(stats.spearmanr(d[ok], app[ok]).statistic),
                "pvt": {"n": len(x), "rho": float(rs.statistic), "p": float(rs.pvalue),
                        "leave_two_out": {"pairs": len(l2o), "min": float(min(l2o)), "max": float(max(l2o))}}}
    # misma n para la correlación con PVT en la app (referencia)
    for roi in ("front", "ct"):
        pv = [(P[p][f"d_{roi}_var"], P[p]["d_pvt"]) for p in P if P[p].get("d_pvt") is not None and P[p].get(f"d_{roi}_var") is not None]
        x, y = np.array(pv).T; rs = stats.spearmanr(x, y)
        summary[f"app_{roi}"] = {"pvt": {"n": len(x), "rho": float(rs.statistic), "p": float(rs.pvalue)}}
    rem = {c: [persons[p][c]["n_removed"] for p in paired] for c in ("NS", "SD")}
    eps = {c: [persons[p][c]["epochs_ica"] for p in paired] for c in ("NS", "SD")}
    meta = {"source": "ds004902 raw EEG, eyes open; tools/build_cui_variant.py", "variants": VARIANTS,
            "settings": {"band": BAND, "ica_variance": ICA_VAR, "eog_abs_r": EOG_R, "iclabel_muscle_p": MUSCLE_P, "reject_uv": REJECT_UV, "seed": SEED},
            "removed_components_mean": {c: float(np.mean(v)) for c, v in rem.items()},
            "epochs_kept_mean": {c: float(np.mean(v)) for c, v in eps.items()},
            "reference": "Cui et al. 2026: ρ(ΔσΘ, ΔPVT median RT) = 0.544 frontal, 0.558 centrotemporal, n = 28; 2.64 / 3.11 components removed"}
    (DATA / "cui_variant.json").write_text(json.dumps({"meta": meta, "summary": summary, "persons": persons}, separators=(",", ":")), encoding="utf-8")
    print(f"\n{len(paired)} paired people; components removed NS {meta['removed_components_mean']['NS']:.2f}, SD {meta['removed_components_mean']['SD']:.2f}; "
          f"epochs kept NS {meta['epochs_kept_mean']['NS']:.1f}, SD {meta['epochs_kept_mean']['SD']:.1f}")
    for roi in ("front", "ct"):
        s = summary[f"app_{roi}"]["pvt"]; print(f"app {roi}: ρ vs ΔPVT = {s['rho']:+.3f} (p {s['p']:.3f}, n {s['n']})")
        for v in VARIANTS:
            s = summary[f"{v}_{roi}"]
            print(f"{v} {roi}: group Δσθ t = {s['t']:+.2f} (p {s['p']:.3f}, d_z {s['d_z']:+.2f}); ρ vs app Δσθ = {s['rho_vs_app']:.2f}; "
                  f"ρ vs ΔPVT = {s['pvt']['rho']:+.3f} (p {s['pvt']['p']:.3f}, n {s['pvt']['n']}; "
                  f"leaving out 2: {s['pvt']['leave_two_out']['min']:+.2f} to {s['pvt']['leave_two_out']['max']:+.2f})")


if __name__ == "__main__":
    main()
