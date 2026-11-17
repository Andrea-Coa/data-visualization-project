"""Fases ML3 y ML4 de PLAN.md: clasificación NS vs. SD con modelos explicables, validación por persona y XAI.

Entrada: <ds004902>/derivatives/batimix-ml/features.csv y features_dict.json (tools/build_ml_features.py).
Salida: app/data/ml.json (lo que muestra la página de ML) y ../data/ml_summary.csv (métricas por modelo y escenario).
Investigación de respaldo: research/ml_xai.md. Decisiones de ML0 (16 nov 2026): escenarios estricto y pareado, regresión
logística elastic-net y EBM (interpret), y gradient boosting con SHAP solo como referencia (no va a la app).

Escenarios
  estricto  features crudas sin las que dependen de la escala absoluta (scale_dependent en el diccionario): la persona
            de test es totalmente nueva.
  pareado   a cada persona se le resta la media de sus dos registros (centrado por sujeto; no usa etiquetas, no filtra
            entre personas). Pregunta: "dados los dos registros de alguien, ¿cuál es el de privación?".
Validación
  StratifiedGroupKFold(groups = persona), 5 folds × 10 repeticiones; CV anidada (3 folds agrupados) para los
  hiperparámetros; escalado y modelo dentro de un Pipeline. Assert: ninguna persona en train y test a la vez.
  Métricas fuera de fold: ROC AUC, exactitud balanceada y exactitud pareada (P(SD) mayor en el registro SD de la persona),
  con media e intervalo 2.5–97.5 % entre repeticiones.
  Prueba de permutación pareada: se intercambian NS/SD dentro de cada persona al azar (--perms veces, 1 repetición de CV).
  Controles: exactitud por orden de visitas, clasificador de la visita (1 o 2) con las mismas features, y línea base
  solo con las features del proyecto (bandas y aperiódico).
XAI
  Global: importancia por permutación agrupada (por banda, región y dominio) en los folds de test; coeficientes de LR
  por fold y frecuencia de selección; importancia de términos de la EBM y curvas de forma del top 5.
  Local: contribución de cada feature a cada registro con el modelo del fold en que estaba en test (repetición 0).
  Métricas: estabilidad (Kendall τ y Jaccard del top 10 entre folds), acuerdo LR–EBM (Spearman), fidelidad
  (reentrenar solo con el top 10 y sin él, con el ranking del propio fold), complejidad (features que suman el 90 %).
  Proyección: PCA de las features estandarizadas del escenario pareado.
Uso (desde deliveries/week12/app/):
  python3 tools/build_ml.py --synthetic          prueba con datos sintéticos (efecto conocido; etiquetas permutadas)
  python3 tools/build_ml.py [--perms 1000] [--procs 6]
"""
import argparse, json, math, os, sys, time, warnings
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

for v in ("OMP_NUM_THREADS", "OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS", "VECLIB_MAXIMUM_THREADS"):
    os.environ.setdefault(v, "1")
import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import eeg_ica as E  # noqa: E402

APP = HERE.parent
FEAT = E.DS / "derivatives" / "batimix-ml"
N_SPLITS, N_REPEATS, SEED, TOPK = 5, 10, 20261116, 10
warnings.filterwarnings("ignore")


# ---------------------------------------------------------------- datos y escenarios
def load():
    df = pd.read_csv(FEAT / "features.csv")
    D = json.loads((FEAT / "features_dict.json").read_text(encoding="utf-8"))
    return df, D


def scenario(df, D, name, cols=None):
    """Matriz X (registros × features), y (1 = SD), grupos (persona) y nombres de columnas del escenario."""
    cols = cols or [c for c in D if not (name == "strict" and D[c]["scale_dependent"])]
    X = df[cols].to_numpy(float)
    if name == "paired":   # centrado por sujeto: x − media de los dos registros de la persona
        g = df["participant_id"].to_numpy()
        for p in np.unique(g):
            m = g == p; X[m] -= X[m].mean(axis=0)
    return X, (df["condition"] == "SD").to_numpy(int), df["participant_id"].to_numpy(), cols


