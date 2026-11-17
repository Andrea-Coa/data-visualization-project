"""Fase B de PLAN.md: análisis de diseño cruzado de dos períodos (AB/BA) por orden de sesiones.

Cada persona tiene sueño normal (NS) y privación (SD) en dos visitas; la secuencia es NS->SD o SD->NS (SessionOrder).
Para cada persona i, por electrodo o región y métrica:
  d_i = SD_i − NS_i        (por condición; positivo = más alto tras la privación)
  p_i = V2_i − V1_i        (segunda visita menos primera): p_i = d_i en NS->SD y −d_i en SD->NS
  s_i = (NS_i + SD_i) / 2  (promedio de la persona)
Estimadores y pruebas (Grizzle, 1965; Hills y Armitage, 1979; Senn, 2002; Jones y Kenward, 2014):
  c  = (media d en NS->SD + media d en SD->NS) / 2   efecto de la privación ajustado por visita; Welch t de p entre secuencias
  pi = (media d en NS->SD − media d en SD->NS) / 2   efecto de visita (segunda − primera); Welch t de d entre secuencias
  arrastre = media s en NS->SD − media s en SD->NS   diferencia entre secuencias; Welch t de s; solo descriptivo
Con secuencias desbalanceadas (40 y 28) la media simple de d está sesgada: vale c + (40 − 28)/68 · pi.
No se usa la prueba de arrastre para decidir el análisis (Freeman, 1989): se informa como descriptiva.
Confirmación por permutación (cuidado 5 del plan): se permutan las etiquetas de secuencia manteniendo fijo p_i (para c)
o d_i (para pi); bajo la hipótesis nula de cada uno, esos valores tienen la misma distribución en las dos secuencias.
p bilateral sobre la diferencia de medias, 5000 permutaciones (semilla 20261116), las mismas para todos los electrodos.

Uso (desde deliveries/week12/app/):
  python3 tools/crossover.py --validate     datos sintéticos con c, pi y arrastre conocidos (fase B, paso 1)
  python3 tools/crossover.py                datos reales: data/crossover.json (theta y bandas; electrodos y regiones; conducta)
"""
import argparse, csv, json, sys
from pathlib import Path

import numpy as np
from scipy import stats

HERE = Path(__file__).resolve().parent
APP = HERE.parent
REPO = HERE.parents[3]
TSV = REPO / "deliveries" / "week04" / "data" / "participants.tsv"
FRONTAL = ["Fp1", "Fp2", "Fpz", "AF3", "AF4", "AF7", "AF8", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "Fz"]
CENTROTEMPORAL = ["FC1", "FC2", "FC3", "FC4", "FC5", "FC6", "FT7", "FT8", "C1", "C2", "C3", "C4", "C5", "C6", "Cz", "T7", "T8",
                  "CP1", "CP2", "CP3", "CP4", "CP5", "CP6", "CPz", "TP7", "TP8", "TP9", "TP10"]


def welch(a, b):
    """Welch t (a − b): diferencia de medias, t, gl de Welch-Satterthwaite y p bilateral."""
    a, b = np.asarray(a, float), np.asarray(b, float)
    r = stats.ttest_ind(a, b, equal_var=False)
    va, vb = a.var(ddof=1) / len(a), b.var(ddof=1) / len(b)
    df = (va + vb) ** 2 / (va ** 2 / (len(a) - 1) + vb ** 2 / (len(b) - 1))
    return float(a.mean() - b.mean()), float(r.statistic), float(df), float(r.pvalue)


