"""Reproduce los datos procesados desde el EEG crudo y los compara con los del repositorio.

Ejecuta el código de deliveries/week06/code/02_eeg_pipeline.ipynb tal cual, pero con OUT_DIR redirigido a una
carpeta temporal (no sobrescribe los CSV versionados), y compara, solo para ojos abiertos (la condición que usa
la app):
  - eeg_theta_per_electrode.csv  (μθ y σθ por persona, condición y electrodo -> topo.json, topo_by_subject.json)
  - eeg_theta_epochs_roi.csv     (θ por época y región                          -> subject_epochs.json)
  - eeg_pipeline_skipped.csv     (grabaciones que MNE no puede leer)

Requisitos: el dataset en <raíz>/ds004902 (ver deliveries/week06/README.md; basta con los archivos de ojos
abiertos, ~6 GB) y Python con mne, pymatreader, numpy y pandas. Tarda unos 15 minutos.
Uso (desde deliveries/week12/app/):  python3 tools/check_reproduction.py [--tol 1e-6]
Sale con código 1 si algo no coincide.
"""
import argparse
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

import pandas as pd

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parents[3]
CODE_DIR = REPO_ROOT / "deliveries" / "week06" / "code"
NOTEBOOK = CODE_DIR / "02_eeg_pipeline.ipynb"
PROCESSED = REPO_ROOT / "deliveries" / "week06" / "data" / "processed"
OUT_LINE = 'OUT_DIR = REPO_ROOT / "deliveries" / "week06" / "data" / "processed"'


def run_pipeline(out_dir):
    cells = ["".join(c["source"]) for c in json.loads(NOTEBOOK.read_text(encoding="utf-8"))["cells"] if c["cell_type"] == "code"]
    code = "\n\n".join(cells)
    if code.count(OUT_LINE) != 1:
        raise SystemExit("No se encontró la línea OUT_DIR en el notebook 02; revisa este script")
    script = out_dir / "run_02.py"
    script.write_text(code.replace(OUT_LINE, f"OUT_DIR = Path({str(out_dir)!r})"), encoding="utf-8")
    print("Corriendo el pipeline de la Semana 6 sobre ds004902 (unos 15 minutos)...", flush=True)
    subprocess.run([sys.executable, str(script)], cwd=CODE_DIR, check=True)   # el notebook calcula REPO_ROOT desde cwd


def compare(name, keys, cols, out_dir, tol):
    old = pd.read_csv(PROCESSED / name); new = pd.read_csv(out_dir / name)
    old, new = old[old.task == "eyesopen"], new[new.task == "eyesopen"]
    m = old.merge(new, on=keys, how="outer", suffixes=("_repo", "_nuevo"), indicator=True)
    unmatched = int((m._merge != "both").sum())
    diff = max(float((m[c + "_repo"] - m[c + "_nuevo"]).abs().max()) for c in cols)
    ok = unmatched == 0 and diff < tol
    print(f"  [{'PASA' if ok else 'FALLA'}] {name}: {len(old)} filas en el repo, {len(new)} nuevas, {unmatched} sin pareja, diferencia máx. {diff:.1e}")
    return ok


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--tol", type=float, default=1e-6, help="diferencia máxima aceptada (versiones distintas de numpy/MNE dan ~1e-7)")
    a = ap.parse_args()
    if not (REPO_ROOT / "ds004902").exists():
        raise SystemExit(f"Falta el dataset en {REPO_ROOT / 'ds004902'}: ver deliveries/week06/README.md")
    with tempfile.TemporaryDirectory(prefix="batimix_repro_") as tmp:
        out = Path(tmp)
        run_pipeline(out)
        print("\nComparación con deliveries/week06/data/processed (ojos abiertos):")
        oks = [compare("eeg_theta_per_electrode.csv", ["participant_id", "condition", "electrode"], ["theta_mean", "theta_std"], out, a.tol),
               compare("eeg_theta_epochs_roi.csv", ["participant_id", "condition", "roi", "epoch_idx"], ["theta_power"], out, a.tol)]
        so = pd.read_csv(PROCESSED / "eeg_pipeline_skipped.csv"); sn = pd.read_csv(out / "eeg_pipeline_skipped.csv")
        key = lambda d: sorted(map(tuple, d[d.task == "eyesopen"][["participant_id", "session"]].values.tolist()))
        same = key(so) == key(sn)
        print(f"  [{'PASA' if same else 'FALLA'}] grabaciones descartadas: {', '.join(f'{p} {s}' for p, s in key(sn)) or 'ninguna'}")
        oks.append(same)
    print("\nLa app se reproduce desde el EEG crudo." if all(oks) else "\nHay diferencias: revisa versiones del dataset y de MNE.")
    sys.exit(0 if all(oks) else 1)


if __name__ == "__main__":
    main()
