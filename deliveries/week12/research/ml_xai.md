# ML y XAI para NS vs. SD: investigación corta (16 nov 2026)

Respalda la fase ML de `PLAN.md`. Investigación breve, no una revisión sistemática.

## 1. Qué datos tenemos y qué implica

- 68 personas × 2 condiciones = **136 registros** (ojos abiertos, 75 épocas de 4 s, 61 electrodos, 500 Hz, filtrado 1–40 Hz, ICA). Las clases están balanceadas (68/68) y cada persona aporta un registro de cada clase.
- Con n = 136, el número de features debe ser pequeño (decenas, no miles). Toda selección de features va **dentro** de cada fold.
- La variabilidad entre personas en el EEG es mucho mayor que el efecto de la privación. Un clasificador entre personas sin normalizar puede quedar cerca del azar aunque el efecto pareado sea claro. Por eso conviene reportar dos escenarios:
  - **Estricto:** features crudas; la persona de test es totalmente nueva.
  - **Pareado:** a cada persona se le resta la media de sus dos registros (centrado por sujeto). No usa etiquetas, pero sí necesita los dos registros de la persona de test. Responde: "dados dos registros de alguien, ¿cuál es el de privación?". Es el escenario más útil para un neurofisiólogo y hay que rotularlo así.
- **Confusión con la visita:** el orden es 40 NS→SD y 28 SD→NS, así que "SD" y "segunda visita" coinciden en parte. Controles: exactitud por grupo de orden y un clasificador de control que prediga la visita (1 o 2) en vez de la condición. Si la visita se predice tan bien como la condición, el modelo aprendió habituación, no privación. Ver la fase B de `PLAN.md`.

## 2. Extracción de features: TSFEL frente a tsfresh

| | TSFEL | tsfresh |
|---|---|---|
| Tamaño | ~390 features (contando variantes), agrupadas en dominios: estadístico, temporal, espectral y fractal | hasta ~1 550 features, muy redundantes |
| Frecuencia de muestreo | Las features espectrales reciben `fs` (centroide, entropía espectral, frecuencia mediana, roll-off…): salen en Hz | Las features de Fourier se expresan en índices de coeficiente, no en Hz |
| Selección | Por dominio (`tsfel.get_features_by_domain("spectral")`) o editando el diccionario de configuración | Selección FRESH por pruebas de hipótesis; habría que correrla dentro de cada fold para no filtrar |
| Velocidad | De los conjuntos más rápidos (~0.1 ms por feature) | Más lenta |
| Uso en EEG | Usada en estudios de carga mental y en el conjunto de Bonn | Genérica; sus features más útiles en EEG son de autocorrelación |

**Decisión recomendada: TSFEL**, porque:
1. Sus features espectrales están en Hz y tienen nombres que un neurofisiólogo entiende.
2. Sus dominios sirven como grupos para explicar el modelo ("¿cuánto aporta lo espectral frente a lo estadístico?").
3. Con n = 136, los ~1 500 features redundantes de tsfresh solo agregan ruido y riesgo de sobreajuste.

**Cómo usarla en EEG:**
- Unidad de extracción: cada época de 4 s, sobre señales por **ROI** (promedio de electrodos de frontal, centro-temporal y el resto, como en `build_eeg_ica.py`) y no por electrodo. 61 electrodos × ~40 features darían ~2 400 columnas por registro. Con 3 ROIs y unos 40 features quedan ~120. Opción para el mapa de importancia por electrodo: un subconjunto mínimo (por ejemplo, potencias de banda) por electrodo.
- Agregación por registro: **media y DE entre épocas** de cada feature. Es la misma lógica de μθ y σθ del proyecto, y la DE recoge la inestabilidad que es la hipótesis central.
- Subconjunto inicial: dominio espectral más algunas estadísticas (DE, curtosis, asimetría, rango intercuartílico). Excluir features que dependen de la escala absoluta del amplificador si se compara entre personas (o confiar en el centrado del escenario pareado).
- Para acelerar: remuestrear a 125 Hz antes de extraer (el filtro ya corta en 40 Hz). 136 × 75 × 3 ROIs ≈ 30 000 series: pocos minutos.
- **Features del dominio del proyecto, siempre incluidas:** potencia relativa δ/θ/α/β (ya calculada por banda), σ y μ de cada banda, y exponente aperiódico (`aperiodic.json`). Son la línea base interpretable: si TSFEL no mejora sobre ellas, se dice.
- Las potencias relativas suman ~1: son composicionales y colineales. Quitar una banda o usar log-cocientes (por ejemplo, log θ/α) para que los coeficientes lineales se puedan leer.
- Alternativa descartada: `mne-features` (Hjorth, potencia por banda, entropías) está pensada para EEG, pero tiene poco mantenimiento. Lo que aportaría ya lo cubren las bandas del proyecto y TSFEL.

## 3. Modelos explicables (al menos 2)