def crossover(ns, sd, seq):
    """ns, sd: valores por persona; seq: 'AB' (NS->SD) o 'BA' (SD->NS). Devuelve c, pi y arrastre con sus pruebas."""
    ns, sd, seq = np.asarray(ns, float), np.asarray(sd, float), np.asarray(seq)
    A, B = seq == "AB", seq == "BA"
    d = sd - ns
    p = np.where(A, d, -d)               # segunda visita − primera
    s = (ns + sd) / 2
    dp, tc, dfc, pc = welch(p[A], p[B])  # = 2c
    dd, tp, dfp, pp = welch(d[A], d[B])  # = 2 pi
    ds, tk, dfk, pk = welch(s[A], s[B])
    return {"c": dp / 2, "t_c": tc, "df_c": dfc, "p_c": pc,
            "pi": dd / 2, "t_pi": tp, "df_pi": dfp, "p_pi": pp,
            "carry": ds, "t_carry": tk, "p_carry": pk,
            "naive": float(d.mean()), "nA": int(A.sum()), "nB": int(B.sum())}


def rnd(d, nd):
    """Redondea los estimadores; los p y q se guardan con 4 cifras significativas (si no, los muy chicos quedan en 0)."""
    return {k: (float(f"{v:.4g}") if k.split("_")[0] in ("p", "q", "pperm", "qperm") else round(v, nd)) if isinstance(v, float) else v for k, v in d.items()}


def perm_p(V, seqA, n_perm=5000, seed=20261116):
    """V: personas × pruebas (p_i para c o d_i para pi); seqA: máscara de la secuencia AB. p bilateral por columna
    con la diferencia de medias entre secuencias, permutando las etiquetas (mismas permutaciones en todas las columnas)."""
    V = np.asarray(V, float); n, nA = len(V), int(seqA.sum())
    obs = np.abs(V[seqA].mean(0) - V[~seqA].mean(0)); tot = V.sum(0); hit = np.zeros(V.shape[1])
    rng = np.random.default_rng(seed)
    for _ in range(n_perm):
        idx = rng.permutation(n)[:nA]; sA = V[idx].sum(0)
        hit += np.abs(sA / nA - (tot - sA) / (n - nA)) >= obs - 1e-12
    return (hit + 1) / (n_perm + 1)


def bh(ps):
    ps = np.asarray(ps, float); n = len(ps); o = np.argsort(ps)
    q = np.empty(n); mn = 1.0
    for k in range(n - 1, -1, -1):
        mn = min(mn, ps[o[k]] * n / (k + 1)); q[o[k]] = mn
    return q


# ---------------------------------------------------------------- paso 1: datos sintéticos
def simulate(c, pi, carry, nA=40, nB=28, sigma_subject=1.0, sigma=0.5, rng=None):
    """Modelo cruzado: y = mu_i + (c/2)·(+1 en SD, −1 en NS) + (pi/2)·(+1 en visita 2, −1 en visita 1) + ruido; la
    secuencia AB tiene además un nivel medio desplazado en 'carry', con el mismo signo que el estimador (media de s en
    NS->SD menos media de s en SD->NS)."""
    rng = rng or np.random.default_rng()
    seq = np.array(["AB"] * nA + ["BA"] * nB)
    mu = rng.normal(0, sigma_subject, nA + nB) + np.where(seq == "AB", carry, 0.0)
    v_ns = np.where(seq == "AB", 1, 2); v_sd = 3 - v_ns
    ns = mu - c / 2 + pi * (v_ns - 1.5) + rng.normal(0, sigma, nA + nB)
    sd = mu + c / 2 + pi * (v_sd - 1.5) + rng.normal(0, sigma, nA + nB)
    return ns, sd, seq


