"""Shared EEG cleaning for BATIMIX (main pipeline since November 2026): notebook 02 plus average reference and ICA.

Steps, per eyes-open recording of ds004902:
  1. notebook 02 as it is: 50 Hz notch, 1–40 Hz band-pass, bad channels by log-variance |z| > 3, spherical-spline
     interpolation (if fewer than 20 % of channels are bad);
  2. FCz (the recording reference, absent from the files) re-inserted and average reference; FCz is placed halfway
     between Fz and Cz on the sphere so that ICLabel can use it; it is dropped from the outputs (61 electrodes, as before);
  3. extended Infomax ICA with 30 components (seed 97; keeping 99 % of the variance, as Cui et al., left only 9
     components in recordings dominated by large blinks, too few to isolate them). Removed components: ocular, those whose correlation
     with Fp1 or Fp2 is an outlier within the recording (MNE find_bads_eog, adaptive z > 3; ds004902 has no EOG channel)
     or labeled "eye blink" by ICLabel with p > 0.85, and muscle, ICLabel "muscle artifact" with p > 0.85. ICA with
     average reference and ICLabel as in Snipes et al. (2022); ICA with average reference in Lian et al. (2023), Ma et
     al. (2023) and Cui et al. (2026, on this dataset). A fixed |r| > 0.85 rule (Cui et al.) missed the ocular component
     in 10 of 139 recordings, so the adaptive rule is used;
  4. channels that still exceed 200 µV peak-to-peak in more than half of the 4-s epochs after ICA are interpolated
     (a bad channel missed by the variance rule, e.g. P6 in sub-70 NS), then the average reference is recomputed;
  5. 4-s epochs, the first 75, and epochs with a peak-to-peak amplitude > 200 µV rejected (their index is kept, so the
     time axis of the five-minute view stays aligned).

The fitted ICA of each recording is cached in <root>/ds004902/derivatives/batimix-ica/ (not versioned) so that every
builder applies exactly the same decomposition.
"""
import json
import os
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[3]
NB = REPO / "deliveries" / "week06" / "code" / "02_eeg_pipeline.ipynb"
CACHE = REPO / "ds004902" / "derivatives" / "batimix-ica"
PROC_ICA = REPO / "deliveries" / "week12" / "data" / "processed_ica"     # main pipeline (ICA)
PROC_W6 = REPO / "deliveries" / "week06" / "data" / "processed"          # Week 6 pipeline (no ICA), robustness
N_COMP, EOG_Z, ICL_P, REJECT_UV, SEED, BAD_FRAC = 30, 3.0, 0.85, 200.0, 97, 0.5
RULE = "v3, 30 components: ocular = MNE adaptive z > 3 on Fp1/Fp2 or ICLabel eye p > 0.85; muscle = ICLabel p > 0.85"
PIPELINE = {"band": [1.0, 40.0], "notch": 50.0, "reference": "average (FCz re-inserted)",
            "ica": "extended Infomax, 30 components, seed 97",
            "post_ica_bad_channels": "> 200 µV peak-to-peak in more than half of the epochs, interpolated",
            "ocular": "correlation with Fp1 or Fp2 an outlier (MNE find_bads_eog, adaptive z > 3) or ICLabel eye blink p > 0.85",
            "muscle": "ICLabel muscle artifact p > 0.85", "epochs": "75 x 4 s", "reject_peak_to_peak_uv": REJECT_UV}


def notebook_defs():
    cells = ["".join(c["source"]) for c in json.loads(NB.read_text(encoding="utf-8"))["cells"] if c["cell_type"] == "code"]
    ns = {"__name__": "nb02"}; cwd = os.getcwd(); os.chdir(NB.parent)
    try:
        import contextlib, io
        with contextlib.redirect_stdout(io.StringIO()):
            for i in (0, 1, 2, 3):
                exec(cells[i], ns)
    finally:
        os.chdir(cwd)
    return ns


def _single_thread():
    for v in ("OMP_NUM_THREADS", "OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS", "VECLIB_MAXIMUM_THREADS"):
        os.environ.setdefault(v, "1")


def preprocess(rec, ns):
    """Notebook 02 steps up to interpolation, then FCz and average reference. Returns (raw, bads)."""
    import mne
    import numpy as np
    raw = mne.io.read_raw_eeglab(rec["set_path"], preload=True, verbose=False)
    montage = ns["build_montage"](rec["electrodes_tsv"])
    if montage is not None:
        raw.set_montage(montage, on_missing="ignore", verbose=False)
    raw.notch_filter(50.0, verbose=False)
    raw.filter(*ns["BAND_FULL"], verbose=False)
    bads = ns["detect_bad_channels"](raw)
    if bads and montage is not None and len(bads) < 0.2 * len(raw.ch_names):
        raw.info["bads"] = bads
        raw.interpolate_bads(reset_bads=True, verbose=False)
    mne.add_reference_channels(raw, "FCz", copy=False)
    pos = {ch["ch_name"]: ch["loc"][:3] for ch in raw.info["chs"]}
    mid = (pos["Fz"] + pos["Cz"]) / 2
    raw.info["chs"][raw.ch_names.index("FCz")]["loc"][:3] = mid / np.linalg.norm(mid) * np.linalg.norm(pos["Cz"])
    raw.set_eeg_reference("average", projection=False, verbose=False)
    return raw, bads


