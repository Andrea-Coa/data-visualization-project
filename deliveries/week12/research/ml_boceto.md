# Boceto de la página de ML (fase ML5 de PLAN.md, 16 nov 2026)

Para validar con el equipo **antes de programar** (ML6). Datos: `app/data/ml.json` (tools/build_ml.py). Interfaz en inglés; mismo header, temas y estilo que la app; página nueva `ml.html` con `js/ml.js`, enlazada desde el header.

Usuarios: neurofisiólogos y neurocientíficos del sueño. Pregunta de la página: **¿qué propiedades del EEG de reposo, de qué región y banda, distinguen la noche sin dormir, y es eso privación o solo la segunda visita?**

## Layout (escritorio, 1600 × 900)

```
┌ BATIMIX · Classifier ─────────────────────────────────────────────────────────────────────────────┐
│ Scenario [Paired ▾]  Model [Logistic ▾ | EBM]  Order [All | NS→SD | SD→NS]  Show [All | Errors]    │
│ Feature filter: [All] [θ] [δ] [α] [β] [1/f] [spectral] [statistical]          ← Back to explorer  │
├───────────────────────────────┬──────────────────────────────┬────────────────────────────────────┤
│ 1. CARDS                      │ 3. GLOBAL IMPORTANCE         │ 5. PERSON (details on demand)      │
│ AUC 0.88 [0.88, 0.89]         │ group bars (band / region /  │ sub-17 · NS→SD · both correct      │
│ pair acc. 0.81 · perm p .001  │ domain): ΔAUC when permuted  │ ┌ Normal ──────┐┌ Deprivation ──┐  │
│ visit control AUC 0.49  ✓     │ ▇▇▇▇▇▇ θ                     │ │ σθ front +0.4││ σθ front +0.4 │  │
│ project-only AUC 0.85         │ ▇▇▇ 1/f                      │ │ ...          ││ ...           │  │
│ stability τ 0.42 · LR–EBM .75 │ ▇ δ ...                      │ └ P(SD) 0.22 ──┘└ P(SD) 0.81 ───┘  │
├───────────────────────────────┤──────────────────────────────┤ waterfall of contributions (top 8) │
│ 2. RECORDS (overview)         │ 4. FEATURES                  │ shape curve of the clicked feature │
│ PCA scatter of 136 records    │ LR: coefficient ± range and  │ [Open in Individual View →]        │
│ fill = predicted P(SD)        │ selection frequency (dots)   │                                    │
│ shape: ○ NS  ● SD (true)      │ EBM: top-5 shape curves      │                                    │
│ line joins a person's 2 rec.  │ labels: "σθ frontal",        │                                    │
│ errors with red ring; brush   │ "1/f exponent posterior"     │                                    │
└───────────────────────────────┴──────────────────────────────┴────────────────────────────────────┘
```

## Mantra de Shneiderman

- **Overview:** tarjetas (1) con el resultado y los controles de confusión al lado; scatter (2) de los 136 registros en PCA, color = probabilidad de SD fuera de fold (escala divergente NS↔SD, la misma de la app), forma = condición real, una línea une los dos registros de cada persona (en el escenario pareado los dos puntos quedan simétricos respecto al origen: la línea muestra la dirección de cambio de esa persona); importancia agrupada (3).
- **Zoom y filtro:** escenario, modelo, orden de visitas, solo errores, filtro de features por banda o dominio (atenúa las demás en 3 y 4); brush en el scatter = selección (las tarjetas muestran la exactitud de la selección, sin prueba: sería circular).
- **Details on demand:** clic en un punto o en una línea → panel 5: contribuciones locales de los dos registros lado a lado (cascada desde el intercepto hasta P(SD)), curva de forma de la feature que se elija y enlace a la Individual View (evento `select` del `bus`).

## Decisiones a validar

1. **Escenario por defecto:** pareado, rotulado *"Given both recordings of a person: which one is after sleep deprivation?"*; el estricto, como alternativa con su AUC más bajo.
2. **Ejes del scatter:** PCA (determinista, ejes con sus cargas en la ⓘ). Alternativa del plan: un eje = puntaje SD fuera de fold.
3. **Aviso de confusión:** si el AUC del clasificador de visita se acerca al de condición, banda amarilla arriba: *"The model may be learning the visit, not the deprivation"*.
4. **Nombres:** siempre los del diccionario (`label`), nunca los internos de TSFEL.
5. **Qué no va:** el modelo de caja negra (solo en el informe), interacciones de la EBM (solo sumadas a sus features).

