"""Pruebas técnicas de corrección de BATIMIX (antes de las pruebas con usuarios).

  1. Estadística: los q de la FDR que calcula la app (core.js, bh) contra statsmodels; ρ de Spearman y su IC
     (core.js, spearman) contra scipy, para las 2 regiones × 2 métricas × 7 marcadores.
  2. Efecto por electrodo: t, p, d_z e IC 95 % de data/topo.json contra scipy.stats.ttest_rel, recalculados
     desde data/topo_by_subject.json (otro archivo, otro camino).
  3. Señal de referencia: el cálculo de θ relativa del notebook 02 (Welch de MNE por época, 4–8 Hz sobre
     1–40 Hz) aplicado a ruido blanco, a un seno de 6 Hz y a uno de 10 Hz, con valor teórico conocido.
  4. Consistencia entre vistas: el mismo n y los mismos conteos en los títulos, en «Acerca de» y en el
     Reporte exportado.
  5. Regresión visual: capturas a 1365 × 768 y 1600 × 900, temas oscuro y claro, para revisar a mano.

No cubre «reproducir la app desde el EEG crudo con MNE»: requiere descargar ds004902 (~8 GB) y correr
deliveries/week06/code/02_eeg_pipeline.ipynb.

Requisitos: Google Chrome; Python con numpy, scipy, statsmodels y mne.
Uso (desde deliveries/week12/app/):  python3 -I tools/check_app.py [--out carpeta] [--chrome ruta]
Sale con código 1 si alguna prueba falla.
"""
import argparse
import functools
import html
import http.server
import json
import re
import shutil
import subprocess
import sys
import tempfile
import threading
from pathlib import Path

import numpy as np
from scipy import stats
from statsmodels.stats.multitest import multipletests

APP = Path(__file__).resolve().parents[1]
CHROME_MAC = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
RESULTS = []


def check(name, ok, detail):
    RESULTS.append((name, bool(ok), detail))
    print(f"  [{'PASA' if ok else 'FALLA'}] {name}: {detail}")


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def serve(directory):
    handler = functools.partial(QuietHandler, directory=str(directory))
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def chrome(binary, profile, *args):
    cmd = [binary, "--headless=new", "--disable-gpu", "--no-first-run", f"--user-data-dir={profile}", *args]
    return subprocess.run(cmd, capture_output=True, text=True, timeout=180).stdout


def collect_from_app(binary, base, profile):
    dom = chrome(binary, profile, "--window-size=1700,1000", "--virtual-time-budget=40000", "--dump-dom", f"{base}/tools/selftest.html")
    m = re.search(r'<pre id="out">(.*?)</pre>', dom, re.S)
    if not m:
        raise SystemExit("No se pudo leer la salida de tools/selftest.html")
    data = json.loads(html.unescape(m.group(1)))
    if "error" in data:
        raise SystemExit("La autoprueba de la app falló: " + data["error"])
    return data


def test_statistics(R):
    print("\n1. Estadística (app contra statsmodels y scipy)")
    worst_q = 0.0
    for p_key, q_key in (("pv", "qv"), ("pm", "qm")):
        p = np.array([r[p_key] for r in R["topo"]]); q_app = np.array([r[q_key] for r in R["topo"]])
        worst_q = max(worst_q, np.abs(multipletests(p, method="fdr_bh")[1] - q_app).max())
    check("FDR de Benjamini y Hochberg (61 electrodos × 2 métricas)", worst_q < 1e-12, f"diferencia máx. {worst_q:.1e}")
    worst_r = worst_ci = 0.0
    for r in R["rho"]:
        if r["n"] < 5:
            continue
        x = np.array([row[1] for row in r["rows"]]); y = np.array([row[2] for row in r["rows"]])
        rho = stats.spearmanr(x, y).statistic
        z, se = np.arctanh(rho), 1 / np.sqrt(len(x) - 3)   # IC por Fisher z, la fórmula que usa la app
        worst_r = max(worst_r, abs(rho - r["rho"]), abs(len(x) - r["n"]))
        worst_ci = max(worst_ci, abs(np.tanh(z - 1.96 * se) - r["lo"]), abs(np.tanh(z + 1.96 * se) - r["hi"]))
    check(f"ρ de Spearman ({len(R['rho'])} combinaciones región × métrica × marcador)", worst_r < 1e-9, f"diferencia máx. {worst_r:.1e}")
    check("IC 95 % de ρ (Fisher z)", worst_ci < 1e-9, f"diferencia máx. {worst_ci:.1e}")


