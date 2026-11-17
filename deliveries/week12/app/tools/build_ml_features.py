"""Fase ML2 de PLAN.md: tabla de features por registro (persona × condición) para clasificar NS vs. SD.

Investigación de respaldo: research/ml_xai.md. Decisiones de ML0 (16 nov 2026): TSFEL, un registro por muestra (136),
features en 3 regiones (frontal, centro-temporal y el resto), agregadas como media y DE entre épocas.

Dos familias de features:
1. TSFEL (Barandas et al., 2020) sobre la señal promedio de cada región en cada época de 4 s, ya limpia con el pipeline
   principal (tools/eeg_ica.py: referencia promedio + ICA en caché, rechazo > 200 µV) y remuestreada a 125 Hz (el
   filtro ya corta en 40 Hz). Subconjunto interpretable: 16 features espectrales en Hz y 4 estadísticas (DE, curtosis,
   asimetría, rango intercuartílico). Se dejan fuera las pensadas para audio o voz (MFCC, LPCC, Human range energy,
   Fundamental frequency) y las de wavelet (una columna por escala). Por registro: media y DE entre épocas.
2. Del proyecto (línea base interpretable; no se recalculan): σ y μ de la potencia relativa de cada banda por región
   (media de los electrodos, como en build_multiverse.py), desde data/processed_ica y data/processed_ica/bands; μ sin
   beta porque las potencias relativas son composicionales (con las cuatro serían casi colineales); exponente y offset
   aperiódicos por región desde data/aperiodic.json (specparam, build_secondary.py).

La condición sale SIEMPRE de la carpeta (ses-1 = NS, ses-2 = SD; eeg_ica.session_to_condition), nunca del orden de
visita. La visita (1 o 2) y el orden se guardan aparte para los controles de confusión de ML3.

Salidas (no se versionan; la tabla depende del EEG crudo):
  <ds004902>/derivatives/batimix-ml/features.csv      participant_id, condition, visit, order, <features>
  <ds004902>/derivatives/batimix-ml/features_dict.json  nombre legible, familia, dominio, región, banda, agregado, unidad
  <ds004902>/derivatives/batimix-ml/epochs/*.npz        features TSFEL por época (caché; --refresh la rehace)
Uso (desde deliveries/week12/app/):  python3 tools/build_ml_features.py [--procs 6] [--refresh]
"""
import argparse, csv, json, sys
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import eeg_ica as E  # noqa: E402

APP = HERE.parent
OUT = E.DS / "derivatives" / "batimix-ml"
FS = 125
KEEP_SPEC = ["Max power spectrum", "Maximum frequency", "Median frequency", "Power bandwidth", "Spectral centroid", "Spectral decrease",
             "Spectral distance", "Spectral entropy", "Spectral kurtosis", "Spectral positive turning points", "Spectral roll-off",
             "Spectral roll-on", "Spectral skewness", "Spectral slope", "Spectral spread", "Spectral variation"]
KEEP_STAT = ["Standard deviation", "Kurtosis", "Skewness", "Interquartile range"]
# dependen de la escala absoluta del amplificador o de la persona: en el escenario estricto (entre personas) se excluyen
SCALE_DEP = {"Max power spectrum", "Spectral distance", "Spectral slope", "Standard deviation", "Interquartile range"}
UNIT = {"Maximum frequency": "Hz", "Median frequency": "Hz", "Power bandwidth": "Hz", "Spectral centroid": "Hz", "Spectral roll-off": "Hz",
        "Spectral roll-on": "Hz", "Spectral spread": "Hz", "Standard deviation": "V", "Interquartile range": "V", "Max power spectrum": "V²/Hz"}
ROIS = ["front", "ct", "post"]
ROI_NAME = {"front": "frontal", "ct": "centrotemporal", "post": "posterior"}
BAND_SYM = {"delta": "δ", "theta": "θ", "alpha": "α", "beta": "β"}


def roi_members(ns, chans):
    fr, ct = list(ns["FRONTAL_ROI"]), list(ns["CENTROTEMPORAL_ROI"])
    return {"front": [c for c in fr if c in chans], "ct": [c for c in ct if c in chans],
            "post": [c for c in chans if c not in fr and c not in ct and c != "FCz"]}


def tsfel_cfg():
    import tsfel
    full = tsfel.get_features_by_domain()
    return {"spectral": {k: v for k, v in full["spectral"].items() if k in KEEP_SPEC},
            "statistical": {k: v for k, v in full["statistical"].items() if k in KEEP_STAT}}


