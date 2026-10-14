// Regenera data/data.js (respaldo para file://) a partir de los JSON procesados.
// Uso: node tools/build-data.js   (desde deliveries/week10/)
const fs = require("fs"), path = require("path");
const dir = path.join(__dirname, "..", "data"), r = f => JSON.parse(fs.readFileSync(path.join(dir, f + ".json"), "utf8"));
const D = {participants: r("participants"), topo: r("topo"), coords: r("coords"), subEpochs: r("subject_epochs")};
fs.writeFileSync(path.join(dir, "data.js"),
  "/* Generado desde data/*.json para abrir index.html con doble clic (file://). No editar a mano: regenerar con tools/build-data.js */\nwindow.BATIMIX_DATA = " + JSON.stringify(D) + ";\n");
console.log("data/data.js actualizado");