# ---------------------------------------------------------------- modelos
def make(model, seed):
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import StandardScaler
    from sklearn.linear_model import LogisticRegression
    if model == "lr":
        est = LogisticRegression(penalty="elasticnet", solver="saga", max_iter=5000, tol=1e-3, random_state=seed)
        grid = {"m__C": [0.03, 0.1, 0.3, 1.0], "m__l1_ratio": [0.2, 0.5, 0.8]}
    elif model == "ebm":
        from interpret.glassbox import ExplainableBoostingClassifier
        est = ExplainableBoostingClassifier(interactions=5, outer_bags=4, max_rounds=1000, random_state=seed, n_jobs=1)
        grid = {"m__learning_rate": [0.01, 0.04], "m__min_samples_leaf": [4, 10]}
    elif model == "gbm":   # caja negra de referencia (no va a la app)
        from sklearn.ensemble import HistGradientBoostingClassifier
        est = HistGradientBoostingClassifier(max_iter=200, random_state=seed)
        grid = {"m__learning_rate": [0.03, 0.1], "m__max_depth": [2, 3]}
    return Pipeline([("s", StandardScaler()), ("m", est)]), grid


def fit_nested(model, X, y, g, seed):
    """Ajuste con búsqueda de hiperparámetros en CV interna agrupada por persona."""
    from sklearn.model_selection import GridSearchCV, StratifiedGroupKFold
    pipe, grid = make(model, seed)
    gs = GridSearchCV(pipe, grid, scoring="roc_auc", cv=StratifiedGroupKFold(3, shuffle=True, random_state=seed), n_jobs=1, refit=True)
    gs.fit(X, y, groups=g)
    return gs.best_estimator_, gs.best_params_


def splits(y, g, rep):
    from sklearn.model_selection import StratifiedGroupKFold
    for tr, te in StratifiedGroupKFold(N_SPLITS, shuffle=True, random_state=SEED + rep).split(np.zeros(len(y)), y, g):
        assert not set(g[tr]) & set(g[te]), "una persona en train y test a la vez"
        yield tr, te


def scores(y, p, g):
    from sklearn.metrics import roc_auc_score, balanced_accuracy_score
    pairs = [(p[(g == q) & (y == 1)][0], p[(g == q) & (y == 0)][0]) for q in np.unique(g)]
    return {"auc": float(roc_auc_score(y, p)), "bacc": float(balanced_accuracy_score(y, (p >= .5).astype(int))),
            "pairacc": float(np.mean([a > b for a, b in pairs]))}


def local_contrib(model, est, X):
    """Contribución exacta de cada feature a la puntuación (logit) de cada registro."""
    s, m = est.named_steps["s"], est.named_steps["m"]
    Z = s.transform(X)
    if model == "lr":
        return Z * m.coef_[0], float(m.intercept_[0])
    if model == "ebm":
        T = m.eval_terms(Z)   # registros × términos (incluye interacciones de pares)
        names = m.term_names_; n = X.shape[1]; C = np.zeros((len(X), n))
        for j, tn in enumerate(names):
            idx = m.term_features_[j]
            for f in idx:   # una interacción de pares se reparte por igual entre sus dos features
                C[:, f] += T[:, j] / len(idx)
        return C, float(m.intercept_[0])
    return None, None


def global_imp(model, est, n):
    m = est.named_steps["m"]
    if model == "lr":
        return np.abs(m.coef_[0])
    if model == "ebm":
        imp = np.zeros(n)
        for j, w in enumerate(m.term_importances()):
            idx = m.term_features_[j]
            for f in idx:
                imp[f] += w / len(idx)
        return imp
    return None


# ---------------------------------------------------------------- una repetición de CV completa
def fit_fixed(model, X, y, params, seed):
    est, _ = make(model, seed)
    est.set_params(**{f"m__{k}": v for k, v in params.items()})
    return est.fit(X, y), params


def run_rep(args):
    model, X, y, g, rep, with_detail = args[:6]
    fixed = args[6] if len(args) > 6 else None
    oof = np.zeros(len(y)); det = {"folds": []}
    for k, (tr, te) in enumerate(splits(y, g, rep)):
        est, bp = fit_fixed(model, X[tr], y[tr], fixed, SEED + k) if fixed else fit_nested(model, X[tr], y[tr], g[tr], SEED + 100 * rep + k)
        oof[te] = est.predict_proba(X[te])[:, 1]
        if with_detail:
            f = {"test": te.tolist(), "params": {k2.replace("m__", ""): v for k2, v in bp.items()}}
            imp = global_imp(model, est, X.shape[1])
            if imp is not None:
                f["imp"] = imp.tolist()
            if model == "lr":
                f["coef"] = est.named_steps["m"].coef_[0].tolist()
            if rep == 0:
                C, b0 = local_contrib(model, est, X[te])
                if C is not None:
                    f["contrib"] = C.tolist(); f["intercept"] = b0
            det["folds"].append((tr, te, est, f))
    return rep, oof, det