1. **Regresión logística con penalización L1 o elastic-net** (`scikit-learn`). Los coeficientes sobre features estandarizadas son la explicación global. La contribución local exacta es coef × (x − media), así que no hace falta SHAP.
2. **Explainable Boosting Machine (EBM, librería `interpret`)**. Es un GAM con boosting: una curva de forma por feature y pocas interacciones de pares. Es glass-box: las contribuciones locales son exactas y suman la predicción, y suele rendir cerca de los modelos de caja negra en datos tabulares. Limitar las interacciones (por ejemplo, ≤ 5) y el número de features para n = 136.
- Descartado: un árbol de decisión poco profundo es explicable pero muy inestable con n = 136.
- Opcional: un modelo de caja negra (por ejemplo, gradient boosting con SHAP) solo como referencia del "costo de la interpretabilidad". No va en la app.

## 4. Validación

- **Separación por persona:** `StratifiedGroupKFold` con `groups = participant_id` (5 folds, repetido unas 10 veces con semillas distintas). Como cada persona tiene los dos registros, cada fold queda balanceado.
- **CV anidada** para los hiperparámetros (C/l1_ratio; tasa de aprendizaje e interacciones de la EBM): el fold interno también agrupa por persona.
- **El escalado, la imputación, la selección de features y el centrado se ajustan dentro del fold** (un `Pipeline` de sklearn). El centrado por sujeto es por persona, así que no filtra información entre personas.
- Métricas: ROC AUC y exactitud balanceada, con intervalo sobre las repeticiones. Azar = 0.5.
- **Prueba de permutación pareada:** se intercambian las etiquetas NS/SD dentro de cada persona (al azar por persona), no se barajan entre todos los registros. Es la hipótesis nula correcta para el diseño pareado. Usar ~1 000 permutaciones.
- Predicciones **fuera de fold** para la app: cada punto del scatter muestra la predicción hecha cuando esa persona estaba en test.

## 5. Qué XAI conviene

Usuarios: neurofisiólogos y neurocientíficos del sueño. Quieren saber **qué propiedad de qué región y de qué banda** separa las condiciones, con qué dirección y con cuánta confianza. No quieren mapas de saliencia de redes profundas.

**Global (overview):**
- Importancia por permutación **agrupada** sobre los folds de test (grupos: banda, ROI y dominio de TSFEL). Con features correlacionadas, la importancia de una sola feature reparte el crédito y engaña; la de un grupo no.
- Coeficientes de la regresión logística con su distribución entre folds, y frecuencia de selección (en cuántos folds el coeficiente ≠ 0).
- Curvas de forma de la EBM para las ~5 features principales: dirección y no linealidad ("a partir de cierta σθ frontal, la probabilidad de SD sube").
- Importancia proyectada en el cuero cabelludo si hay features por electrodo: reutiliza el estilo de la Topography View.

**Local (details on demand):**
- Contribuciones exactas de cada feature para un registro (LR: coef × x; EBM: aportes de los términos), mostradas para **los dos registros de la persona, lado a lado**.

**Métricas de calidad de la explicación ("métricas XAI").** Para datos tabulares basta numpy y sklearn; Quantus está orientada a imágenes y redes y no hace falta:
1. **Estabilidad:** Kendall τ entre rankings de importancia de distintos folds y Jaccard del top-k entre folds. Una explicación que cambia de fold a fold no se interpreta.
2. **Acuerdo entre modelos:** Spearman entre la importancia global de LR y la de EBM. Si dos modelos distintos señalan lo mismo, la conclusión es más creíble.
3. **Fidelidad (remove-and-retrain):** reentrenar con solo el top-k y sin el top-k, y comparar el AUC. Si quitar las k más importantes no baja el AUC, la importancia no es fiel.
4. **Complejidad:** cuántas features explican el 90 % de la importancia total. Menos es más legible.
5. **Plausibilidad:** comparar con la literatura (`bandas_literatura.md`: aumento de theta frontal tras privación). Es un control cualitativo, no una prueba.

## Fuentes

- TSFEL y tsfresh, tamaño y redundancia de los conjuntos de features: Henderson y Fulcher, *An Empirical Evaluation of Time-Series Feature Sets* (arXiv:2110.10914), https://arxiv.org/abs/2110.10914
- TSFEL en EEG de carga mental: https://arxiv.org/pdf/2202.12937
- Lista de features de TSFEL (parámetro `fs`): https://tsfel.readthedocs.io/en/latest/descriptions/feature_list.html
- Validación dejando una persona fuera y SHAP en EEG: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12899994/ y https://arxiv.org/html/2605.18251
- Categorías de métricas XAI (fidelidad, robustez/estabilidad, complejidad…) y sus críticas: Quantus (arXiv:2202.06861), https://ar5iv.arxiv.org/html/2202.06861 y https://arxiv.org/html/2206.11104v5
- EBM: Nori et al., *InterpretML* (2019), https://interpret.ml (no se encontró uso previo de EBM en EEG; esto es una elección del proyecto, no una práctica establecida).
