"""Builds the EEG fields of data/participants.json and data/subject_epochs.json, and data/participants_deltas.csv.

Until November 2026 both JSON files came from Week 10 without a generator; they were derived from the Week 6
processed files exactly as done here (checked: maximum difference 1e-16). The EEG source is now the main pipeline
(average reference + ICA, tools/build_eeg_ica.py); use --proc to point to another processed folder.

  participants.json   d_front_var, d_ct_var (Δσθ), d_front_pow, d_ct_pow (Δμθ) = SD − NS of the ROI means of
                      merged_summary.csv; demographic and behavioral fields are kept as they are
  subject_epochs.json per person and condition, relative theta of each 4-s epoch averaged over the frontal (f_) and
                      centrotemporal (c_) electrodes, 75 positions, null where the epoch was rejected (4 decimals)
  electrode_epochs.json  relative theta per epoch for each electrode (× 10 000, null = rejected), from
                      eeg_theta_epochs_electrode.npz: the time view shows it when an electrode is chosen
  ../data/participants_deltas.csv  the same participants table as CSV (with PVT lapses and RT SD)

Usage (from deliveries/week12/app/):  python3 tools/build_participants.py [--proc folder]
"""
import argparse
import csv
import json
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import eeg_ica as E  # noqa: E402

DATA = Path(__file__).resolve().parent.parent / "data"
FIELDS = {"d_front_var": "delta_frontal_theta_variability", "d_ct_var": "delta_centro_temporal_theta_variability",
          "d_front_pow": "delta_frontal_theta_power", "d_ct_pow": "delta_centro_temporal_theta_power"}


def num(s):
    try:
        v = float(s)
        return v if math.isfinite(v) else None
    except (TypeError, ValueError):
        return None


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--proc", type=Path, default=E.PROC_ICA)
    a = ap.parse_args()
    with (a.proc / "merged_summary.csv").open(encoding="utf-8") as fh:
        ms = {r["participant_id"]: r for r in csv.DictReader(fh)}
    P = json.loads((DATA / "participants.json").read_text(encoding="utf-8"))
    for d in P:
        r = ms.get(d["id"], {})
        for k, col in FIELDS.items():
            d[k] = num(r.get(col))
    (DATA / "participants.json").write_text(json.dumps(P, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    ep = {}
    with (a.proc / "eeg_theta_epochs_roi.csv").open(encoding="utf-8") as fh:
        for r in csv.DictReader(fh):
            if r["task"] != "eyesopen" or r["roi"] not in ("frontal", "centro_temporal"):
                continue
            key = ("f_" if r["roi"] == "frontal" else "c_") + r["condition"]
            arr = ep.setdefault(r["participant_id"], {}).setdefault(key, [None] * 75)
            i = int(r["epoch_idx"])
            if i < 75:
                arr[i] = round(float(r["theta_power"]), 4)
    S = {d["id"]: ep.get(d["id"], {}) for d in P}
    (DATA / "subject_epochs.json").write_text(json.dumps(S, separators=(",", ":")), encoding="utf-8")
    # serie por época de cada electrodo (vista temporal con un electrodo elegido): enteros = θ relativa × 10 000
    npz = a.proc / "eeg_theta_epochs_electrode.npz"
    if npz.exists():
        import numpy as np
        Z = np.load(npz)
        chans = [str(c) for c in Z["channels"]]
        pers = {}
        for d in P:
            if d["d_front_var"] is None:
                continue
            for c in ("NS", "SD"):
                k = f"{d['id']}|{c}"
                if k in Z.files:
                    A = Z[k].T   # (electrodos, épocas)
                    pers.setdefault(d["id"], {})[c] = [[None if not np.isfinite(v) else int(round(float(v) * 10000)) for v in row] for row in A]
        (DATA / "electrode_epochs.json").write_text(json.dumps({"scale": 10000, "electrodes": chans, "persons": pers}, separators=(",", ":")), encoding="utf-8")
        print(f"electrode_epochs.json: {len(pers)} people × {len(chans)} electrodes × 75 epochs")
    M = json.loads((DATA / "multiverse.json").read_text(encoding="utf-8")) if (DATA / "multiverse.json").exists() else None
    at = {s: i for i, s in enumerate(M["subjects"])} if M else {}
    cols = ["id", "gender", "age", "order", "psqi", *FIELDS, "d_pvt", "d_kss", "d_sss", "d_panasP", "d_panasN", "d_pvt_lapses", "d_pvt_sdrt"]
    with (DATA.parent.parent / "data" / "participants_deltas.csv").open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh, lineterminator="\n"); w.writerow(cols)
        for d in P:
            i = at.get(d["id"])
            extra = {"d_pvt_lapses": M["y"]["pvt_lapses"][i] if i is not None else None, "d_pvt_sdrt": M["y"]["pvt_sd"][i] if i is not None else None}
            w.writerow(["" if (v := {**d, **extra}.get(c)) is None else v for c in cols])
    n = sum(d["d_front_var"] is not None for d in P)
    gaps = sum(v is None for s in S.values() for arr in s.values() for v in arr)
    print(f"participants.json: {n} people with EEG in both conditions; subject_epochs.json: {gaps} rejected epoch slots (null)")


if __name__ == "__main__":
    main()