def cv_repeated(model, X, y, g, procs, reps=None, detail=True):
    reps = reps or N_REPEATS
    with ProcessPoolExecutor(procs) as ex:
        res = list(ex.map(run_rep, [(model, X, y, g, r, detail) for r in range(reps)]))
    return sorted(res, key=lambda t: t[0])


def perm_one(args):
    model, X, y, g, seed, fixed = args
    rng = np.random.default_rng(seed); yp = y.copy()
    for q in np.unique(g):   # intercambio NS/SD dentro de la persona, al azar
        if rng.random() < .5:
            m = g == q; yp[m] = 1 - yp[m]
    _, oof, _ = run_rep((model, X, yp, g, 0, False, fixed))
    return scores(yp, oof, g)["auc"]


def fid_one(args):
    model, Xtr, ytr, gtr, Xte, yte, idx = args
    from sklearn.metrics import roc_auc_score
    e2, _ = fit_nested(model, Xtr[:, idx], ytr, gtr, SEED)
    return float(roc_auc_score(yte, e2.predict_proba(Xte[:, idx])[:, 1]))


def summarize(vals):
    v = np.asarray(vals, float)
    return {"mean": round(float(v.mean()), 4), "lo": round(float(np.percentile(v, 2.5)), 4), "hi": round(float(np.percentile(v, 97.5)), 4)}


# ---------------------------------------------------------------- XAI
def grouped_perm_importance(folds, X, y, cols, D, n_rep=5, seed=7):
    """Caída del AUC al permutar juntas las columnas de un grupo dentro del test de cada fold (repetición 0)."""
    from sklearn.metrics import roc_auc_score
    groups = {}
    for j, c in enumerate(cols):
        d = D[c]
        groups.setdefault(("band", d["band"] or ("aperiodic" if d["domain"] == "aperiodic" else "broadband")), []).append(j)
        groups.setdefault(("roi", d["roi"]), []).append(j)
        groups.setdefault(("domain", d["domain"]), []).append(j)
    rng = np.random.default_rng(seed); out = {}
    for key, idx in groups.items():
        drops = []
        for tr, te, est, _ in folds:
            base = roc_auc_score(y[te], est.predict_proba(X[te])[:, 1])
            for _ in range(n_rep):
                Xp = X[te].copy(); Xp[:, idx] = Xp[rng.permutation(len(te))][:, idx]
                drops.append(base - roc_auc_score(y[te], est.predict_proba(Xp)[:, 1]))
        out[f"{key[0]}:{key[1]}"] = {"kind": key[0], "group": key[1], "n": len(idx), **summarize(drops)}
    return out


def xai_metrics(model, folds, X, y, g, cols, procs=6):
    from scipy import stats
    from sklearn.metrics import roc_auc_score
    I = np.array([f[3]["imp"] for f in folds])
    taus, jac = [], []
    for a in range(len(I)):
        for b in range(a + 1, len(I)):
            taus.append(stats.kendalltau(I[a], I[b]).statistic)
            ta, tb = set(np.argsort(-I[a])[:TOPK]), set(np.argsort(-I[b])[:TOPK])
            jac.append(len(ta & tb) / len(ta | tb))
    mean_imp = I.mean(0)
    srt = np.sort(mean_imp)[::-1]; cum = np.cumsum(srt) / srt.sum() if srt.sum() > 0 else np.ones_like(srt)
    # fidelidad: con el ranking del propio fold, reentrenar solo con el top-k y sin él, y evaluar en su test
    jobs = []
    for tr, te, est, f in folds:
        top = np.argsort(-np.array(f["imp"]))[:TOPK]; rest = np.setdiff1d(np.arange(X.shape[1]), top)
        jobs += [(model, X[tr], y[tr], g[tr], X[te], y[te], top), (model, X[tr], y[tr], g[tr], X[te], y[te], rest)]
    with ProcessPoolExecutor(procs) as ex:
        r = list(ex.map(fid_one, jobs))
    only, without = r[0::2], r[1::2]
    return {"stability": {"kendall_tau": round(float(np.nanmean(taus)), 3), "jaccard_top10": round(float(np.mean(jac)), 3)},
            "fidelity": {"auc_only_top10": summarize(only), "auc_without_top10": summarize(without)},
            "complexity": {"n_for_90pct": int(np.searchsorted(cum, .9) + 1), "n_features": len(cols)},
            "mean_importance": mean_imp.tolist()}


