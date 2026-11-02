"""Genera data/topo.json: estadística por electrodo de las 68 personas con EEG en NS y SD (ojos abiertos).

Fuente: deliveries/week06/data/processed/eeg_theta_per_electrode.csv (theta_mean = μθ, theta_std = σθ).

Para cada electrodo y cada métrica (μθ "mean", σθ "var"), siempre sobre las mismas personas pareadas:
  NS, SD          media del grupo en cada condición (con n)
  dMean, dVar     Δ = media de (SD − NS) persona a persona
  sigMean, sigVar p de la prueba t pareada, con la distribución t exacta (gl = n − 1)
  tMean, tVar     estadístico t
  dzMean, dzVar   d_z de Cohen = media(Δ) / DE(Δ)
  ciMean, ciVar   IC 95 % de la media de Δ (t con n − 1 gl)

Corrige dos cosas del topo.json de la Semana 10, que no tenía generador en el repositorio:
  - los p usaban la aproximación normal en lugar de la t de Student (hasta 0.005 más bajos);
  - NS y SD promediaban a todas las personas con esa condición (69 y 70) y Δ era la diferencia de esas
    medias, aunque la prueba era pareada (68). Ahora todo usa las 68 pareadas, igual que la app cuando
    promedia un grupo (topomap.js, groupTopo).

Uso:  python3 tools/build_topo_stats.py   (desde deliveries/week12/app/; requiere scipy)
"""
import csv
import json
import math
from pathlib import Path

from scipy import stats

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parents[3]   # tools, app, week12, deliveries, raíz
CSV_PATH = REPO_ROOT / "deliveries" / "week06" / "data" / "processed" / "eeg_theta_per_electrode.csv"
OUT_PATH = HERE.parent / "data" / "topo.json"
TASK = "eyesopen"
METRICS = {"mean": ("theta_mean", "Mean"), "var": ("theta_std", "Var")}


def main():
    vals = {}   # electrodo -> persona -> condición -> {mean, var}
    with CSV_PATH.open(encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            if row["task"] != TASK:
                continue
            cell = vals.setdefault(row["electrode"], {}).setdefault(row["participant_id"], {})
            cell[row["condition"]] = {m: float(row[col]) for m, (col, _) in METRICS.items() if row[col] not in ("", "nan")}

    out = {}
    for elec in sorted(vals):
        people = sorted(p for p, c in vals[elec].items()
                        if all(m in c.get(k, {}) for k in ("NS", "SD") for m in METRICS))
        n = len(people)
        rec = {"NS": {"n": n}, "SD": {"n": n}, "nPaired": n}
        for m, (_, suf) in METRICS.items():
            ns = [vals[elec][p]["NS"][m] for p in people]
            sd = [vals[elec][p]["SD"][m] for p in people]
            d = [b - a for a, b in zip(ns, sd)]
            mean_d = sum(d) / n
            sd_d = math.sqrt(sum((x - mean_d) ** 2 for x in d) / (n - 1))
            t = mean_d / (sd_d / math.sqrt(n))
            half = stats.t.ppf(0.975, n - 1) * sd_d / math.sqrt(n)
            rec["NS"][m] = sum(ns) / n
            rec["SD"][m] = sum(sd) / n
            rec["d" + suf] = mean_d
            rec["sig" + suf] = float(2 * stats.t.sf(abs(t), n - 1))
            rec["t" + suf] = t
            rec["dz" + suf] = mean_d / sd_d
            rec["ci" + suf] = [mean_d - half, mean_d + half]
        out[elec] = rec

    OUT_PATH.write_text(json.dumps(out, separators=(",", ":")), encoding="utf-8")
    ns = sorted({r["nPaired"] for r in out.values()})
    print(f"{len(out)} electrodos, n pareado {ns}; p < 0.05: σθ {sum(r['sigVar'] < .05 for r in out.values())}, "
          f"μθ {sum(r['sigMean'] < .05 for r in out.values())}")


if __name__ == "__main__":
    main()
