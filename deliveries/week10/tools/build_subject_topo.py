"""Genera data/topo_by_subject.json: potencia theta por electrodo y por sujeto.

Fuente: deliveries/week06/data/processed/eeg_theta_per_electrode.csv, que el pipeline
de la Semana 6 (02_eeg_pipeline.ipynb) ya exportó con theta_mean (μθ) y theta_std (σθ)
por electrodo, por sujeto y por condición. Aquí NO se reprocesa EEG crudo: solo se
reorganiza ese CSV a la forma que consume js/topomap.js, pero por sujeto en vez de
promediada sobre los 68.

Para cada sujeto con par NS+SD en ojos abiertos y cada electrodo:
  {"NS": {"mean": μθ_NS, "var": σθ_NS},
   "SD": {"mean": μθ_SD, "var": σθ_SD},
   "dMean": μθ_SD - μθ_NS, "dVar": σθ_SD - σθ_NS}

A diferencia del mapa grupal, un sujeto individual no tiene prueba de significancia
(no hay varianza entre sujetos), así que no se emiten sigMean/sigVar/q.

Uso:  python tools/build_subject_topo.py   (desde deliveries/week10/)
"""
import csv
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parents[2]
CSV_PATH = REPO_ROOT / "deliveries" / "week06" / "data" / "processed" / "eeg_theta_per_electrode.csv"
OUT_PATH = HERE.parent / "data" / "topo_by_subject.json"
TASK = "eyesopen"  # única condición disponible para los 71 participantes


def main():
    # agrupa: subject -> electrode -> condition -> {mean, var}
    by_sub = {}
    with CSV_PATH.open(encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            if row["task"] != TASK:
                continue
            sub = row["participant_id"]
            elec = row["electrode"]
            cond = row["condition"]  # NS | SD
            by_sub.setdefault(sub, {}).setdefault(elec, {})[cond] = {
                "mean": round(float(row["theta_mean"]), 6),
                "var": round(float(row["theta_std"]), 6),
            }

    out = {}
    for sub, elecs in by_sub.items():
        topo = {}
        for elec, conds in elecs.items():
            if "NS" not in conds or "SD" not in conds:
                continue  # solo electrodos con ambas condiciones
            ns, sd = conds["NS"], conds["SD"]
            topo[elec] = {
                "NS": ns,
                "SD": sd,
                "dMean": round(sd["mean"] - ns["mean"], 6),
                "dVar": round(sd["var"] - ns["var"], 6),
            }
        if topo:  # solo sujetos con par NS+SD
            out[sub] = topo

    # orden estable por id para un JSON reproducible
    out = {k: out[k] for k in sorted(out)}
    OUT_PATH.write_text(json.dumps(out, separators=(",", ":")), encoding="utf-8")
    n_elec = len(next(iter(out.values()))) if out else 0
    print(f"{OUT_PATH.name}: {len(out)} sujetos pareados, {n_elec} electrodos c/u")


if __name__ == "__main__":
    main()
