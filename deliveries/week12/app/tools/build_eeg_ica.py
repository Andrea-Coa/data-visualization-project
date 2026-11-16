"""Builds deliveries/week12/data/processed_ica/: the main EEG pipeline (notebook 02 + average reference + ICA).

Same files and columns as deliveries/week06/data/processed (notebooks 02 and 03), so the app builders can read either:
  eeg_theta_per_electrode.csv  relative theta (4–8 / 1–40 Hz, Welch) per electrode: mean (μθ) and SD across epochs (σθ),
                               plus the ICA bookkeeping (components fitted and removed, epochs rejected); condition
                               comes from the session folder (ses-1 = NS, ses-2 = SD) and visit (1 or 2) from SessionOrder
  eeg_theta_epochs_roi.csv     relative theta per epoch and region; epoch_idx is the position in the recording (0–74),
                               so rejected epochs leave a gap
  eeg_pipeline_skipped.csv     recordings that cannot be processed
  merged_summary.csv           ROI means and SD − NS deltas merged with the Week 6 behavioral deltas (notebook 03)
  eeg_theta_epochs_electrode.npz  relative theta per epoch (75 positions, NaN = rejected) and electrode, one array
                               per "participant|condition", for the electrode series of the app's time view
  bands/<band>/                the same five files for delta, alpha and beta (relative power over 1–40 Hz, band edges
                               in tools/eeg_ica.BANDS), computed in the same pass of the spectrum; the columns keep the
                               «theta_» names so that the app builders read any band unchanged
Cleaning is in tools/eeg_ica.py. Eyes open only. About 10 minutes with 7 processes the first time (ICA fits are cached).
Usage (from deliveries/week12/app/):  python3 tools/build_eeg_ica.py [--procs 7] [--refit]
"""
import argparse
import sys
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import eeg_ica as E  # noqa: E402


def process(rec, cond, refit):
    import numpy as np
    ns = E.notebook_defs()
    raw, info = E.clean_raw(rec, ns, refit)
    ep, kept, available = E.clean_epochs(raw, ns)
    if len(ep) < 2:
        return rec["participant_id"], cond, None, f"{len(ep)} epochs left after rejection"
    psds, freqs = ep.compute_psd(**E.welch(ep.info["sfreq"]), fmin=ns["BAND_FULL"][0], fmax=ns["BAND_FULL"][1], verbose=False).get_data(return_freqs=True)
    total = psds.sum(axis=2)
    th = (freqs >= ns["BAND_THETA"][0]) & (freqs <= ns["BAND_THETA"][1])   # theta: regla del notebook 02, sin cambios
    masks = {"theta": th, **{b: E.band_mask(freqs, *v) for b, v in E.BANDS.items()}}
    rest = E.band_mask(freqs, *E.REST)
    # chequeo de composición: delta + theta + alfa + beta + resto 30–40 Hz = 1 (cada bin contado una vez)
    cover = sum(m.astype(int) for m in masks.values()) + rest.astype(int)
    assert (cover == 1).all(), "bands overlap or leave gaps"
    comp = float(np.abs(sum(psds[:, :, m].sum(axis=2) for m in masks.values()) / total + psds[:, :, rest].sum(axis=2) / total - 1).max())
    roi_of = np.array([ns["roi_for_channel"](c) for c in ep.ch_names])
    meta = {"n_epochs_available": available, "n_epochs_used": len(ep), "n_epochs_rejected": min(75, available) - len(ep),
            "n_bad_channels": len(info["bads"]), "n_ica_components": info["n_components"], "n_ica_removed": len(info["removed"]),
            "n_ica_ocular": info["n_ocular"], "n_ica_muscle": info["n_muscle"]}
    out = {}
    for band, m in masks.items():
        rel = psds[:, :, m].sum(axis=2) / total
        # mismos nombres de columna que theta en todas las bandas (theta_mean, theta_std, theta_power), para que los
        # constructores de la app lean cualquier banda sin cambios
        elec = [{"electrode": ch, "theta_mean": float(rel[:, j].mean()), "theta_std": float(rel[:, j].std()), "interpolated": ch in info["bads"]}
                for j, ch in enumerate(ep.ch_names)]
        rois = []
        for roi in ("frontal", "centro_temporal", "other"):
            cols = roi_of == roi
            for k, v in zip(kept, rel[:, cols].mean(axis=1)):
                rois.append({"epoch_idx": k, "roi": roi, "theta_power": float(v)})
        # potencia relativa por época y electrodo, en su posición del registro (NaN = época rechazada)
        full = np.full((ns["MAX_EPOCHS"], len(ep.ch_names)), np.nan, dtype=np.float32)
        full[[k for k in kept if k < ns["MAX_EPOCHS"]]] = rel[:len([k for k in kept if k < ns["MAX_EPOCHS"]])]
        out[band] = (elec, rois, (list(ep.ch_names), full))
    return rec["participant_id"], cond, (out, meta, comp), None