## Resultados que condicionan el diseño (corrida final, 16 nov 2026)

`tools/build_ml.py`, 10 repeticiones × 5 folds por persona, CV anidada; permutación pareada (LR 1000, EBM 200).

| | Pareado | Estricto |
|---|---|---|
| LR: AUC (exactitud pareada), p | 0.88 (0.81), p = 0.001 | 0.75 (0.77), p = 0.001 |
| EBM: AUC (exactitud pareada), p | 0.90 (0.80), p = 0.005 | 0.72 (0.77), p = 0.005 |
| Gradient boosting (referencia, fuera de la app) | 0.84 | 0.70 |
| Control: predecir la visita | 0.49 | 0.49 |
| Solo features del proyecto (27) | 0.85 | 0.71 |

1. **No es la visita:** la visita no se predice (AUC 0.49) y la exactitud pareada es parecida en los dos órdenes (0.83 y 0.79). La banda amarilla de confusión no se mostraría; la tarjeta del control sí, siempre.
2. **θ manda entre las bandas:** en la importancia agrupada θ es la banda con mayor caída de AUC (0.18 en el pareado), y σθ centrotemporal encabeza el ranking de LR, como la prueba pareada de la app.
3. **TSFEL agrega poco** (0.85 → 0.88): la tarjeta de línea base debe estar a la vista.
4. **Las features individuales son inestables y redundantes:** τ entre folds 0.42 y Jaccard del top 10 0.30; quitar el top 10 y reentrenar no baja el AUC (0.88). Consecuencia de diseño: **la vista principal de importancia debe ser la agrupada** (banda, región, dominio), con el ranking por feature como detalle y su frecuencia de selección visible. Los grupos tienen tamaños distintos (las 120 de TSFEL forman el grupo "broadband"): mostrar *n* junto a cada barra.

## Diseño final implementado (16 nov 2026, tras revisarlo con Jimena)

El layout del boceto cambió en la implementación, por pedido de Jimena, al de las herramientas de análisis visual de modelos (como JaMoNA): tres columnas que ocupan exactamente la ventana, sin scroll.

- **Izquierda:** marca; **Controls** en filas con rótulo (escenario, modelo, orden, errores y un menú de familias de features; «← Explorer» y el tema en su encabezado); **Result** con la pregunta y solo tres números (AUC, exactitud pareada, p de permutación); **Global importance** vertical, con banda, región y dominio en la misma escala (en ventanas bajas se muestran solo los bloques que caben, primero la banda).
- **Centro:** **Records view** grande (PCA, brush, clic) y debajo **Features** a lo ancho (coeficientes de LR o curvas de forma de la EBM en una fila).
- **Derecha:** **Model metrics** (matriz de confusión NS/SD fuera de fold, acierto por clase y exactitud pareada por orden de visitas, y las líneas de controles y de calidad de la explicación) y **Person** (cascadas de los dos registros; las filas se ajustan al alto).
- Las nueve tarjetas iguales del primer intento se reemplazaron por esta jerarquía (¿funciona? → ¿es la privación? → ¿se puede creer la explicación?), porque no todos los números pesan lo mismo.

## Pestañas (17 nov 2026)

A pedido de Jimena, siguiendo Unlearning Comparator: el clasificador dejó de ser una página aparte (`ml.html`, que ahora redirige) y pasó a ser la pestaña **Classifier** de `index.html`, junto a **Explorer**. Las dos pestañas comparten la columna izquierda (marca, pestañas, recuadro de datos y controles); cambiar de pestaña no recarga nada y conserva la selección; «Open in Explorer» selecciona a la persona en la otra pestaña; `index.html#classifier` abre directamente el clasificador.

Segunda versión (17 nov 2026): una sola barra lateral para las dos pestañas (marca, pestañas, Dataset idéntico, Controls propios de cada pestaña y acciones globales); la Validation del clasificador pasó a la barra lateral, con un mini gráfico por verificación y sin clic (visita, permutación, orden, línea base, fidelidad y estabilidad); Global importance pasó al centro, junto a Features, como «Feature groups»; Model metrics quedó con la matriz de confusión.
