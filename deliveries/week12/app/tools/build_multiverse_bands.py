"""Multiverso por banda (fase 3 de PLAN.md, paso opcional pedido por el equipo el 16 nov 2026).

Agrega la banda (delta, theta, alfa, beta) como dimensión del multiverso de tools/build_multiverse.py, que sigue
siendo el de theta y no se toca. Mismas decisiones analíticas (región × métrica × forma del cambio × 7 marcadores ×
correlación × atípicos) y mismos marcadores orientados a deterioro. Pipelines: theta con los dos (referencia promedio
+ ICA, y FCz sin ICA de la Semana 6: 896 especificaciones, idénticas a multiverse.json); delta, alfa y beta solo con
el principal (448 cada una), porque el pipeline de la Semana 6 solo calculó theta. Total: 896 + 3 × 448 = 2240.

Inferencia conjunta (Simonsohn, Simmons y Nelson, 2020): se permutan las filas conductuales entre las personas con
EEG pareado; la MISMA permutación se aplica a todas las bandas, así que se obtiene la prueba conjunta de cada banda
y la de todo el multiverso con la dependencia entre bandas conservada. Las permutaciones se reparten entre procesos,
cada uno con su semilla derivada de --seed (resultado reproducible para el mismo --procs).

Salidas: app/data/multiverse_bands.json (resumen por banda y global, y la mediana de r por marcador) y
data/multiverse_bands_specs.csv (las 2240 especificaciones, ordenadas por r).
Uso (desde deliveries/week12/app/):  python3 tools/build_multiverse_bands.py [--perms 2000] [--procs 6]
"""
import argparse, csv, json, math, sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_multiverse as BM  # noqa: E402
import eeg_ica as E  # noqa: E402

BANDS = ["delta", "theta", "alpha", "beta"]
G = {}   # datos compartidos por los procesos (los fija init)


def folders():
    """Pipeline × banda → carpeta procesada. Theta: los dos pipelines de multiverse.json; resto: solo ICA."""
    out = {("ica", "theta"): BM.ICA, ("w6", "theta"): BM.W6}
    for b in ("delta", "alpha", "beta"):
        out[("ica", b)] = E.PROC_BANDS / b
    return out


def build():
    F = folders()
    eegs = {k: BM.load_eeg(f) for k, f in F.items()}
    beh = BM.load_beh()
    subjects = sorted(s for s in eegs[("ica", "theta")] if all("NS" in e.get(s, {}) and "SD" in e.get(s, {}) for e in eegs.values()))
    elecs = sorted(set(eegs[("ica", "theta")][subjects[0]]["NS"]) & set(eegs[("ica", "theta")][subjects[0]]["SD"]))
    X = {}
    for (pipe, band), eeg in eegs.items():
        Xb, rois = BM.build_x({pipe: eeg}, subjects, elecs)
        for (pp, r, m, d), v in Xb.items():
            X[(f"{pp}|{band}", r, m, d)] = v
    Y = {k: np.array([(BM.fnum(beh.get(s, {}).get(col)) if BM.fnum(beh.get(s, {}).get(col)) is not None else np.nan) * sign for s in subjects], float)
         for k, col, sign, _ in BM.MARKERS}
    specs = [dict(pipe=f"{pp}|{band}", band=band, roi=r, met=m, delta=d, marker=k, corr=c, out=o)
             for (pp, band) in F for r, _ in BM.DIMS["roi"] for m, _ in BM.DIMS["met"] for d, _ in BM.DIMS["delta"]
             for k, _ in BM.DIMS["marker"] for c, _ in BM.DIMS["corr"] for o, _ in BM.DIMS["out"]]
    return subjects, X, Y, specs


def subsets(specs):
    """Conjuntos de especificaciones con prueba conjunta propia: global, cada banda y cada banda solo con σ."""
    S = {"all": list(range(len(specs)))}
    for b in BANDS:
        S[b] = [i for i, sp in enumerate(specs) if sp["band"] == b]
        S[f"{b}_var"] = [i for i, sp in enumerate(specs) if sp["band"] == b and sp["met"] == "var"]
    return S


def init(X, Y, specs, S):
    G.update(X=X, Y=Y, specs=specs, S=S)