def test_effect_sizes():
    print("\n2. Efecto por electrodo (topo.json contra scipy, desde topo_by_subject.json)")
    topo = json.loads((APP / "data" / "topo.json").read_text(encoding="utf-8"))
    sub = json.loads((APP / "data" / "topo_by_subject.json").read_text(encoding="utf-8"))
    worst = {"p": 0.0, "t": 0.0, "dz": 0.0, "ci": 0.0, "Δ": 0.0}
    for e, rec in topo.items():
        for met, suf in (("var", "Var"), ("mean", "Mean")):
            ns = np.array([s[e]["NS"][met] for s in sub.values() if e in s]); sd = np.array([s[e]["SD"][met] for s in sub.values() if e in s])
            d = sd - ns; n = len(d); res = stats.ttest_rel(sd, ns); half = stats.t.ppf(.975, n - 1) * d.std(ddof=1) / np.sqrt(n)
            worst["p"] = max(worst["p"], abs(res.pvalue - rec["sig" + suf]))
            worst["t"] = max(worst["t"], abs(res.statistic - rec["t" + suf]))
            worst["dz"] = max(worst["dz"], abs(d.mean() / d.std(ddof=1) - rec["dz" + suf]))
            worst["ci"] = max(worst["ci"], abs(d.mean() - half - rec["ci" + suf][0]), abs(d.mean() + half - rec["ci" + suf][1]))
            worst["Δ"] = max(worst["Δ"], abs(d.mean() - rec["d" + suf]))
    # topo_by_subject redondea a 6 decimales: la tolerancia lo refleja
    check("p de la t pareada (distribución t exacta)", worst["p"] < 1e-4, f"diferencia máx. {worst['p']:.1e}")
    check("t, d_z, IC 95 % y Δ medio", max(worst["t"], worst["dz"]) < 1e-3 and max(worst["ci"], worst["Δ"]) < 1e-6,
          f"t {worst['t']:.1e}, d_z {worst['dz']:.1e}, IC {worst['ci']:.1e}, Δ {worst['Δ']:.1e}")


def test_reference_signal():
    print("\n3. Señal de referencia (cálculo de θ relativa del notebook 02)")
    import mne
    mne.set_log_level("ERROR")
    fs, n_t = 500, 2000   # 500 Hz, épocas de 4 s
    info = mne.create_info(["X"], fs, "eeg"); t = np.arange(n_t) / fs; rng = np.random.default_rng(13)

    def relative_theta(sig, per_epoch=False):   # mismas llamadas que process_recording en 02_eeg_pipeline.ipynb (celda 5)
        ep = mne.EpochsArray(sig[:, None, :], info, verbose=False)
        psds, freqs = ep.compute_psd(method="welch", fmin=1.0, fmax=40.0, verbose=False).get_data(return_freqs=True)
        mask = (freqs >= 4.0) & (freqs <= 8.0)
        rel = (psds[:, :, mask].sum(axis=2) / psds.sum(axis=2)).ravel()
        return (rel if per_epoch else rel.mean()), freqs, mask

    rel, freqs, mask = relative_theta(rng.standard_normal((2000, n_t)), per_epoch=True)
    theory = mask.sum() / len(freqs)   # ruido blanco: fracción de bins de 4–8 Hz dentro de 1–40 Hz
    z = (rel.mean() - theory) / (rel.std(ddof=1) / np.sqrt(len(rel)))   # 2000 épocas: error de muestreo ≈ 0.5 %
    check(f"ruido blanco (resolución {freqs[1] - freqs[0]:.2f} Hz)", abs(z) < 3,
          f"{rel.mean():.4f} frente a {mask.sum()}/{len(freqs)} = {theory:.4f} ({rel.mean() / theory - 1:+.1%}, z = {z:+.1f})")
    rel6, _, _ = relative_theta(np.tile(np.sin(2 * np.pi * 6 * t), (20, 1)))
    check("seno de 6 Hz (todo en theta)", abs(rel6 - 1) < .01, f"{rel6:.4f} frente a 1")
    rel10, _, _ = relative_theta(np.tile(np.sin(2 * np.pi * 10 * t), (20, 1)))
    check("seno de 10 Hz (nada en theta)", rel10 < .01, f"{rel10:.4f} frente a 0")
    rel_amp, _, _ = relative_theta(50 * np.tile(np.sin(2 * np.pi * 6 * t), (20, 1)))
    check("invariancia a la amplitud", abs(rel_amp - rel6) < 1e-9, f"×50 da {rel_amp:.4f}")