def process(rec, cond, refresh):
    """TSFEL por época y región de una grabación; guarda una matriz épocas × (región × feature) en la caché."""
    E._single_thread()
    import numpy as np
    import tsfel
    import mne
    mne.set_log_level("ERROR")
    out = OUT / "epochs" / f"{rec['participant_id']}_{cond}.npz"
    if out.exists() and not refresh:
        return rec["participant_id"], cond, "en caché"
    ns = E.notebook_defs()
    raw, _ = E.clean_raw(rec, ns)
    ep, kept, _ = E.clean_epochs(raw, ns, drop_fcz=True)
    ep = ep.copy().resample(FS, verbose=False)
    X = ep.get_data()                          # épocas × canales × muestras (V)
    R = roi_members(ns, ep.ch_names)
    cfg = tsfel_cfg(); names = None; M = []
    for x in X:
        row = []
        for roi in ROIS:
            sig = x[[ep.ch_names.index(c) for c in R[roi]]].mean(axis=0)
            df = tsfel.calc_window_features(cfg, sig, fs=FS)
            if names is None:
                names = [c.split("_", 1)[1] for c in df.columns]
            row.extend(df.values[0].tolist())
        M.append(row)
    out.parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(out, M=np.array(M, float), names=np.array(names), kept=np.array(kept))
    return rec["participant_id"], cond, f"{len(M)} épocas"


def project_features(ids):
    """σ y μ por banda y región (desde los CSV por electrodo) y exponente/offset aperiódicos por región."""
    import numpy as np
    out = {}
    elecs_all = None
    for band in ("delta", "theta", "alpha", "beta"):
        f = (E.PROC_ICA if band == "theta" else E.PROC_BANDS / band) / "eeg_theta_per_electrode.csv"
        per = {}
        with open(f, newline="", encoding="utf-8") as fh:
            for r in csv.DictReader(fh):
                if r["task"] == "eyesopen":
                    per.setdefault((r["participant_id"], r["condition"]), {})[r["electrode"]] = (float(r["theta_mean"]), float(r["theta_std"]))
        for key, em in per.items():
            elecs_all = elecs_all or sorted(em)
            ns_dummy = {"FRONTAL_ROI": FRONTAL, "CENTROTEMPORAL_ROI": CENTROTEMPORAL}
            R = roi_members(ns_dummy, list(em))
            for roi in ROIS:
                vals = [em[e] for e in R[roi]]
                out.setdefault(key, {})[f"sig_{band}_{roi}"] = float(np.mean([v[1] for v in vals]))
                if band != "beta":
                    out[key][f"mu_{band}_{roi}"] = float(np.mean([v[0] for v in vals]))
    A = json.loads((APP / "data" / "aperiodic.json").read_text(encoding="utf-8"))
    el = A["meta"]["electrodes"]
    R = roi_members({"FRONTAL_ROI": FRONTAL, "CENTROTEMPORAL_ROI": CENTROTEMPORAL}, el)
    for pid, v in A["persons"].items():
        for ci, cond in enumerate(("NS", "SD")):
            for k, lab in (("exp", "exponent"), ("off", "offset")):
                for roi in ROIS:
                    xs = [v[k][ci][el.index(e)] for e in R[roi] if v[k][ci][el.index(e)] is not None]
                    out.setdefault((pid, cond), {})[f"ap_{lab}_{roi}"] = float(np.mean(xs)) if xs else float("nan")
    return out


def describe(col):
    """Diccionario legible de una columna."""
    if col.startswith(("sig_", "mu_")):
        kind, band, roi = col.split("_")
        sym = BAND_SYM[band]
        return {"label": f"{'σ' if kind == 'sig' else 'μ'}{sym} {ROI_NAME[roi]}", "family": "project", "domain": "band power",
                "roi": roi, "band": band, "agg": "SD across epochs" if kind == "sig" else "mean across epochs", "unit": "relative power", "scale_dependent": False}
    if col.startswith("ap_"):
        _, lab, roi = col.split("_")
        return {"label": f"1/f {lab} {ROI_NAME[roi]}", "family": "project", "domain": "aperiodic", "roi": roi, "band": None,
                "agg": "per recording", "unit": "a.u." if lab == "exponent" else "log10 power", "scale_dependent": lab == "offset"}
    roi, agg, name = col.split("|")
    dom = "spectral" if name in KEEP_SPEC else "statistical"
    return {"label": f"{name} {ROI_NAME[roi]}" + (" (SD across epochs)" if agg == "sd" else ""), "family": "tsfel", "domain": dom,
            "roi": roi, "band": None, "agg": "SD across epochs" if agg == "sd" else "mean across epochs",
            "unit": UNIT.get(name, "a.u."), "scale_dependent": name in SCALE_DEP}


