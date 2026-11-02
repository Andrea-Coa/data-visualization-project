"""Regenera data/data.js (respaldo para abrir index.html con doble clic, file://) a partir de los JSON procesados.

Equivale a tools/build-data.js, sin necesitar Node.js. Solo usa la biblioteca estándar.
Uso:  python3 tools/build_data.py   (desde deliveries/week12/app/)
"""
import json
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data"
FILES = {"participants": "participants", "topo": "topo", "coords": "coords", "subEpochs": "subject_epochs",
         "subTopo": "topo_by_subject", "multiverse": "multiverse", "coords3d": "coords3d",
         "aperiodic": "aperiodic", "connectivity": "connectivity"}   # mismo orden que build-data.js
HEADER = ("/* Generado desde data/*.json para abrir index.html con doble clic (file://). "
          "No editar a mano: regenerar con tools/build-data.js */")


def main():
    data = {k: json.loads((DATA / f"{f}.json").read_text(encoding="utf-8")) for k, f in FILES.items()}
    (DATA / "data.js").write_text(HEADER + "\nwindow.BATIMIX_DATA = " + json.dumps(data, separators=(",", ":"), ensure_ascii=False) + ";\n", encoding="utf-8")
    print("data/data.js actualizado")


if __name__ == "__main__":
    main()