def _rule_of(ica):
    try:
        return json.loads(ica.info.get("description") or "{}").get("rule")
    except ValueError:
        return None


def fit_ica(raw, key, refit=False):
    """Fits (or loads from the cache) the ICA of one recording and marks the components to remove.
    The fit is reused if it exists; the selection is redone if the cached one used another rule."""
    import mne
    from mne.preprocessing import ICA
    f = CACHE / f"{key}-ica.fif"
    if f.exists() and not refit:
        ica = mne.preprocessing.read_ica(f, verbose=False)
        if _rule_of(ica) == RULE:
            return ica
    else:
        ica = ICA(n_components=N_COMP, method="infomax", fit_params=dict(extended=True), random_state=SEED, max_iter="auto")
        ica.fit(raw, verbose=False)
    from mne_icalabel import label_components
    idx, _ = ica.find_bads_eog(raw, ch_name=["Fp1", "Fp2"], measure="zscore", threshold=EOG_Z, verbose=False)
    lab = label_components(raw, ica, method="iclabel")
    pairs = list(zip(lab["labels"], lab["y_pred_proba"]))
    eog = {int(i) for i in idx} | {i for i, (l, p) in enumerate(pairs) if l == "eye blink" and p > ICL_P}
    muscle = {i for i, (l, p) in enumerate(pairs) if l == "muscle artifact" and p > ICL_P}
    ica.exclude = sorted(eog | muscle)
    ica.info["description"] = json.dumps({"rule": RULE, "ocular": sorted(eog), "muscle": sorted(muscle - eog)})
    CACHE.mkdir(parents=True, exist_ok=True)
    ica.save(f, overwrite=True, verbose=False)
    return ica


def clean_raw(rec, ns, refit=False):
    """Average-referenced, ICA-cleaned continuous EEG (FCz included). Returns (raw, info)."""
    _single_thread()
    import mne
    mne.set_log_level("ERROR")
    raw, bads = preprocess(rec, ns)
    ica = fit_ica(raw, f"{rec['participant_id']}_{rec['session']}", refit)
    try:
        kinds = json.loads(ica.info.get("description") or "{}")
    except ValueError:
        kinds = {}
    ica.apply(raw, verbose=False)
    # canales que siguen fuera de rango tras ICA (> 200 µV pico a pico en más de la mitad de las épocas)
    import numpy as np
    ep = mne.make_fixed_length_epochs(raw, duration=ns["EPOCH_DURATION_S"], preload=True, verbose=False)[: ns["MAX_EPOCHS"]]
    frac = (np.ptp(ep.get_data(), axis=2) > REJECT_UV * 1e-6).mean(axis=0)
    post = [c for c, f in zip(ep.ch_names, frac) if f > BAD_FRAC and c != "FCz"]
    if post:
        raw.info["bads"] = post
        raw.interpolate_bads(reset_bads=True, verbose=False)
        raw.set_eeg_reference("average", projection=False, verbose=False)
    return raw, {"bads": bads + post, "post_ica_bads": post, "n_components": int(ica.n_components_), "removed": list(map(int, ica.exclude)),
                 "n_ocular": len(kinds.get("ocular", [])), "n_muscle": len(kinds.get("muscle", []))}


def clean_epochs(raw, ns, drop_fcz=True):
    """First 75 4-s epochs with > 200 µV peak-to-peak rejected. Returns (epochs, kept indices, epochs available)."""
    import mne
    import numpy as np
    ep = mne.make_fixed_length_epochs(raw, duration=ns["EPOCH_DURATION_S"], preload=True, verbose=False)
    available = len(ep)
    ep = ep[: min(ns["MAX_EPOCHS"], available)]
    # rechazo por amplitud pico a pico sobre los 61 electrodos grabados (sin FCz), igual con o sin FCz en la salida
    picks = [i for i, c in enumerate(ep.ch_names) if c != "FCz"]
    ptp = np.ptp(ep.get_data()[:, picks, :], axis=2).max(axis=1)
    kept = [i for i in range(len(ep)) if ptp[i] <= REJECT_UV * 1e-6]
    ep = ep[kept]
    if drop_fcz and "FCz" in ep.ch_names:
        ep.drop_channels(["FCz"])
    return ep, kept, available