def perm_chunk(args):
    seed, n_perm, n_sub = args
    rng = np.random.default_rng(seed)
    out = {k: {"med": [], "sig": [], "z": []} for k in G["S"]}
    for _ in range(n_perm):
        perm = rng.permutation(n_sub)
        rows = BM.spec_rows(G["X"], {k: v[perm] for k, v in G["Y"].items()}, G["specs"])
        for k, idx in G["S"].items():
            m, s, z, _ = BM.joint_stats([rows[i] for i in idx])
            out[k]["med"].append(m); out[k]["sig"].append(s); out[k]["z"].append(z)
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--perms", type=int, default=2000)
    ap.add_argument("--procs", type=int, default=6)
    ap.add_argument("--seed", type=int, default=20261116)
    a = ap.parse_args()
    subjects, X, Y, specs = build()
    S = subsets(specs)
    obs = BM.spec_rows(X, Y, specs)
    observed = {k: BM.joint_stats([obs[i] for i in idx]) for k, idx in S.items()}
    # reparto de las permutaciones entre procesos, cada uno con una semilla derivada
    sizes = [a.perms // a.procs + (1 if i < a.perms % a.procs else 0) for i in range(a.procs)]
    seeds = np.random.SeedSequence(a.seed).generate_state(a.procs)
    null = {k: {"med": [], "sig": [], "z": []} for k in S}
    with ProcessPoolExecutor(a.procs, initializer=init, initargs=(X, Y, specs, S)) as ex:
        for part in ex.map(perm_chunk, [(int(sd), n, len(subjects)) for sd, n in zip(seeds, sizes) if n]):
            for k in S:
                for f in ("med", "sig", "z"):
                    null[k][f] += part[k][f]
    pv = lambda o, nv: (1 + int(np.sum(np.array(nv) >= o))) / (1 + a.perms)
    q3 = lambda v, d: [round(float(x), d) for x in np.percentile(v, [2.5, 50, 97.5])]
    summary = {}
    for k, idx in S.items():
        med, nsig, z, rs = observed[k]
        summary[k] = {"nSpecs": len(idx),
                      "median": {"obs": round(med, 4), "p": pv(med, null[k]["med"]), "null": q3(null[k]["med"], 4)},
                      "sigPos": {"obs": nsig, "p": pv(nsig, null[k]["sig"]), "null": q3(null[k]["sig"], 1)},
                      "stouffer": {"obs": round(z, 3), "p": pv(z, null[k]["z"]), "null": q3(null[k]["z"], 3)},
                      "range": [round(float(rs.min()), 3), round(float(rs.max()), 3)]}
    # mediana de r por banda y marcador (descriptiva: qué marcador acompaña a cada banda)
    by_marker = {b: {mk: round(float(np.median([obs[i][0][0] for i in S[b] if specs[i]["marker"] == mk])), 3) for mk, *_ in BM.MARKERS} for b in BANDS}
    # control: con theta, las 896 especificaciones deben ser las mismas que multiverse.json
    ref = json.loads((BM.APP / "data" / "multiverse.json").read_text(encoding="utf-8"))
    key = lambda sp: (sp["pipe"].split("|")[0], sp["roi"], sp["met"], sp["delta"], sp["marker"], sp["corr"], sp["out"])
    ref_r = {key(sp): sp["r"] for sp in ref["specs"]}
    gap = max(abs(round(obs[i][0][0], 4) - ref_r[key(specs[i])]) for i in S["theta"])
    payload = {"meta": {"source": "processed_ica (theta y bands/<banda>) y week06 processed (theta sin ICA); week06 behavioral_deltas.csv; ojos abiertos",
                        "nSubjectsEEG": len(subjects), "nSpecs": len(specs), "perms": a.perms, "procs": a.procs, "seed": a.seed,
                        "pipelines": {"theta": ["ica", "w6"], "delta": ["ica"], "alpha": ["ica"], "beta": ["ica"]},
                        "checkThetaVsMultiverseJson": gap,
                        "note": "Theta es la hipótesis confirmatoria; las demás bandas son exploratorias. La prueba conjunta global mezcla bandas y métricas no equivalentes: es descriptiva."},
               "summary": summary, "medianByMarker": by_marker}
    (BM.APP / "data" / "multiverse_bands.json").write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    order = np.argsort([obs[i][0][0] for i in range(len(specs))], kind="stable")
    with open(BM.APP.parent / "data" / "multiverse_bands_specs.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh, lineterminator="\n")
        w.writerow(["rank", "band", "pipeline", "roi", "metric", "delta", "marker", "correlation", "outliers", "r", "ci_low", "ci_high", "p", "n"])
        for rk, i in enumerate(order, 1):
            sp, (c, n) = specs[i], obs[i]
            w.writerow([rk, sp["band"], sp["pipe"].split("|")[0], sp["roi"], sp["met"], sp["delta"], sp["marker"], sp["corr"], sp["out"],
                        round(c[0], 4), round(c[2], 4), round(c[3], 4), round(c[1], 5), n])
    print(f"{len(subjects)} personas, {len(specs)} especificaciones, {a.perms} permutaciones en {a.procs} procesos")
    print(f"control theta frente a multiverse.json: máx |dif r| = {gap:.1e}")
    for k in ["all", *BANDS, *[f"{b}_var" for b in BANDS]]:
        s = summary[k]
        print(f"  {k:10s} n={s['nSpecs']:4d}  mediana r {s['median']['obs']:+.3f} (p {s['median']['p']:.3f})  "
              f"signif. {s['sigPos']['obs']:3d} (azar hasta {s['sigPos']['null'][2]:.0f}, p {s['sigPos']['p']:.3f})  "
              f"Stouffer {s['stouffer']['obs']:+.2f} (p {s['stouffer']['p']:.3f})  r {s['range'][0]:+.2f}..{s['range'][1]:+.2f}")
    print("mediana de r por marcador:", json.dumps(by_marker))


if __name__ == "__main__":
    main()