def ebm_shapes(X, y, g, cols, params, top):
    """Curvas de forma de la EBM ajustada con todos los registros (solo para mostrar; las métricas son fuera de fold)."""
    est, _ = make("ebm", SEED)
    est.set_params(**{f"m__{k}": v for k, v in params.items()})
    est.fit(X, y)
    s, m = est.named_steps["s"], est.named_steps["m"]
    out = {}
    for f in top:
        j = [i for i, idx in enumerate(m.term_features_) if tuple(idx) == (f,)]
        if not j:
            continue
        j = j[0]; edges = np.asarray(m.bins_[f][0], float); sc = np.asarray(m.term_scores_[j], float)[1:-1]
        x = edges * s.scale_[f] + s.mean_[f]   # bordes en las unidades originales del escenario
        out[cols[f]] = {"edges": [round(float(v), 6) for v in x], "scores": [round(float(v), 4) for v in sc]}
    return out


def add_values(out, df, D):
    """Valores de las features que muestra la página (top 30 de cada modelo, contribuciones locales y curvas de forma),
    en las unidades del escenario (el pareado, centrado por persona), para el detalle de una persona."""
    for sc, S in out["scenarios"].items():
        X, _, _, cols = scenario(df, D, sc)
        used = set()
        for R in S["models"].values():
            used |= {c for c, _ in R.get("importance", [])} | set(R.get("shapes", {})) | set(R.get("coef", {}))
            used |= {c for r in R.get("local", []) or [] if r for c, _ in r["top"]}
        S["values"] = {c: [float(f"{v:.4g}") for v in X[:, cols.index(c)]] for c in sorted(used)}
    return out


# ---------------------------------------------------------------- prueba sintética
def synthetic(procs):
    rng = np.random.default_rng(1)
    n, p = 68, 40
    g = np.repeat([f"s{i:02d}" for i in range(n)], 2); y = np.tile([0, 1], n)
    subj = rng.normal(0, 2, (n, p)).repeat(2, axis=0)
    X = subj + rng.normal(0, 1, (2 * n, p)); X[:, 7] += 0.8 * y   # efecto conocido en la feature 7
    cols = [f"f{j}" for j in range(p)]
    df = pd.DataFrame(X, columns=cols); df["participant_id"] = g; df["condition"] = np.where(y == 1, "SD", "NS")
    D = {c: {"scale_dependent": False} for c in cols}
    Xs, ys, gs, _ = scenario(df, D, "paired")
    res = cv_repeated("lr", Xs, ys, gs, procs, reps=3)
    auc = np.mean([scores(ys, o, gs)["auc"] for _, o, _ in res])
    I = np.mean([f[3]["imp"] for _, _, d in res for f in d["folds"]], axis=0)
    yp = ys.copy(); rr = np.random.default_rng(3)
    for q in np.unique(gs):
        if rr.random() < .5: yp[gs == q] = 1 - yp[gs == q]
    null = np.mean([scores(yp, o, gs)["auc"] for _, o, _ in cv_repeated("lr", Xs, yp, gs, procs, reps=3, detail=False)])
    ok = int(np.argmax(I)) == 7 and auc > .7 and abs(null - .5) < .15
    print(f"sintético: AUC {auc:.3f}; feature más importante f{int(np.argmax(I))} (esperada f7); AUC con etiquetas permutadas {null:.3f} (esperado ≈ 0.5)")
    print("Resultado:", "pasa" if ok else "FALLA")
    return ok