def test_consistency(R):
    print("\n4. Consistencia entre vistas (títulos, Acerca de y Reporte)")
    st = R["state"]; key = next(r for r in R["rho"] if r["roi"] == st["roi"] and r["met"] == st["met"] and r["y"] == st["y"])
    n_title = int(re.search(r"n = (\d+)", R["titles"]["sc"]).group(1))
    rep = R["report"]; rows = re.findall(r"<tr><td>(sub-\d+)</td>(.*?)</tr>", rep)
    n_report = sum("no data" not in r[1] for r in rows)
    label = {"d_pvt": "PVT", "d_pvtl": "PVT", "d_pvtsd": "PVT", "d_kss": "KSS", "d_sss": "SSS", "d_panasP": "PANAS", "d_panasN": "PANAS"}[st["y"]]
    m_about = re.search(label + r" (\d+)", R["about"])
    n_about = int(m_about.group(1)) if m_about else None
    check("n de la dispersión", n_title == key["n"] == n_report and (n_about is None or n_about == n_title),
          f"título {n_title}, cálculo {key['n']}, filas con dato en el Reporte {n_report}, Acerca de {n_about}")
    q_title = int(re.search(r"(\d+) of 61 electrodes with q", R["titles"]["topo"]).group(1))
    q_true = sum(int((multipletests([r[k] for r in R["topo"]], method="fdr_bh")[1] < .05).sum()) for k in ("pv", "pm"))
    check("electrodos con q < 0.05", q_title == q_true and f"{q_title} of 61 electrodes with q" in html.unescape(rep),
          f"título {q_title}, statsmodels {q_true}, mismo texto en el Reporte")
    n_dyn = int(re.search(r"n = (\d+)", R["titles"]["dyn"]).group(1)); n_leg = int(re.search(r"n = (\d+)", R["legendDyn"]).group(1))
    n_state = int(re.search(r"Active people</span><b>(\d+)", rep).group(1)); n_long = int(re.search(r"(\d+) have EEG", R["about"]).group(1))
    check("n de Cinco minutos", n_dyn == n_leg == n_state == n_long, f"título {n_dyn}, leyenda {n_leg}, Reporte {n_state}, Acerca de {n_long}")
    sub_ep = json.loads((APP / "data" / "subject_epochs.json").read_text(encoding="utf-8"))
    worst = 0.0
    for k, cond in enumerate(("NS", "SD")):
        per = []
        for pid in R["activeIds"]:   # las mismas personas que el gráfico (grupo activo)
            a = (sub_ep.get(pid) or {}).get(f"f_{cond}")
            if not a:
                continue
            row = []
            for i in range(75 - 10 + 1):
                w = np.array([v for v in a[i:i + 10] if v is not None], float)
                row.append(w.std() if len(w) >= 8 else np.nan)   # np.std: mismo divisor que σθ en el pipeline
            per.append(row)
        want = np.nanmean(np.array(per), axis=0); got = np.array(R["rollVar"][k]["mean"], float)
        worst = max(worst, np.nanmax(np.abs(want - got)))
    check("σθ móvil de Cinco minutos (frontal, ventanas de 40 s)", worst < 1e-12, f"diferencia máx. con numpy {worst:.1e}")
    tip = R["tooltip"]; rec = json.loads((APP / "data" / "topo.json").read_text(encoding="utf-8"))[tip["e"]]
    shown = [float(x.replace("−", "-")) for x in re.findall(r"t\(\d+\) · d<sub>z</sub></span><b>([−\d.]+) · ([−\d.]+)", tip["html"])[0]] if "d<sub>z</sub>" in tip["html"] else []
    want = [round(rec["tVar"], 2), round(rec["dzVar"], 2)]
    check("tooltip del electrodo con t y d_z", len(shown) == 2 and np.allclose(shown, want, atol=.006),
          f"{tip['e']}: muestra t · d_z = {shown}, topo.json {want}")