def merge(proc):
    """Notebook 03 on the new per-electrode file (same code path, same column names)."""
    import pandas as pd
    ns = E.notebook_defs()
    pe = pd.read_csv(proc / "eeg_theta_per_electrode.csv")
    pe = pe[pe["task"] == "eyesopen"].copy()
    pe["roi"] = pe["electrode"].map(ns["roi_for_channel"])
    pe = pe[pe["roi"].isin(["frontal", "centro_temporal"])]
    s = pe.groupby(["participant_id", "condition", "roi"]).agg(theta_power=("theta_mean", "mean"), theta_variability=("theta_std", "mean")).reset_index()
    w = s.pivot(index=["participant_id", "condition"], columns="roi", values=["theta_power", "theta_variability"])
    w.columns = [f"{roi}_{m}" for m, roi in w.columns]; w = w.reset_index()
    nsd, sd = w[w.condition == "NS"].drop(columns="condition"), w[w.condition == "SD"].drop(columns="condition")
    m = nsd.merge(sd, on="participant_id", suffixes=("_NS", "_SD"), how="outer")
    for c in [c for c in nsd.columns if c != "participant_id"]:
        m[f"delta_{c}"] = m[f"{c}_SD"] - m[f"{c}_NS"]
    m = m.merge(pd.read_csv(E.PROC_W6 / "behavioral_deltas.csv"), on="participant_id", how="outer")
    m.to_csv(proc / "merged_summary.csv", index=False)
    return m


def main():
    import numpy as np
    import pandas as pd
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--procs", type=int, default=7)
    ap.add_argument("--refit", action="store_true", help="fit ICA again even if it is cached")
    a = ap.parse_args()
    if not (E.DS).exists():
        raise SystemExit(f"Dataset missing at {E.REPO / 'ds004902'}: see deliveries/week06/README.md")
    ns = E.notebook_defs()
    parts = pd.read_csv(ns["PARTICIPANTS_TSV"], sep="\t")
    cond_map = ns["session_to_condition"](parts)   # ses-1 = NS, ses-2 = SD (eeg_ica.session_to_condition)
    visit = ns["visit_of"](parts)                  # visita 1 o 2 de cada condición, desde SessionOrder (diseño cruzado)
    recs = [r for r in ns["find_recordings"](E.DS) if r["task"] == "eyesopen"]
    bands = ["theta", *E.BANDS]
    acc = {b: {"elec": [], "rois": [], "ep": {}} for b in bands}
    skipped, channels, comp_max = [], None, 0.0
    jobs = []
    for r in recs:
        c = cond_map.get((r["participant_id"], r["session"]))
        if c is None:
            skipped.append((r["participant_id"], r["session"], "eyesopen", "no SessionOrder mapping"))
        else:
            jobs.append((r, c))
    with ProcessPoolExecutor(a.procs) as ex:
        futs = {ex.submit(process, r, c, a.refit): r for r, c in jobs}
        for i, f in enumerate(as_completed(futs), 1):
            r = futs[f]
            try:
                pid, c, res, why = f.result()
            except Exception as e:
                res, why = None, str(e).splitlines()[0]
            if res is None:
                skipped.append((r["participant_id"], r["session"], "eyesopen", why))
            else:
                out, meta, comp = res
                comp_max = max(comp_max, comp)
                for b, (el, ro, (chs, full)) in out.items():
                    if channels is None:
                        channels = chs
                    # cada .set guarda sus canales en su propio orden: se reordena al de la primera grabación
                    assert set(chs) == set(channels), f"different channels in {pid} {c}"
                    acc[b]["ep"][f"{pid}|{c}"] = full[:, [chs.index(ch) for ch in channels]]
                    for d in el:
                        acc[b]["elec"].append({**d, "participant_id": pid, "condition": c, "visit": visit.get((pid, c)), "task": "eyesopen", **meta})
                    for d in ro:
                        acc[b]["rois"].append({**d, "participant_id": pid, "condition": c, "visit": visit.get((pid, c)), "task": "eyesopen"})
            if i % 20 == 0 or i == len(jobs):
                print(f"  {i}/{len(jobs)} recordings", flush=True)
    sk = pd.DataFrame(skipped, columns=["participant_id", "session", "task", "reason"])
    # theta en processed_ica/ (como siempre); delta, alfa y beta en processed_ica/bands/<banda>/, con los mismos archivos
    for b in bands:
        folder = E.PROC_ICA if b == "theta" else E.PROC_BANDS / b
        folder.mkdir(parents=True, exist_ok=True)
        pe_b = pd.DataFrame(acc[b]["elec"]).sort_values(["participant_id", "condition", "electrode"])
        pe_b.to_csv(folder / "eeg_theta_per_electrode.csv", index=False)
        pd.DataFrame(acc[b]["rois"]).sort_values(["participant_id", "condition", "roi", "epoch_idx"]).to_csv(folder / "eeg_theta_epochs_roi.csv", index=False)
        sk.to_csv(folder / "eeg_pipeline_skipped.csv", index=False)
        np.savez_compressed(folder / "eeg_theta_epochs_electrode.npz", channels=np.array(channels), **acc[b]["ep"])
        if b != "theta":
            merge(folder)
    print(f"bands: {', '.join(bands)}; composition check (bands + 30–40 Hz rest = 1): max deviation {comp_max:.1e}")
    pe = pd.DataFrame(acc["theta"]["elec"]).sort_values(["participant_id", "condition", "electrode"])
    m = merge(E.PROC_ICA)
    r = pe.drop_duplicates(["participant_id", "condition"])
    print(f"\n{len(r)} recordings, {len(skipped)} skipped; ICA components removed: mean {r.n_ica_removed.mean():.2f} "
          f"(ocular {r.n_ica_ocular.mean():.2f}, muscle {r.n_ica_muscle.mean():.2f}); epochs kept: mean {r.n_epochs_used.mean():.1f} of 75; "
          f"{m.dropna(subset=['delta_frontal_theta_variability']).shape[0]} people with both conditions")


if __name__ == "__main__":
    main()