def validate(reps=2000, seed=7):
    rng = np.random.default_rng(seed)
    print("Validación con datos sintéticos (nA = 40, nB = 28; media de", reps, "réplicas; error típico entre paréntesis)")
    print(f"{'c':>5} {'pi':>5} {'arr':>5} | {'c est.':>14} {'pi est.':>14} {'arr est.':>14} {'media simple':>14} | rechazo c  rechazo pi")
    ok = True
    for c in (-.5, 0, .5):
        for pi in (-.5, 0, .5):
            for carry in (-1, 0, 1):
                R = [crossover(*simulate(c, pi, carry, rng=rng)) for _ in range(reps)]
                ce, pe, ke, nv = (np.array([r[k] for r in R]) for k in ("c", "pi", "carry", "naive"))
                rej_c, rej_p = np.mean([r["p_c"] < .05 for r in R]), np.mean([r["p_pi"] < .05 for r in R])
                # sin sesgo: c y pi recuperan su valor (dentro de 4 errores estándar de la media de las réplicas),
                # y no se contaminan: cuando el verdadero es 0, la tasa de rechazo es ≈ 5 %
                se = lambda v: v.std(ddof=1) / np.sqrt(reps)
                good = abs(ce.mean() - c) < 4 * se(ce) and abs(pe.mean() - pi) < 4 * se(pe) and abs(ke.mean() - carry) < 4 * se(ke)
                if c == 0: good &= .03 < rej_c < .07
                if pi == 0: good &= .03 < rej_p < .07
                ok &= good
                if carry == 0 or (c == .5 and pi == .5):
                    print(f"{c:+5.1f} {pi:+5.1f} {carry:+5.1f} | {ce.mean():+.3f} ({se(ce):.3f}) {pe.mean():+.3f} ({se(pe):.3f}) {ke.mean():+.3f} ({se(ke):.3f}) "
                          f"{nv.mean():+.3f} (sesgo {nv.mean() - c:+.3f}) | {rej_c:.3f}     {rej_p:.3f}{'' if good else '   ← FALLA'}")
    # sesgo teórico de la media simple: c + (nA − nB)/(nA + nB) · pi
    print(f"Sesgo esperado de la media simple con pi = 0.5: (40 − 28)/68 · 0.5 = {12 / 68 * .5:+.3f}")
    print("Resultado:", "los estimadores recuperan c, pi y el arrastre sin contaminarse (27 escenarios)" if ok else "FALLA")
    return ok


# ---------------------------------------------------------------- pasos 2 y 3: datos reales
def orders():
    with open(TSV, newline="", encoding="utf-8") as fh:
        return {r["participant_id"]: {"NS->SD": "AB", "SD->NS": "BA"}.get(r.get("SessionOrder", "").replace(" ", "")) for r in csv.DictReader(fh, delimiter="\t")}