def test_secondary():
    print("\n6. Vistas secundarias (cifras del resumen contra los datos por persona)")
    ap, cn = APP / "data" / "aperiodic.json", APP / "data" / "connectivity.json"
    if not (ap.exists() and cn.exists()):
        check("datos de las vistas secundarias", False, "faltan data/aperiodic.json o data/connectivity.json (tools/build_secondary.py)"); return
    A = json.loads(ap.read_text(encoding="utf-8")); Cn = json.loads(cn.read_text(encoding="utf-8"))
    worst = 0.0
    for roi in ("front", "ct"):
        v = np.array(list(A["sigma"][roi]["persons"].values()), float)
        worst = max(worst, abs(stats.spearmanr(v[:, 0], v[:, 1]).statistic - A["sigma"][roi]["rho_periodic"]))
    check("ρ de Δσθ frente a Δσθ periódica", worst < 1e-3, f"diferencia máx. {worst:.1e}")
    d = np.array([np.array(s[1]) - np.array(s[0]) for s in Cn["persons"].values()]); g = d.mean(1)
    dz = g.mean() / g.std(ddof=1); down = int((d.mean(0) < 0).sum())
    check("conectividad: d_z global y pares que bajan", abs(dz - Cn["global"]["dz"]) < 1e-3 and down == Cn["global"]["pairs_down"],
          f"d_z {dz:+.3f} frente a {Cn['global']['dz']:+.3f}; {down} de 45 frente a {Cn['global']['pairs_down']}")


def take_screenshots(binary, base, profile, out):
    print(f"\n5. Regresión visual (capturas para revisar a mano en {out})")
    for w, h in ((1365, 768), (1600, 900)):
        for theme in ("oscuro", "claro"):
            f = out / f"batimix_{w}x{h}_{theme}.png"
            chrome(binary, profile, f"--window-size={w},{h}", "--hide-scrollbars", "--virtual-time-budget=8000", f"--screenshot={f}", f"{base}/index.html?tema={theme}")
            print(f"  {'listo' if f.exists() else 'NO SE GENERÓ'}: {f.name}")


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--out", type=Path, default=None, help="carpeta para las capturas (por defecto, una temporal)")
    ap.add_argument("--chrome", default=CHROME_MAC if Path(CHROME_MAC).exists() else shutil.which("google-chrome") or shutil.which("chromium"))
    a = ap.parse_args()
    if not a.chrome:
        raise SystemExit("No se encontró Chrome; indica la ruta con --chrome")
    out = a.out or Path(tempfile.mkdtemp(prefix="batimix_pruebas_"))
    out.mkdir(parents=True, exist_ok=True)
    srv = serve(APP); base = f"http://127.0.0.1:{srv.server_address[1]}"
    with tempfile.TemporaryDirectory() as profile:
        R = collect_from_app(a.chrome, base, profile)
        test_statistics(R)
        test_effect_sizes()
        test_reference_signal()
        test_consistency(R)
        test_secondary()
        take_screenshots(a.chrome, base, profile, out)
    srv.shutdown()
    bad = [n for n, ok, _ in RESULTS if not ok]
    print(f"\n{len(RESULTS) - len(bad)} de {len(RESULTS)} pruebas pasan." + (f" Fallan: {', '.join(bad)}" if bad else ""))
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