FRONTAL = CENTROTEMPORAL = None


def main():
    global FRONTAL, CENTROTEMPORAL
    import numpy as np
    import pandas as pd
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--procs", type=int, default=6)
    ap.add_argument("--refresh", action="store_true", help="recalcular TSFEL aunque esté en caché")
    a = ap.parse_args()
    if not E.DS.exists():
        raise SystemExit(f"Falta el dataset en {E.DS}")
    ns = E.notebook_defs()
    FRONTAL, CENTROTEMPORAL = list(ns["FRONTAL_ROI"]), list(ns["CENTROTEMPORAL_ROI"])
    parts = pd.read_csv(ns["PARTICIPANTS_TSV"], sep="\t")
    cond_map = ns["session_to_condition"](parts)
    visit = ns["visit_of"](parts)
    order = {r["participant_id"]: str(r["SessionOrder"]).replace(" ", "") for _, r in parts.iterrows()}
    jobs = [(r, cond_map[(r["participant_id"], r["session"])]) for r in ns["find_recordings"](E.DS)
            if r["task"] == "eyesopen" and (r["participant_id"], r["session"]) in cond_map]
    with ProcessPoolExecutor(a.procs) as ex:
        futs = {ex.submit(process, r, c, a.refresh): (r["participant_id"], c) for r, c in jobs}
        for i, f in enumerate(as_completed(futs), 1):
            pid, c = futs[f]
            try:
                f.result()
            except Exception as e:
                print(f"  omitida {pid} {c}: {str(e).splitlines()[0][:90]}", flush=True)
            if i % 20 == 0 or i == len(jobs):
                print(f"  {i}/{len(jobs)} grabaciones", flush=True)
    # tabla por registro: solo personas con los dos registros (EEG pareado, como el resto de la app)
    T = {}
    for f in (OUT / "epochs").glob("*.npz"):
        pid, cond = f.stem.rsplit("_", 1)
        z = np.load(f); M, names = z["M"], list(z["names"])
        nf = len(names); row = {}
        for k, roi in enumerate(ROIS):
            blk = M[:, k * nf:(k + 1) * nf]
            for j, nm in enumerate(names):
                row[f"{roi}|mean|{nm}"] = float(np.nanmean(blk[:, j]))
                row[f"{roi}|sd|{nm}"] = float(np.nanstd(blk[:, j], ddof=1))
        row["n_epochs"] = int(len(M))
        T[(pid, cond)] = row
    P = project_features(None)
    ids = sorted(p for p in {k[0] for k in T} if (p, "NS") in T and (p, "SD") in T and (p, "NS") in P and (p, "SD") in P)
    rows = []
    for pid in ids:
        for cond in ("NS", "SD"):
            rows.append({"participant_id": pid, "condition": cond, "visit": visit.get((pid, cond)), "order": order.get(pid),
                         **T[(pid, cond)], **P[(pid, cond)]})
    df = pd.DataFrame(rows)
    feat = [c for c in df.columns if c not in ("participant_id", "condition", "visit", "order", "n_epochs")]
    # verificación (ML2): 136 filas, sin features constantes, y σθ/μθ frontal iguales a participants_eeg.json (ΔSD − NS)
    const = [c for c in feat if df[c].nunique(dropna=True) <= 1]
    PE = {r["id"]: r for r in json.loads((APP / "data" / "participants.json").read_text(encoding="utf-8"))}
    g, d = [], df.set_index(["participant_id", "condition"])
    for pid in ids:
        for k, col in (("d_front_var", "sig_theta_front"), ("d_front_pow", "mu_theta_front")):
            ref = PE.get(pid, {}).get(k)
            if ref is not None:
                g.append(abs((d.loc[(pid, "SD"), col] - d.loc[(pid, "NS"), col]) - ref))
    gap = max(g) if g else None
    OUT.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUT / "features.csv", index=False)
    (OUT / "features_dict.json").write_text(json.dumps({c: describe(c) for c in feat}, ensure_ascii=False, indent=1), encoding="utf-8")
    nts = sum(1 for c in feat if "|" in c)
    print(f"{len(df)} registros ({len(ids)} personas), {len(feat)} features ({nts} TSFEL, {len(feat) - nts} del proyecto); "
          f"constantes: {const or 'ninguna'}; NaN: {int(df[feat].isna().sum().sum())}")
    print(f"control Δσθ y Δμθ frontal frente a participants: máx |dif| = {gap:.1e}" if gap is not None else "sin control (falta participants)")
    print(f"visitas: {df.groupby(['condition', 'visit']).size().to_dict()}")
    print(f"salida: {OUT / 'features.csv'}")


if __name__ == "__main__":
    main()