# ---------------------------------------------------------------- principal
def main():
    global N_REPEATS
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--perms", type=int, default=1000)
    ap.add_argument("--procs", type=int, default=6)
    ap.add_argument("--synthetic", action="store_true")
    ap.add_argument("--values-only", action="store_true", help="solo agregar los valores de las features a un ml.json ya calculado")
    ap.add_argument("--reps", type=int, default=N_REPEATS, help="repeticiones de la CV (10 en el resultado final)")
    ap.add_argument("--time-only", action="store_true", help="medir el tiempo de una repetición y salir")
    a = ap.parse_args()
    N_REPEATS = a.reps
    if a.synthetic:
        sys.exit(0 if synthetic(a.procs) else 1)
    df, D = load()
    if a.values_only:
        f = APP / "data" / "ml.json"; out = add_values(json.loads(f.read_text(encoding="utf-8")), df, D)
        f.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        n = {sc: len(S["values"]) for sc, S in out["scenarios"].items()}
        print(f"valores agregados: {n} features; {f.stat().st_size // 1024} KB")
        return
    if a.time_only:
        for sc in ("strict", "paired"):
            X, y, g, cols = scenario(df, D, sc)
            for model in ("lr", "ebm", "gbm"):
                t = time.time(); _, oof, _ = run_rep((model, X, y, g, 0, False))
                print(f"{sc:6s} {model}: {time.time() - t:5.1f} s por repetición; AUC {scores(y, oof, g)['auc']:.3f}", flush=True)
        return
    t0 = time.time()
    feats = list(D)
    recs = [{"id": r.participant_id, "cond": r.condition, "visit": int(r.visit), "order": r.order} for r in df.itertuples()]
    out = {"meta": {"source": "tools/build_ml.py; features de tools/build_ml_features.py (TSFEL por región + bandas y aperiódico del proyecto)",
                    "n_records": len(df), "n_persons": int(df.participant_id.nunique()), "cv": f"StratifiedGroupKFold por persona, {N_SPLITS} folds × {N_REPEATS} repeticiones; CV anidada de 3 folds",
                    "perms": {"lr": a.perms, "ebm": max(1, a.perms // 5)}, "seed": SEED, "topk": TOPK,
                    "notes": "Exploratorio. Probabilidades fuera de fold. La EBM de las curvas de forma se ajusta con todos los registros, solo para mostrar."},
           "features": {c: D[c] for c in feats}, "records": recs, "scenarios": {}}
    from scipy import stats
    for sc in ("paired", "strict"):
        X, y, g, cols = scenario(df, D, sc)
        S = {"cols": cols, "models": {}}
        order = df["order"].to_numpy(); visit = df["visit"].to_numpy()
        imps = {}
        for model in ("lr", "ebm", "gbm"):
            ts = time.time()
            res = cv_repeated(model, X, y, g, a.procs)
            M = [scores(y, oof, g) for _, oof, _ in res]
            prob = np.mean([oof for _, oof, _ in res], axis=0)
            R = {"metrics": {k: summarize([m[k] for m in M]) for k in ("auc", "bacc", "pairacc")}}
            # exactitud por orden de visitas (control de confusión con la visita)
            R["byOrder"] = {o: {"pairacc": round(float(np.mean([prob[(g == q) & (y == 1)][0] > prob[(g == q) & (y == 0)][0] for q in np.unique(g[order == o])])), 3),
                                "n": int(len(np.unique(g[order == o])))} for o in ("NS->SD", "SD->NS")}
            if model != "gbm":
                R["prob"] = [round(float(v), 4) for v in prob]
                folds0 = res[0][2]["folds"]
                # contribuciones locales (repetición 0): top 8 por registro, el resto sumado
                loc = [None] * len(y)
                for tr, te, est, f in folds0:
                    for i, row in zip(te, f["contrib"]):
                        row = np.array(row); top = np.argsort(-np.abs(row))[:8]
                        loc[i] = {"top": [[cols[j], round(float(row[j]), 4)] for j in top], "other": round(float(row.sum() - row[top].sum()), 4),
                                  "intercept": round(f["intercept"], 4), "p0": round(float(res[0][1][i]), 4)}
                R["local"] = loc
                R["groups"] = grouped_perm_importance(folds0, X, y, cols, D)
                allf = [f for _, _, d in res for f in d["folds"]]
                xm = xai_metrics(model, folds0, X, y, g, cols, a.procs)
                mi = np.mean([f[3]["imp"] for f in allf], axis=0); imps[model] = mi
                R["xai"] = {k: v for k, v in xm.items() if k != "mean_importance"}
                top30 = np.argsort(-mi)[:30]
                R["importance"] = [[cols[j], round(float(mi[j]), 5)] for j in top30]
                if model == "lr":
                    Cf = np.array([f[3]["coef"] for f in allf])
                    R["coef"] = {cols[j]: {"mean": round(float(Cf[:, j].mean()), 4), "lo": round(float(np.percentile(Cf[:, j], 2.5)), 4),
                                           "hi": round(float(np.percentile(Cf[:, j], 97.5)), 4), "freq": round(float((Cf[:, j] != 0).mean()), 3)}
                                 for j in top30}
                params = [tuple(sorted(f[3]["params"].items())) for f in allf]
                best = dict(max(set(params), key=params.count))
                R["params_mode"] = best
                if model == "ebm":
                    R["shapes"] = ebm_shapes(X, y, g, cols, best, list(np.argsort(-mi)[:5]))
                # prueba de permutación pareada (LR con CV anidada; EBM con los hiperparámetros más elegidos, fijos)
                n_perm = a.perms if model == "lr" else max(1, a.perms // 5)
                with ProcessPoolExecutor(a.procs) as ex:
                    null = list(ex.map(perm_one, [(model, X, y, g, SEED + 10 + i, None if model == "lr" else best) for i in range(n_perm)], chunksize=4))
                obs = R["metrics"]["auc"]["mean"]
                R["perm"] = {"n": n_perm, "p": round((1 + sum(v >= obs for v in null)) / (1 + n_perm), 4), "null": summarize(null),
                             "fixed_params": model != "lr"}
            else:
                # caja negra de referencia: SHAP medio absoluto con el modelo ajustado a todos los registros
                import shap
                est, _ = fit_nested("gbm", X, y, g, SEED)
                sv = shap.TreeExplainer(est.named_steps["m"]).shap_values(est.named_steps["s"].transform(X))
                sv = sv[1] if isinstance(sv, list) else sv
                imps["gbm"] = np.abs(sv).mean(0)
            S["models"][model] = R
            print(f"{sc:6s} {model}: AUC {R['metrics']['auc']['mean']:.3f} [{R['metrics']['auc']['lo']:.3f}, {R['metrics']['auc']['hi']:.3f}], "
                  f"exactitud pareada {R['metrics']['pairacc']['mean']:.3f}" + (f", permutación p {R['perm']['p']:.4f}" if "perm" in R else "") +
                  f"; por orden {R['byOrder']}; {time.time() - ts:.0f} s", flush=True)
        S["agreement"] = {"lr_ebm_spearman": round(float(stats.spearmanr(imps["lr"], imps["ebm"]).statistic), 3),
                          "lr_gbmshap_spearman": round(float(stats.spearmanr(imps["lr"], imps["gbm"]).statistic), 3)}
        # controles: clasificador de la visita (2.ª vs 1.ª) y línea base solo con features del proyecto (LR)
        yv = (visit == 2).astype(int)
        rv = cv_repeated("lr", X, yv, g, a.procs, detail=False)
        proj = [c for c in cols if D[c]["family"] == "project"]
        Xb, yb, gb, _ = scenario(df, D, sc, cols=proj)
        rb = cv_repeated("lr", Xb, yb, gb, a.procs, detail=False)
        S["controls"] = {"visit_lr": {k: summarize([scores(yv, o, g)[k] for _, o, _ in rv]) for k in ("auc", "pairacc")},
                         "project_only_lr": {"n_features": len(proj), **{k: summarize([scores(yb, o, gb)[k] for _, o, _ in rb]) for k in ("auc", "pairacc")}}}
        # proyección: PCA de las features estandarizadas (determinista)
        from sklearn.decomposition import PCA
        from sklearn.preprocessing import StandardScaler
        Z = StandardScaler().fit_transform(X); pca = PCA(2, random_state=0).fit(Z); C2 = pca.transform(Z)
        S["pca"] = {"coords": [[round(float(u), 3), round(float(v), 3)] for u, v in C2], "var": [round(float(v), 4) for v in pca.explained_variance_ratio_],
                    "loadings": {f"pc{k + 1}": [[cols[j], round(float(pca.components_[k][j]), 4)] for j in np.argsort(-np.abs(pca.components_[k]))[:8]] for k in range(2)}}
        print(f"{sc:6s} controles: visita AUC {S['controls']['visit_lr']['auc']['mean']:.3f}; solo proyecto AUC {S['controls']['project_only_lr']['auc']['mean']:.3f}; "
              f"acuerdo LR–EBM ρ {S['agreement']['lr_ebm_spearman']}, LR–SHAP ρ {S['agreement']['lr_gbmshap_spearman']}", flush=True)
        out["scenarios"][sc] = S
    add_values(out, df, D)
    (APP / "data" / "ml.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    rows = [{"scenario": sc, "model": m, **{f"{k}_{q}": v[q] for k, v in R["metrics"].items() for q in ("mean", "lo", "hi")},
             "perm_p": R.get("perm", {}).get("p")} for sc, S in out["scenarios"].items() for m, R in S["models"].items()]
    pd.DataFrame(rows).to_csv(APP.parent / "data" / "ml_summary.csv", index=False)
    print(f"listo en {(time.time() - t0) / 60:.0f} min: data/ml.json y ../data/ml_summary.csv")


if __name__ == "__main__":
    main()
