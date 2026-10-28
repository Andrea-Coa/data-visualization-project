"""Regenera app-clasico/index.html a partir de app/index.html.

La versión clásica comparte datos, scripts y estilos base con app/; solo cambia la piel (css/clasico.css),
las fuentes y algunos textos. Ejecutar desde deliveries/week12 tras cualquier cambio en app/index.html:
    python app/tools/build_clasico.py
"""
import re
from pathlib import Path

WEEK = Path(__file__).resolve().parents[2]
src = (WEEK / "app" / "index.html").read_text(encoding="utf-8")

REPS = [
    ("<title>BATIMIX: una noche sin dormir</title>", "<title>BATIMIX: una noche sin dormir (versión clásica)</title>"),
    ('<meta name="theme-color" content="#0B0D12">', '<meta name="theme-color" content="#FFFFFF">'),
    ('<link rel="icon" href="assets/favicon.svg"', '<link rel="icon" href="../app/assets/favicon.svg"'),
    ('<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">',
     '<link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&family=Source+Sans+3:wght@400;500;600&family=Source+Code+Pro:wght@400;500&display=swap" rel="stylesheet">'),
    ('<link rel="stylesheet" href="css/styles.css">', '<link rel="stylesheet" href="../app/css/styles.css">\n<link rel="stylesheet" href="css/clasico.css">'),
    ('<p><a href="../app-clasico/">Versión clásica (clara)</a>', '<p><a href="../app/">Versión oscura (instrumento)</a>'),
    ("fuentes Geist y Geist Mono (OFL)", "fuentes Source Serif 4, Source Sans 3 y Source Code Pro (OFL)"),
    ('<script src="js/core.js"></script>', '<script>window.BATIMIX_BASE = "../app/";</script>\n<script src="js/core.js"></script>'),
]
out = src
for a, b in REPS:
    assert a in out, a[:70]
    out = out.replace(a, b)
out = re.sub(r'<script src="js/', '<script src="../app/js/', out)
(WEEK / "app-clasico" / "index.html").write_text(out, encoding="utf-8", newline="\n")   # LF, como el resto del repo
print("app-clasico/index.html regenerado")
