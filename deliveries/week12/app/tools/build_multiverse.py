"""Genera data/multiverse.json: análisis de multiverso (curva de especificación) de la
asociación entre el cambio theta (SD - NS) y el cambio conductual.

Fuentes (salidas de la Semana 6, no se reprocesa EEG crudo):
  deliveries/week06/data/processed/eeg_theta_per_electrode.csv  (μθ y σθ por electrodo, sujeto y condición)
  deliveries/week06/data/processed/behavioral_deltas.csv        (Δ conductuales SD - NS)

Decisiones analíticas que forman el multiverso (todas defendibles a priori):
  región       frontal (16) | centro-temporal (28) | posterior (17) | global (61)
  métrica      σθ variabilidad entre épocas | μθ media
  cambio       absoluto (SD - NS) | relativo ((SD - NS) / NS)
  marcador     PVT mediana TR | PVT lapsos | PVT DE del TR | KSS | SSS | PANAS+ | PANAS-
  correlación  Spearman | Pearson
  atípicos     todos | excluir |z| > 2.5 en x o en y
  => 4 x 2 x 2 x 7 x 2 x 2 = 448 especificaciones.

Todos los marcadores se orientan a "deterioro" (PANAS+ cambia de signo), así la hipótesis
de Cui et al. (2026) predice r > 0 en todas las especificaciones.

Inferencia conjunta (Simonsohn, Simmons y Nelson, 2020): se permutan las filas conductuales
entre los sujetos con EEG pareado (se conserva la dependencia entre marcadores y entre
especificaciones), se recalcula el multiverso completo y se comparan tres estadísticos con su
distribución nula: mediana de r, número de especificaciones significativas en la dirección
predicha y Z de Stouffer.

Uso (desde deliveries/week12/app/):  python tools/build_multiverse.py [--perms 2000]
"""
import argparse, csv, json, math, os
from pathlib import Path
import numpy as np
from scipy import stats


def longpath(p):
    # Windows sin rutas largas habilitadas falla sobre 260 caracteres: el prefijo \\?\ lo evita
    p = Path(p).resolve()
    return Path("\\\\?\\" + str(p)) if os.name == "nt" and not str(p).startswith("\\\\?\\") else p


HERE = longpath(Path(__file__).parent)
APP = HERE.parent
W6 = APP.parent.parent / "week06" / "data" / "processed"

FRONTAL = ["Fp1", "Fp2", "Fpz", "AF3", "AF4", "AF7", "AF8", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "Fz"]
CENTROTEMPORAL = ["FC1", "FC2", "FC3", "FC4", "FC5", "FC6", "FT7", "FT8", "C1", "C2", "C3", "C4", "C5", "C6", "Cz", "T7", "T8",
                  "CP1", "CP2", "CP3", "CP4", "CP5", "CP6", "CPz", "TP7", "TP8", "TP9", "TP10"]

MARKERS = [  # clave, columna, signo para orientar a deterioro, etiqueta
    ("pvt_rt", "delta_PVT_medianRT", 1, "PVT · mediana TR"),
    ("pvt_lapses", "delta_PVT_lapses", 1, "PVT · lapsos"),
    ("pvt_sd", "delta_PVT_sdRT", 1, "PVT · DE del TR"),
    ("kss", "delta_KSS", 1, "KSS"),
    ("sss", "delta_SSS", 1, "SSS"),
    ("panasP", "delta_PANAS_P", -1, "PANAS+ (invertido)"),
    ("panasN", "delta_PANAS_N", 1, "PANAS−"),
]
DIMS = {
    "roi": [("front", "frontal"), ("ct", "centro-temporal"), ("post", "posterior"), ("all", "global")],
    "met": [("var", "σθ variabilidad"), ("mean", "μθ media")],
    "delta": [("abs", "absoluto"), ("rel", "relativo")],
    "marker": [(k, lab) for k, _, _, lab in MARKERS],
    "corr": [("spearman", "Spearman"), ("pearson", "Pearson")],
    "out": [("all", "todos"), ("z25", "sin |z| > 2.5")],
}
DIM_LABEL = {"roi": "Región", "met": "Métrica", "delta": "Cambio", "marker": "Marcador", "corr": "Correlación", "out": "Atípicos"}


def fnum(s):
    try:
        v = float(s)
        return v if math.isfinite(v) else None
    except (TypeError, ValueError):
        return None


def load_eeg():
    """{sujeto: {cond: {electrodo: (media, sd)}}} solo ojos abiertos."""
    out = {}
    with open(W6 / "eeg_theta_per_electrode.csv", newline="", encoding="utf-8") as fh:
        for r in csv.DictReader(fh):
            if r["task"] != "eyesopen":
                continue
            out.setdefault(r["participant_id"], {}).setdefault(r["condition"], {})[r["electrode"]] = (fnum(r["theta_mean"]), fnum(r["theta_std"]))
    return out


