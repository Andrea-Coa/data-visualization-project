"""Genera data/coords.json (2D) y data/coords3d.json (3D) desde las posiciones reales del dataset.

Fuente: sub-01_ses-1_electrodes.tsv de OpenNeuro ds004902 (posiciones x, y, z en mm relativas al
centro de la cabeza, plantilla Brain Products: el mismo montaje en todas las grabaciones). Si el
dataset crudo no está descargado en <raíz>/ds004902, se usa la muestra versionada en
deliveries/week04/data/sample.

Ejes del TSV: x hacia la nariz, y hacia la oreja izquierda, z hacia arriba.
Ejes de la app:  X hacia la derecha, Y hacia la nariz, Z hacia arriba  ->  X = -y, Y = x, Z = z.

coords3d.json: vector unitario de cada electrodo sobre la esfera, que usa el spline esférico
               (Perrin et al., 1989) de js/topomap.js.
coords.json:   proyección azimutal equidistante de esos mismos puntos (la convención de MNE):
               la distancia al centro del dibujo es proporcional al ángulo desde el vértice (Cz).
               El borde de la cabeza (r = 1) queda a EDGE_DEG grados; los electrodos más bajos
               (TP9 y TP10, a ~120°) caen fuera del círculo, junto a las orejas, como en MNE.
mneRingDist:   (opcional, requiere scipy) distancia mediana entre electrodos tal como la calcula MNE en
               _get_extra_points: aristas 1-2 y 2-3 de cada triángulo de qhull. Depende del orden de vértices de
               qhull, así que el navegador (d3) no la puede reproducir; la usa el método "Cúbica · MNE" del selector.

Uso:  python3 tools/build_coords.py   (desde deliveries/week12/app/)
"""
import csv
import json
import math
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parents[3]   # tools, app, week12, deliveries, raíz
REL = Path("sub-01") / "ses-1" / "eeg" / "sub-01_ses-1_electrodes.tsv"
CANDIDATES = [REPO_ROOT / "ds004902" / REL, REPO_ROOT / "deliveries" / "week04" / "data" / "sample" / REL]
OUT_DIR = HERE.parent / "data"
EDGE_DEG = 100   # ángulo desde Cz que coincide con el borde dibujado de la cabeza


def main():
    src = next((p for p in CANDIDATES if p.exists()), None)
    if src is None:
        raise SystemExit("No se encontró electrodes.tsv en: " + ", ".join(str(p) for p in CANDIDATES))
    edge = math.radians(EDGE_DEG)
    pos3, pos2 = {}, {}
    with src.open(encoding="utf-8") as fh:
        for row in csv.DictReader(fh, delimiter="\t"):
            x, y, z = (float(row[k]) for k in ("x", "y", "z"))
            r = math.sqrt(x * x + y * y + z * z)
            X, Y, Z = -y / r, x / r, z / r
            pos3[row["name"].strip()] = [round(X, 6), round(Y, 6), round(Z, 6)]
            theta, phi = math.acos(max(-1.0, min(1.0, Z))), math.atan2(Y, X)
            rr = theta / edge
            pos2[row["name"].strip()] = [round(rr * math.cos(phi), 4), round(rr * math.sin(phi), 4)]
    pos2 = dict(sorted(pos2.items()))
    pos3 = dict(sorted(pos3.items()))
    (OUT_DIR / "coords.json").write_text(json.dumps(pos2, separators=(",", ":")), encoding="utf-8")
    meta = {"source": "ds004902 " + REL.as_posix(), "frame": "X derecha, Y nariz, Z arriba (vectores unitarios)",
            "projection": "azimutal equidistante", "edgeDeg": EDGE_DEG, "pos": pos3}
    (OUT_DIR / "coords3d.json").write_text(json.dumps(meta, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
    try:   # misma regla que mne.viz.topomap._get_extra_points
        from scipy.spatial import Delaunay
        xy = list(pos2.values()); tri = Delaunay(xy)
        d = sorted([math.dist(xy[a], xy[b]) for s in tri.simplices for a, b in ((s[0], s[1]), (s[1], s[2]))])
        meta["mneRingDist"] = round((d[len(d) // 2] + d[(len(d) - 1) // 2]) / 2, 8)
        (OUT_DIR / "coords3d.json").write_text(json.dumps(meta, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
    except ImportError:
        print("scipy no está instalado: coords3d.json queda sin mneRingDist (el navegador calcula una aproximación)")
    outside = [n for n, (a, b) in pos2.items() if math.hypot(a, b) > 1]
    print(f"{len(pos3)} electrodos desde {src.relative_to(REPO_ROOT)}; fuera del borde de {EDGE_DEG}°: {', '.join(outside) or 'ninguno'}")


if __name__ == "__main__":
    main()
