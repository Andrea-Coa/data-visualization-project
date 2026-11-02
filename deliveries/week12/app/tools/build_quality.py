"""Builds data/quality.json: per-person EEG data quality and an eye-artifact (blink) check of σθ.

1. Data quality (from deliveries/week06/data/processed/eeg_theta_per_electrode.csv and eeg_pipeline_skipped.csv):
   epochs used (out of 75), interpolated bad channels (names) and excluded recordings, eyes open.
2. Blink check (from the raw EEG, same preprocessing as notebook 02, whose definition cells are executed as they are).
   ds004902 has no EOG channel and the pipeline has no ICA, so frontal theta could be contaminated by blinks.
   Blinks are detected with mne.preprocessing.find_eog_events on Fp1 (used as a vertical-EOG proxy; its own
   1–10 Hz filter and automatic threshold). For each recording: blinks per minute and blinks per 4-s epoch.
   σθ is then recomputed with the app's definition (mean over the ROI electrodes of each electrode's SD of relative
   theta across epochs) using (a) all epochs, which must reproduce participants.json, and (b) blink-free epochs only.
   If Δσθ from blink-free epochs tracks Δσθ from all epochs, blinks do not drive the effect.

Requires <root>/ds004902 and Python with mne, numpy, scipy, pandas, pymatreader. About 3 minutes with 6 processes.
Usage (from deliveries/week12/app/):  python3 tools/build_quality.py [--procs 6]
"""
import argparse
import csv
import json
import os
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[3]
NB = REPO / "deliveries" / "week06" / "code" / "02_eeg_pipeline.ipynb"
PROC = REPO / "deliveries" / "week06" / "data" / "processed"
DATA = HERE.parent / "data"
MIN_CLEAN = 30   # blink-free epochs needed to compute a clean σθ


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
    import mne
    import numpy as np
    mne.set_log_level("ERROR")
    ns = notebook_defs()
    raw = mne.io.read_raw_eeglab(rec["set_path"], preload=True, verbose=False)
    # parpadeos sobre la señal continua (antes del filtrado del pipeline; find_eog_events filtra 1–10 Hz)
    blinks = mne.preprocessing.find_eog_events(raw, ch_name="Fp1", verbose=False)
    t_blink = (blinks[:, 0] - raw.first_samp) / raw.info["sfreq"]
    minutes = raw.times[-1] / 60
    # mismo preprocesamiento y épocas que el notebook 02
    montage = ns["build_montage"](rec["electrodes_tsv"])
    if montage is not None:
        raw.set_montage(montage, on_missing="ignore", verbose=False)
    raw.notch_filter(50.0, verbose=False)
    raw.filter(*ns["BAND_FULL"], verbose=False)
    bads = ns["detect_bad_channels"](raw)
    if bads and montage is not None and len(bads) < 0.2 * len(raw.ch_names):
        raw.info["bads"] = bads
        raw.interpolate_bads(reset_bads=True, verbose=False)
    ep = mne.make_fixed_length_epochs(raw, duration=ns["EPOCH_DURATION_S"], preload=True, verbose=False)
    ep = ep[: min(ns["MAX_EPOCHS"], len(ep))]
    psds, freqs = ep.compute_psd(method="welch", fmin=1.0, fmax=40.0, verbose=False).get_data(return_freqs=True)
    th = (freqs >= 4.0) & (freqs <= 8.0)
    rel = psds[:, :, th].sum(axis=2) / psds.sum(axis=2)                       # (épocas, canales)
    n_ep = len(ep)
    per_epoch = np.bincount(np.clip((t_blink // ns["EPOCH_DURATION_S"]).astype(int), 0, None), minlength=n_ep)[:n_ep]
    clean = per_epoch == 0
    out = {"blinks_per_min": float(len(blinks) / minutes), "epochs": n_ep, "blink_free_epochs": int(clean.sum())}
    for roi, members in (("front", ns["FRONTAL_ROI"]), ("ct", ns["CENTROTEMPORAL_ROI"])):
        idx = [ep.ch_names.index(c) for c in members if c in ep.ch_names]
        out[f"sigma_{roi}_all"] = float(rel[:, idx].std(axis=0).mean())       # misma definición que la app
        out[f"sigma_{roi}_clean"] = float(rel[clean][:, idx].std(axis=0).mean()) if clean.sum() >= MIN_CLEAN else None
        roi_series = rel[:, idx].mean(axis=1)
        out[f"r_blink_theta_{roi}"] = float(np.corrcoef(per_epoch, roi_series)[0, 1]) if per_epoch.std() > 0 else None
    return rec["participant_id"], cond, out


def main():
    import numpy as np
    import pandas as pd
    from scipy import stats
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--procs", type=int, default=6)
    a = ap.parse_args()
    if not (REPO / "ds004902").exists():
        raise SystemExit(f"Dataset missing at {REPO / 'ds004902'}: see deliveries/week06/README.md")
    # 1. calidad
    q = {}
    with (PROC / "eeg_theta_per_electrode.csv").open(encoding="utf-8") as fh:
        for r in csv.DictReader(fh):
            if r["task"] != "eyesopen":
                continue
            d = q.setdefault(r["participant_id"], {}).setdefault(r["condition"], {"epochs": int(float(r["n_epochs_used"])), "interpolated": []})
            if r["interpolated"] in ("True", "true", "1"):
                d["interpolated"].append(r["electrode"])
    skipped = [f"{r['participant_id']} {r['session']}" for r in csv.DictReader((PROC / "eeg_pipeline_skipped.csv").open(encoding="utf-8")) if r["task"] == "eyesopen"]
    # 2. parpadeos
    ns = notebook_defs()
    cond_map = ns["session_to_condition"](pd.read_csv(ns["PARTICIPANTS_TSV"], sep="\t"))
    jobs = [(r, cond_map.get((r["participant_id"], r["session"]))) for r in ns["find_recordings"](REPO / "ds004902") if r["task"] == "eyesopen"]
    jobs = [j for j in jobs if j[1]]
    B = {}
    with ProcessPoolExecutor(a.procs) as ex:
        futs = {ex.submit(process, r, c): (r["participant_id"], c) for r, c in jobs}
        for i, f in enumerate(as_completed(futs), 1):
            try:
                pid, c, out = f.result(); B.setdefault(pid, {})[c] = out
            except Exception as e:
                pid, c = futs[f]; print(f"  skipped {pid} {c}: {str(e).splitlines()[0][:80]}", flush=True)
            if i % 40 == 0 or i == len(jobs):
                print(f"  {i}/{len(jobs)} recordings", flush=True)
    P = {d["id"]: d for d in json.loads((DATA / "participants.json").read_text(encoding="utf-8"))}
    persons, summary = {}, {}
    for pid in sorted(set(q) | set(B)):
        rec = {}
        for c in ("NS", "SD"):
            if c in q.get(pid, {}) or c in B.get(pid, {}):
                b = B.get(pid, {}).get(c, {})
                rec[c] = {"epochs": q.get(pid, {}).get(c, {}).get("epochs"), "interpolated": q.get(pid, {}).get(c, {}).get("interpolated", []),
                          "blinks_per_min": round(b["blinks_per_min"], 1) if b else None, "blink_free_epochs": b.get("blink_free_epochs")}
        if {"NS", "SD"} <= set(B.get(pid, {})):
            bs = B[pid]
            for roi in ("front", "ct"):
                rec[f"d_sigma_{roi}_all"] = round(bs["SD"][f"sigma_{roi}_all"] - bs["NS"][f"sigma_{roi}_all"], 6)
                cl = [bs[c][f"sigma_{roi}_clean"] for c in ("NS", "SD")]
                rec[f"d_sigma_{roi}_clean"] = round(cl[1] - cl[0], 6) if None not in cl else None
            rec["d_blinks_per_min"] = round(bs["SD"]["blinks_per_min"] - bs["NS"]["blinks_per_min"], 2)
        persons[pid] = rec
    paired = [p for p in persons if "d_sigma_front_all" in persons[p]]
    for roi in ("front", "ct"):
        al = np.array([persons[p][f"d_sigma_{roi}_all"] for p in paired])
        app = np.array([P[p][f"d_{roi}_var"] if P.get(p) and P[p].get(f"d_{roi}_var") is not None else np.nan for p in paired])
        ok = [i for i, p in enumerate(paired) if persons[p][f"d_sigma_{roi}_clean"] is not None]
        cl = np.array([persons[paired[i]][f"d_sigma_{roi}_clean"] for i in ok])
        db = np.array([persons[p]["d_blinks_per_min"] for p in paired])
        within = [B[p][c][f"r_blink_theta_{roi}"] for p in B for c in B[p] if B[p][c].get(f"r_blink_theta_{roi}") is not None]
        summary[roi] = {
            "check_vs_app_max_abs_diff": float(np.nanmax(np.abs(al - app))),
            "n_clean": len(ok), "rho_clean_vs_all": round(float(stats.spearmanr(al[ok], cl).statistic), 3),
            "rho_dblinks_vs_dsigma": round(float(stats.spearmanr(db, al).statistic), 3), "p_dblinks_vs_dsigma": float(stats.spearmanr(db, al).pvalue),
            "within_recording_r_blinks_theta": round(float(np.tanh(np.mean(np.arctanh(np.clip(within, -.999, .999))))), 3),
            "clean_group_test": {"mean": float(cl.mean()), "t": float(stats.ttest_1samp(cl, 0).statistic), "p": float(stats.ttest_1samp(cl, 0).pvalue)},
            "all_group_test": {"mean": float(al.mean()), "t": float(stats.ttest_1samp(al, 0).statistic), "p": float(stats.ttest_1samp(al, 0).pvalue)},
        }
    br = {c: [persons[p][c]["blinks_per_min"] for p in persons if c in persons[p] and persons[p][c]["blinks_per_min"] is not None] for c in ("NS", "SD")}
    db = np.array([persons[p]["d_blinks_per_min"] for p in paired])
    meta = {"source": "eeg_theta_per_electrode.csv, eeg_pipeline_skipped.csv (Week 6) and ds004902 raw EEG; tools/build_quality.py",
            "blink_detector": "mne.preprocessing.find_eog_events on Fp1 (no EOG channel in ds004902)", "min_clean_epochs": MIN_CLEAN,
            "excluded_recordings": skipped,
            "blinks_per_min": {c: {"median": float(np.median(v)), "n": len(v)} for c, v in br.items()},
            "d_blinks_test": {"mean": float(db.mean()), "t": float(stats.ttest_1samp(db, 0).statistic), "p": float(stats.ttest_1samp(db, 0).pvalue), "n": len(db)}}
    (DATA / "quality.json").write_text(json.dumps({"meta": meta, "summary": summary, "persons": persons}, separators=(",", ":")), encoding="utf-8")
    print(f"\nBlinks/min: NS median {meta['blinks_per_min']['NS']['median']:.1f}, SD {meta['blinks_per_min']['SD']['median']:.1f}; "
          f"change t = {meta['d_blinks_test']['t']:+.2f}, p = {meta['d_blinks_test']['p']:.3f}")
    for roi, s in summary.items():
        print(f"{roi}: all-epochs Δσθ vs app max diff {s['check_vs_app_max_abs_diff']:.1e}; blink-free vs all ρ = {s['rho_clean_vs_all']} (n = {s['n_clean']}); "
              f"Δblinks vs Δσθ ρ = {s['rho_dblinks_vs_dsigma']} (p = {s['p_dblinks_vs_dsigma']:.3f}); within-recording r = {s['within_recording_r_blinks_theta']}; "
              f"group Δσθ all t = {s['all_group_test']['t']:+.2f} (p {s['all_group_test']['p']:.3f}), blink-free t = {s['clean_group_test']['t']:+.2f} (p {s['clean_group_test']['p']:.3f})")


if __name__ == "__main__":
    main()