def load_beh():
    with open(W6 / "behavioral_deltas.csv", newline="", encoding="utf-8") as fh:
        return {r["participant_id"]: r for r in csv.DictReader(fh)}


def roi_value(cond_map, elecs, which):
    vals = [cond_map[e][which] for e in elecs if e in cond_map and cond_map[e][which] is not None]
    return float(np.mean(vals)) if vals else None


def build_x(eeg, subjects, all_elecs):
    rois = {"front": FRONTAL, "ct": CENTROTEMPORAL, "post": [e for e in all_elecs if e not in FRONTAL and e not in CENTROTEMPORAL], "all": all_elecs}
    X = {}
    for roi, elecs in rois.items():
        for met, idx in (("mean", 0), ("var", 1)):
            ns = np.array([roi_value(eeg[s]["NS"], elecs, idx) for s in subjects], float)
            sd = np.array([roi_value(eeg[s]["SD"], elecs, idx) for s in subjects], float)
            X[(roi, met, "abs")] = sd - ns
            X[(roi, met, "rel")] = (sd - ns) / ns
    return X, rois


def corr(x, y, kind):
    """r, p bilateral, IC 95 % (Fisher; Bonett y Wright para Spearman)."""
    n = len(x)
    if n < 6:
        return None
    if kind == "spearman":
        r, p = stats.spearmanr(x, y)
        se = math.sqrt((1 + r * r / 2) / (n - 3))
    else:
        r, p = stats.pearsonr(x, y)
        se = 1 / math.sqrt(n - 3)
    z = math.atanh(max(-0.999999, min(0.999999, r)))
    return float(r), float(p), math.tanh(z - 1.96 * se), math.tanh(z + 1.96 * se)


def spec_rows(X, Y, specs):
    res = []
    for sp in specs:
        x = X[(sp["roi"], sp["met"], sp["delta"])]
        y = Y[sp["marker"]]
        ok = np.isfinite(x) & np.isfinite(y)
        if sp["out"] == "z25" and ok.sum() > 3:
            zx = (x - x[ok].mean()) / x[ok].std(ddof=1)
            zy = (y - y[ok].mean()) / y[ok].std(ddof=1)
            ok = ok & (np.abs(zx) <= 2.5) & (np.abs(zy) <= 2.5)
        c = corr(x[ok], y[ok], sp["corr"])
        res.append((c, int(ok.sum())))
    return res


def joint_stats(rows):
    rs = np.array([c[0] for c, _ in rows])
    ps = np.array([c[1] for c, _ in rows])
    sig_pos = int(np.sum((ps < 0.05) & (rs > 0)))
    p_one = np.where(rs > 0, ps / 2, 1 - ps / 2)                  # unilateral en la dirección predicha
    zs = stats.norm.isf(np.clip(p_one, 1e-12, 1 - 1e-12))
    return float(np.median(rs)), sig_pos, float(zs.sum() / math.sqrt(len(zs))), rs