def real():
    O = orders()
    out = {"meta": {"design": "two-period crossover (AB = NS->SD, BA = SD->NS)", "fdr": "Benjamini–Hochberg within each family (question × metric × band; 61 electrodes)",
                    "refs": ["Grizzle (1965)", "Hills and Armitage (1979)", "Senn (2002)", "Jones and Kenward (2014)", "Freeman (1989)"]},
           "bands": {}, "behavior": {}}
    for band in ("delta", "theta", "alpha", "beta"):
        base = APP / "data" / ("" if band == "theta" else f"bands/{band}")
        S = json.loads((base / "topo_by_subject.json").read_text(encoding="utf-8"))
        ids = [i for i in S if O.get(i)]
        elecs = list(S[ids[0]].keys())
        B = {"n": {"AB": sum(O[i] == "AB" for i in ids), "BA": sum(O[i] == "BA" for i in ids)}, "electrodes": {}, "regions": {}}
        for met in ("var", "mean"):
            res = {}
            for e in elecs:
                pp = [i for i in ids if e in S[i]]
                res[e] = crossover([S[i][e]["NS"][met] for i in pp], [S[i][e]["SD"][met] for i in pp], [O[i] for i in pp])
            for k in ("c", "pi"):
                q = bh([res[e][f"p_{k}"] for e in elecs])
                for e, qq in zip(elecs, q): res[e][f"q_{k}"] = float(qq)
            # permutación de las etiquetas de secuencia (solo personas con todos los electrodos, para usar la misma matriz)
            full = [i for i in ids if all(e in S[i] for e in elecs)]
            A = np.array([O[i] == "AB" for i in full])
            Dm = np.array([[S[i][e]["SD"][met] - S[i][e]["NS"][met] for e in elecs] for i in full])
            for k, V in (("c", np.where(A[:, None], Dm, -Dm)), ("pi", Dm)):
                pp = perm_p(V, A); qq = bh(pp)
                for e, a, b in zip(elecs, pp, qq): res[e][f"pperm_{k}"] = float(a); res[e][f"qperm_{k}"] = float(b)
            B["electrodes"][met] = {e: rnd(r, 6) for e, r in res.items()}
            for roi, chs in (("front", FRONTAL), ("ct", CENTROTEMPORAL)):
                ns = [np.mean([S[i][e]["NS"][met] for e in chs if e in S[i]]) for i in ids]
                sd = [np.mean([S[i][e]["SD"][met] for e in chs if e in S[i]]) for i in ids]
                B["regions"][f"{roi}_{met}"] = rnd(crossover(ns, sd, [O[i] for i in ids]), 6)
        out["bands"][band] = B
    # conducta (fase B, paso 2): Δ ya etiquetado por condición en behavioral_deltas.csv; NS y SD por separado desde participants.tsv
    cols = {"KSS": ("KSS_NS", "KSS_SD"), "SSS": ("SSS_NS", "SSS_SD"), "PVT median RT": ("PVT_item2_NS", "PVT_item2_SD")}
    with open(TSV, newline="", encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh, delimiter="\t"))
    num = lambda v: float(v) if v not in (None, "", "n/a", "NaN") else None
    for lab, (a, b) in cols.items():
        if a not in rows[0] or b not in rows[0]:
            continue
        rr = [(num(r[a]), num(r[b]), O.get(r["participant_id"])) for r in rows]
        rr = [x for x in rr if x[0] is not None and x[1] is not None and x[2]]
        if len(rr) > 10:
            out["behavior"][lab] = rnd(crossover(*zip(*rr)), 4)
    (APP / "data" / "crossover.json").write_text(json.dumps(out, separators=(",", ":")), encoding="utf-8")
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--validate", action="store_true")
    a = ap.parse_args()
    if a.validate:
        sys.exit(0 if validate() else 1)
    out = real()
    print("Conducta (c > 0 = peor tras la privación; pi = segunda − primera visita):")
    for k, v in out["behavior"].items():
        print(f"  {k:14s} n {v['nA']}+{v['nB']}: c {v['c']:+.3f} (p {v['p_c']:.2g}) | pi {v['pi']:+.3f} (p {v['p_pi']:.2g}) | arrastre p {v['p_carry']:.2g} | media simple {v['naive']:+.3f}")
    for band, B in out["bands"].items():
        print(f"{band} (n {B['n']['AB']}+{B['n']['BA']}):")
        for met in ("var", "mean"):
            E = B["electrodes"][met]
            qc = sum(r["q_c"] < .05 for r in E.values()); qp = sum(r["q_pi"] < .05 for r in E.values())
            fr = B["regions"][f"front_{met}"]
            print(f"  {met:4s} electrodos q<.05: c {qc:2d}/61, pi {qp:2d}/61 | frontal: c {fr['c']:+.4f} (t {fr['t_c']:+.2f}, p {fr['p_c']:.2g}), "
                  f"pi {fr['pi']:+.4f} (p {fr['p_pi']:.2g}), media simple {fr['naive']:+.4f}")
            qcp = sum(r["qperm_c"] < .05 for r in E.values()); qpp = sum(r["qperm_pi"] < .05 for r in E.values())
            agree = sum((r["q_c"] < .05) == (r["qperm_c"] < .05) for r in E.values())
            print(f"       permutación: c {qcp:2d}/61, pi {qpp:2d}/61 (misma decisión que Welch en c: {agree}/61)")


if __name__ == "__main__":
    main()