def main():
    if hasattr(__import__("sys").stdout, "reconfigure"): __import__("sys").stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--perms", type=int, default=2000)
    ap.add_argument("--seed", type=int, default=20261028)
    a = ap.parse_args()

    eeg, beh = load_eeg(), load_beh()
    subjects = sorted(s for s in eeg if "NS" in eeg[s] and "SD" in eeg[s])
    all_elecs = sorted(set(eeg[subjects[0]]["NS"]) & set(eeg[subjects[0]]["SD"]))
    X, rois = build_x(eeg, subjects, all_elecs)
    Y = {k: np.array([(fnum(beh.get(s, {}).get(col)) if fnum(beh.get(s, {}).get(col)) is not None else np.nan) * sign for s in subjects], float)
         for k, col, sign, _ in MARKERS}

    # control de consistencia: Δσθ frontal recalculado frente a merged_summary.csv
    with open(W6 / "merged_summary.csv", newline="", encoding="utf-8") as fh:
        ms = {r["participant_id"]: fnum(r["delta_frontal_theta_variability"]) for r in csv.DictReader(fh)}
    ref = np.array([ms.get(s) if ms.get(s) is not None else np.nan for s in subjects])
    gap = float(np.nanmax(np.abs(ref - X[("front", "var", "abs")])))

    specs = [dict(roi=r, met=m, delta=d, marker=k, corr=c, out=o)
             for r, _ in DIMS["roi"] for m, _ in DIMS["met"] for d, _ in DIMS["delta"]
             for k, _ in DIMS["marker"] for c, _ in DIMS["corr"] for o, _ in DIMS["out"]]
    obs = spec_rows(X, Y, specs)
    med, nsig, stouffer, rs = joint_stats(obs)
    # prueba conjunta principal solo con σθ (la hipótesis central; Simonsohn et al. recomiendan no mezclar
    # medidas no equivalentes en el estadístico conjunto): mismas permutaciones, subconjunto de especificaciones
    vmask = [i for i, sp in enumerate(specs) if sp["met"] == "var"]
    med_v, nsig_v, stouffer_v, _ = joint_stats([obs[i] for i in vmask])

    rng = np.random.default_rng(a.seed)
    null_sorted, null_med, null_sig, null_z = [], [], [], []
    nv_med, nv_sig, nv_z = [], [], []
    for _ in range(a.perms):
        perm = rng.permutation(len(subjects))
        Yp = {k: v[perm] for k, v in Y.items()}
        rows_p = spec_rows(X, Yp, specs)
        m_, s_, z_, r_ = joint_stats(rows_p)
        null_med.append(m_); null_sig.append(s_); null_z.append(z_); null_sorted.append(np.sort(r_))
        mv_, sv_, zv_, _ = joint_stats([rows_p[i] for i in vmask])
        nv_med.append(mv_); nv_sig.append(sv_); nv_z.append(zv_)
    null_sorted = np.array(null_sorted)
    band = np.percentile(null_sorted, [2.5, 50, 97.5], axis=0)
    pv = lambda obs_v, null_v: (1 + int(np.sum(np.array(null_v) >= obs_v))) / (1 + a.perms)
    q3 = lambda v, d: [round(float(x), d) for x in np.percentile(v, [2.5, 50, 97.5])]   # IC 95 % nulo y mediana

    out_specs = []
    for sp, (c, n) in zip(specs, obs):
        r, p, lo, hi = c
        out_specs.append({**sp, "r": round(r, 4), "p": round(p, 5), "lo": round(lo, 4), "hi": round(hi, 4), "n": n})
    order = np.argsort([s["r"] for s in out_specs], kind="stable")

    payload = {
        "meta": {
            "source": "deliveries/week06/data/processed (eeg_theta_per_electrode.csv, behavioral_deltas.csv), ojos abiertos",
            "nSubjectsEEG": len(subjects), "nSpecs": len(specs), "perms": a.perms, "seed": a.seed,
            "checkMaxAbsDiffFrontVar": gap,
            "hypothesis": "Cui et al. (2026): mayor aumento de theta se asocia a mayor deterioro (r > 0)",
            "rois": {k: len(v) for k, v in rois.items()},
        },
        "dims": [{"key": k, "label": DIM_LABEL[k], "opts": [{"key": o, "label": lab} for o, lab in v]} for k, v in DIMS.items()],
        "specs": [out_specs[i] for i in order],
        "nullBand": {"lo": [round(v, 4) for v in band[0]], "mid": [round(v, 4) for v in band[1]], "hi": [round(v, 4) for v in band[2]]},
        "joint": {
            "median": {"obs": round(med, 4), "p": pv(med, null_med), "null": q3(null_med, 4)},
            "sigPos": {"obs": nsig, "p": pv(nsig, null_sig), "null": q3(null_sig, 1)},
            "stouffer": {"obs": round(stouffer, 3), "p": pv(stouffer, null_z), "null": q3(null_z, 3)},
        },
        "jointVar": {
            "nSpecs": len(vmask),
            "median": {"obs": round(med_v, 4), "p": pv(med_v, nv_med), "null": q3(nv_med, 4)},
            "sigPos": {"obs": nsig_v, "p": pv(nsig_v, nv_sig), "null": q3(nv_sig, 1)},
            "stouffer": {"obs": round(stouffer_v, 3), "p": pv(stouffer_v, nv_z), "null": q3(nv_z, 3)},
        },
        "subjects": subjects,
        "x": {f"{r}|{m}|{d}": [None if not np.isfinite(v) else round(float(v), 6) for v in X[(r, m, d)]] for (r, m, d) in X},
        "y": {k: [None if not np.isfinite(v) else round(float(v), 4) for v in Y[k]] for k in Y},
    }
    (APP / "data" / "multiverse.json").write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{len(subjects)} sujetos, {len(specs)} especificaciones, {a.perms} permutaciones")
    print(f"control Δσθ frontal vs merged_summary: máx |dif| = {gap:.2e}")
    print(f"mediana r = {med:+.3f} (p = {payload['joint']['median']['p']:.3f}); "
          f"significativas en dirección predicha = {nsig}/{len(specs)} (p = {payload['joint']['sigPos']['p']:.3f}); "
          f"Stouffer Z = {stouffer:+.2f} (p = {payload['joint']['stouffer']['p']:.3f})")
    jv = payload["jointVar"]
    print(f"solo σθ ({len(vmask)}): mediana r = {med_v:+.3f} (p = {jv['median']['p']:.3f}); significativas = {nsig_v} (p = {jv['sigPos']['p']:.3f}); "
          f"Stouffer Z = {stouffer_v:+.2f} (p = {jv['stouffer']['p']:.3f})")
    print(f"r mín/máx = {min(s['r'] for s in out_specs):+.3f} / {max(s['r'] for s in out_specs):+.3f}")


if __name__ == "__main__":
    main()
