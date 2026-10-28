# Conectividad funcional EEG en BATIMIX: informe de decisión

**Proyecto:** BATIMIX, DS5343 Visualización de Datos (UTEC, 2026-2). **Equipo:** Jimena Gurbillon, Andrea Coa, Paolo Medrano.
**Fecha:** 27 de octubre de 2026. **Alcance:** decidir si en las tres semanas previas a la entrega final (18 de noviembre de 2026) se agrega una vista de conectividad funcional a nivel de cuero cabelludo (matriz o grafo; NS, SD y Δ). La entrega de la semana 12 (28 de octubre) no incluye conectividad.

**Convención de evidencia.** **[Verificado]**: comprobado en un archivo del repositorio (ruta y línea; en cuadernos, número de celda) o en una fuente abierta durante esta revisión (códigos R1 a R17, con URL en la sección 8). **[Inferencia]**: deducción razonada a partir de lo verificado. **[Propuesta]**: recomendación de este informe. Las rutas son relativas a `data-visualization-project/`.

## 1. Resumen ejecutivo

**Recomendación: descartar** la vista de conectividad en el plan de las tres semanas finales y dejarla documentada como trabajo futuro.

1. Aportaría una tarea nueva (acoplamiento entre regiones) que ninguna vista univariada actual resuelve [Inferencia].
2. Respaldo débil con ojos abiertos, la única condición de los 71: el estudio más parecido no halló cambios [Verificado, R1].
3. El pipeline (referencia FCz, sin ICA, sin EOG) habría que rehacerlo [Verificado, `02_eeg_pipeline.ipynb` celda 5; R16].
4. 1830 aristas frente a una potencia que no sobrevive FDR con 61; con n = 30 en PVT, ρ detectable ≈ 0.49 [Inferencia, 3.5].
5. Matriz: «sin conectividad» 29/40 y grafo coordinado 24/40; ni un prototipo exitoso invierte el orden [Inferencia, sección 5].

## 2. Revisión bibliográfica

### 2.1 Búsqueda y límites

Se usaron búsqueda web, Europe PMC (texto completo vía API; indexa PubMed y PMC), páginas de editoriales y Crossref para confirmar cada DOI. PubMed y PMC respondieron con verificación antibots, y Google Scholar no se consultó. El enlace de Springer de la consigna redirige a un inicio de sesión, así que el artículo se leyó completo en Europe PMC (PMC4108786). Un artículo de congreso sobre ds004902 (EUDL) devolvió error 403 y quedó excluido. Solo se reportan referencias abiertas. De R5 solo fue accesible el resumen, y de R9 a R14 se leyó el resumen.

### 2.2 Estudios de conectividad y privación de sueño

**Tabla 2a. Diseño** (OA: ojos abiertos; OC: ojos cerrados)

| Ref. | Población y protocolo | Canales y preprocesamiento | Medida y bandas | Red y métricas |
|---|---|---|---|---|
| R1 Verweij et al., 2014 | n = 8 (5 H), 22 ± 1.8 años; NS frente a privación total en casa (horas no indicadas); 5 sesiones de 10:30 a 16:30; 4 min alternando 1 min OA y OC | 61 canales equidistantes; registrado con referencia Cz, re-referenciado a promedio; ICA ocular; interpolación; 8 épocas de 8 s por sesión | *Synchronization likelihood*; δ, θ, α, β, γ | Binaria con grado medio fijo K = 5 a 8; *clustering* (C) y longitud de camino (L) por electrodo |
| R2 Lian et al., 2023 | 42 reclutados (15 M), 2 excluidos; línea base, 24 h y 36 h | 64 canales, 1000 Hz; mastoides a promedio; ICA; segmentos de 2 s; 4 min OC | PLV en fuentes (*beamformer*, AAL-90); 5 bandas | Matriz 90 × 90; NBS |
| R3 Ma et al., 2023 | 19 varones (24 reclutados); 36 h; descanso a las 08:00 y privación a las 20:00 | 32 canales; promedio; ICA; OA y OC | Coherencia efectiva aislada (iCoh) en fuentes eLORETA; δ a γ | ROI de la red por defecto y sensoriomotora |
| R4 Mason et al., 2024 | 13 analizados (de 22; 2 M); rutina constante de 40 h; EEG cada 2 h; PVT de 10 min | 18 canales; promedio; solo OC; una época de 30 s por línea base | *Phase locking factor* con sustitutos IAAFT; aristas de desfase cero eliminadas; α para métricas basales | Fuerza nodal, C, L y «estabilidad» de la red |
| R5 Yuan et al., 2025 (solo resumen) | 28 enfermeras de turno noche; descansadas frente a tras el turno | Canales no indicados en el resumen; EEG durante PVT y 2-back (tarea, no reposo) | wPLI; θ y β | Métricas globales y nodales |
| R6 Kumar et al., 2025 | **ds004902 v1.0.8**, 71 participantes (1 excluido); OA | 256 Hz; 0.2 a 45 Hz; ICA con ICLabel; promedio; épocas de 20 s | PLV y coherencia promediadas sobre pares; δ, θ, α, β | Métricas de grafo sobre PLV ponderado, usadas como rasgos de clasificación |

**Tabla 2b. Resultados y utilidad**

| Ref. | Estadística | Resultados | Limitaciones | Similitud con ds004902 | Reutilizable |
|---|---|---|---|---|---|
| R1 | t pareada por electrodo y permutación por clústeres (1000) | Con OC, C en α baja y L en θ sube en electrodos prefrontales, de forma robusta para todo K. **Con OA no hubo cambios en ninguna banda.** La caída de potencia α media en parte el cambio de C en α | n = 8; métricas binarias dependientes del umbral; sin EEG de sueño | Alta en montaje y diseño intra-sujeto; baja en condición | Exigir robustez entre umbrales; probar mediación por potencia; hipótesis de θ frontal |
| R2 | NBS con 5000 permutaciones y umbral primario p < 0.0001 | Solo en α: menor PLV en las redes por defecto, atencional y visual (24 h) y en las redes por defecto, visual y sensoriomotora (36 h) | Sin medidas conductuales; desbalance de sexo | Media: intra-sujeto y ≈ 24 h, pero OC y en fuentes | NBS para controlar el error por familia |
| R3 | t pareadas, SnPM (5000); FDR para PVT | Cambios en β; correlaciones con PVT de r ≈ 0.48 que no sobreviven FDR | n pequeño, solo varones; confusión circadiana (08:00 frente a 20:00) | Baja a media | Reportar como exploratorio lo que no sobrevive la corrección |
| R4 | Permutación (10 000); Benjamini-Hochberg | Mayor fuerza nodal, menor L y mayor estabilidad basales se asocian con resiliencia (DE del TR). En el análisis por punto temporal, ninguna asociación sobrevive la corrección múltiple | n = 13; 18 canales | Media en la pregunta (vulnerabilidad medida con PVT); baja en montaje y condición | Índices de vulnerabilidad basados en DE del TR y lapsos |
| R5 | No consta en el resumen | Durante el PVT, la red se vuelve más eficiente en θ y β, con lateralización derecha | Solo resumen; EEG de tarea | Baja | wPLI en θ como precedente de medida |
| R6 | Validación cruzada anidada, por sujeto y por época | Exactitud por sujeto ≈ 0.68; por época ≈ 0.95, inflada por una fuga que los autores reconocen. Los rasgos principales son la modulación de amplitud θ frontal y la coherencia β. **No hay pruebas de grupo sobre conectividad** | Sin réplica externa; sensibilidad a la referencia no evaluada | Máxima (mismo dataset) | Preprocesamiento de referencia para ds004902 (ICA y referencia promedio) |

### 2.3 Notas breves

- **R1** es el precedente más cercano en montaje y pregunta (pérdida de conectividad frontal). Su resultado nulo con ojos abiertos es el dato más relevante para ds004902, donde solo los ojos abiertos cubren a los 71 participantes y los cerrados a un subconjunto de 38 [Verificado, R1; R7].
- **R2 y R3** trabajan en fuentes, con ojos cerrados y bandas α o β. No respaldan una hipótesis de θ a nivel de sensores [Verificado, R2, R3].
- **R4** es el único estudio que vincula redes EEG con vulnerabilidad medida por PVT, con n = 13 y resultados que en parte no sobreviven la corrección [Verificado, R4].
- **R6** confirma que ds004902 se puede procesar con ICA y referencia promedio, y que la conectividad no es el rasgo dominante para distinguir NS de SD. No ofrece contrastes de grupo [Verificado, R6].
- **Contexto del dataset (R7):** referencia en línea FCz, impedancia < 5 kΩ, privación de 24 a 30 h. La validación técnica de los autores usó referencia promedio, ICA y 75 épocas de 4 s, sin análisis de conectividad. En el PVT, la DE del TR (t(29) = −7.31) y los lapsos (t(29) = −4.72) cambiaron, pero **la mediana del TR no** (t(29) = 0.04, p = 0.97) [Verificado, R7].
- **R8 (Cui et al., 2026, mismo dataset)** no calcula conectividad, y advierte que su medida no debe leerse como reconfiguración dinámica de redes. Usa referencia promedio, ICA y un filtro de 1 a 30 Hz, y reporta ρ ≈ 0.54 (frontal) y 0.56 (centro-temporal) con n = 28 [Verificado, R8].
- **Metodológicos (R9 a R14):** wPLI (R9), PLI (R10), coherencia imaginaria (R11), NBS (R12), errores frecuentes de interpretación (R13) y Laplaciano de superficie (R14).

### 2.4 Evidencia faltante

En esta búsqueda acotada no se encontró: (a) ningún estudio con conectividad θ en reposo, ojos abiertos y a nivel de sensores tras privación que reporte efectos que sobrevivan la corrección; (b) ningún vínculo entre conectividad EEG en reposo y vulnerabilidad por PVT con n ≥ 30 (los mayores fueron n = 19 y n = 13); (c) ningún análisis de grupo de conectividad sobre ds004902. Esto describe lo encontrado, no prueba que no exista [Inferencia].

## 3. Decisiones metodológicas ajustadas al dataset

Estas decisiones describen cómo debería hacerse el análisis si se retomara, y sustentan el puntaje de riesgo de la sección 5.

### 3.1 Banda

θ (4 a 8 Hz) sería la banda primaria, coherente con la métrica del proyecto (`BAND_THETA`, `02_eeg_pipeline.ipynb` celda 1) y con el aumento de L en θ frontal que reporta R1 con ojos cerrados [Verificado; Propuesta]. α (8 a 13 Hz) entraría solo como sensibilidad, porque los hallazgos de conectividad más fuertes están en α (R1, R2, R4) [Verificado]. Con ojos abiertos el α está atenuado, así que no debería entrar en la aplicación [Inferencia].

### 3.2 Medida

| Medida | Qué captura | Conducción de volumen y referencia común | Lectura para ds004902 |
|---|---|---|---|
| Coherencia | Amplitud y fase | Puede inflarse de forma espuria (R9, R10) | Con referencia FCz reflejaría sobre todo la referencia y la mezcla instantánea [Inferencia] |
| PLV | Consistencia de fase | Puede inflarse de forma espuria (R9) | Mismo problema |
| Coherencia imaginaria | Solo la parte desfasada | Fuentes independientes no la inflan (R11) | Pierde el acoplamiento real a desfase cero y depende de la amplitud |
| PLI | Asimetría de los desfases | Casi no cambia con el montaje (R10) | Es discontinuo, lo que lo hace sensible al ruido (R9) |
| wPLI y wPLI² sin sesgo | PLI ponderado por la parte imaginaria | Menos sensible al ruido, con más potencia, y una versión sin sesgo por tamaño muestral (R9) | Disponible como `wpli2_debiased` (R15) |

**[Propuesta]** Medida primaria: `wpli2_debiased`. Sensibilidad: `imcoh`. Ambas se obtienen en una sola llamada (R15). La coherencia y el PLV quedan descartados como medida primaria.

### 3.3 Referencia, conducción de volumen y artefactos

- Los datos usan FCz como referencia en línea [Verificado, R7; `deliveries/week04/README.md` l. 75], y el cuaderno nunca re-referencia: aplica notch, pasa-banda, interpolación y épocas, sin `set_eeg_reference` [Verificado, `02_eeg_pipeline.ipynb` celda 5]. FCz queda entre la ROI frontal (Fz en y = 0.58) y la centro-temporal (FC1 y FC2 en y = 0.32) [Verificado, `deliveries/week10/data/coords.json`]. Por eso el problema de la referencia común (R13) afectaría justo a las regiones que estudia el proyecto [Inferencia].
- Todos los estudios revisados usan referencia promedio (R1 a R4, R6 a R8) [Verificado]. Primero habría que recuperar FCz como canal (`mne.add_reference_channels`) y luego promediar [Propuesta].
- El Laplaciano de superficie (CSD) no depende de la referencia y reduce la conducción de volumen (R14), por lo que serviría como análisis de sensibilidad (`mne.preprocessing.compute_current_source_density`). Requiere posiciones, y hay un `electrodes.tsv` por sesión [Verificado, R16; `02_eeg_pipeline.ipynb` celda 4].
- **Ojos:** el dataset no tiene canales EOG (`"EOGChannelCount": 0`) [Verificado, R16] y el pipeline no aplica ICA [Verificado, celda 5]. Es plausible que la privación cambie la cantidad de parpadeos y movimientos oculares lentos. Así, un artefacto frontal pasaría a ser una diferencia por condición, que podría imitar una «pérdida de conectividad frontal» [Inferencia]. Mitigación: ICA con ICLabel como en R6, registro de épocas rechazadas por condición y una prueba de que el Δ de wPLI frontal no sigue al Δ de potencia lenta frontopolar [Propuesta].
- **Relación señal-ruido:** las estimaciones dependen de la SNR (R13), y en R1 la potencia α media parte del cambio de conectividad [Verificado]. Por eso conviene mostrar el Δ de potencia junto al Δ de conectividad [Propuesta].

### 3.4 Épocas

75 épocas de 4 s suman 300 s, una cantidad comparable a la literatura: R1 usó 8 épocas de 8 s × 5 sesiones (320 s), R2 4 min, R4 una época de 30 s y R6 épocas de 20 s [Verificado]. La documentación estima la conectividad a través de las épocas y advierte que pocas épocas dan resultados poco fiables, sin fijar un mínimo [Verificado, R15]. Hay 8 grabaciones con menos de 75 épocas, con un mínimo de 59 [Verificado, `deliveries/week06/DataAnalysis.md` l. 59-61]. Como el sesgo depende del tamaño muestral (R9), habría que igualar el número de épocas entre NS y SD por sujeto [Propuesta]. **Conclusión:** alcanzan para una estimación estática por sujeto y condición. No alcanzan para conectividad dinámica, que sería el análogo de la «variabilidad» del proyecto [Inferencia].

### 3.5 Estadística y potencia

61 electrodos dan 61 × 60 / 2 = 1830 aristas. En potencia, ningún electrodo sobrevive FDR, ni en σ ni en μ [Verificado, `deliveries/week10/PrototypeReport.md` l. 117], y la ROI frontal da p = 0.129 [Verificado, `DataAnalysis.md` l. 175].

| Pruebas (Bonferroni, α = 0.05) | Efecto pareado mínimo detectable (d_z, n = 68, potencia 80 %) |
|---|---|
| 1 | 0.35 |
| 6 (pares de ROI) | 0.43 |
| 61 (electrodos) | 0.53 |
| 1830 (aristas) | 0.65 |

[Inferencia: cálculo con t no central.] Para PVT, con n = 30 el ρ mínimo detectable es ≈ 0.49, y la potencia para ρ = 0.3 es ≈ 0.36 [Inferencia: aproximación de Fisher]. El equipo no replicó el ρ ≈ 0.55 de R8 (obtuvo ρ = −0.10) [Verificado, `DataAnalysis.md` l. 191].

**[Propuesta] Jerarquía de pruebas:**
1. Con las 3 ROI del proyecto (16, 28 y 17 canales; celda 2) salen 6 valores: 3 dentro de cada ROI y 3 entre ROI. Se usaría una prueba de permutación pareada por cambio de signo (10 000) con corrección de Holm.
2. El nivel de electrodo sería solo exploratorio, con NBS (R12) y umbral primario fijado de antemano.
3. La relación con la conducta solo a nivel de ROI, con 1 o 2 correlaciones preespecificadas e intervalo de confianza, nunca arista por arista.

Sin métricas de grafo, porque dependen del umbral: R1 solo aceptó resultados robustos para todo K [Verificado, R1].

### 3.6 Qué significa y qué no

La conectividad funcional mide dependencia estadística de fase entre señales de sensores. No implica causalidad ni conexión anatómica, y los nodos son sensores, no fuentes: «frontal» es una etiqueta del cuero cabelludo. Un cambio puede deberse a SNR, a una fuente común o a artefactos (R13). Esta advertencia tendría que ser visible en la vista, no solo en «Método» [Propuesta].

## 4. Factibilidad técnica

**4.1 Datos.** El EEG crudo no está en el repositorio (punteros git-annex de 205 bytes) [Verificado, `DataAnalysis.md` l. 212-218]. El listado de S3 del 27-10-2026 da 1231 objetos y 8.90 GB en total. Ojos abiertos: 142 grabaciones, 6.11 GB. Ojos cerrados: 76 grabaciones, 2.79 GB [Verificado, R16]. Cada `.fdt` con ojos abiertos ocupa 36.6 MB, es decir 61 canales × 150 000 muestras × 4 bytes [Verificado, R16]. Comando sugerido, que extiende `deliveries/week04/acquisition.md` l. 12 [Propuesta]:

```
aws s3 sync --no-sign-request s3://openneuro.org/ds004902 ./ds004902 --exclude "*" --include "participants.tsv" --include "*_electrodes.tsv" --include "*task-eyesopen*"
```

**4.2 Cuaderno `04_connectivity_pipeline.ipynb`** [Propuesta]: reutilizaría `find_recordings`, `session_to_condition`, `build_montage` y `detect_bad_channels` (celdas 3 y 4) y el mismo filtrado (celda 5). A eso sumaría: FCz recuperado y referencia promedio; ICA (opcional pero recomendable); épocas de 4 s con tope de 75, igualadas entre NS y SD; `spectral_connectivity_epochs(epochs, method=["wpli2_debiased", "imcoh"], mode="multitaper", fmin=(4, 8), fmax=(8, 13), faverage=True)`; repetición con CSD; agregación por ROI; y exportación a JSON. MNE-Connectivity va en la versión 0.9.0 (24-08-2026), requiere Python ≥ 3.10 y mne ≥ 1.6, y su documentación anuncia cambios incompatibles en la v1.0 [Verificado, R15, R17]. `requirements.txt` no fija la versión de `mne` (l. 11) [Verificado], así que convendría fijar ambas [Propuesta].

**4.3 Cómputo.** El pipeline actual procesa 218 grabaciones en unos 15 a 20 min [Verificado, `02_eeg_pipeline.ipynb` celda 0]. Para la conectividad de 136 grabaciones (68 × 2), el costo lo dominarían los espectros cruzados de 1830 pares: de segundos a decenas de segundos por grabación. La ICA sería el paso más caro, de minutos por grabación. En total, del orden de 1 a 3 h desatendidas [Inferencia; no se midió, porque no había un entorno MNE local en esta revisión].

**4.4 JSON.** Tamaños actuales en `deliveries/week10/data/` [Verificado]:

| Archivo | Bytes |
|---|---|
| coords.json | 1 063 |
| topo.json | 16 439 |
| participants.json | 19 160 |
| subject_epochs.json | 146 673 |
| topo_by_subject.json | 484 931 |
| data.js (respaldo empaquetado) | 667 794 |

Un `conn.json` compacto [Inferencia, estimación]:
- matriz de grupo 3 × 3 (6 celdas) con NS, SD, Δ, p y p de Holm: < 1 KB;
- ROI por sujeto (68 × 6 × 2 = 816 valores): unos 6 a 8 KB;
- aristas de grupo por electrodo (1830 × 3 valores, en arreglos indexados en el orden de `coords.json`): unos 40 KB, para poder ajustar el umbral en el navegador.

Las matrices por sujeto y electrodo (68 × 2 × 1830 = 248 880 valores, unos 1.7 MB) no deberían exportarse. Un archivo nuevo obliga a sumarlo a `FILES` (`js/main.js` l. 4) y a regenerar `data.js` (`deliveries/week10/README.md` l. 75-78) [Verificado].

**4.5 Vista y coordinación** [Propuesta]. Los nodos irían en las posiciones de `COORDS`, con la misma transformación del topomapa (`translate(cx+x·R, cy−y·R)`, `js/topomap.js` l. 93), nunca con un *force layout*. La vista reutilizaría `S.cond` para NS, SD y Δ (`js/core.js` l. 74-76) y los eventos `select`, `hover` y `pin` del bus (`core.js` l. 73; `topomap.js` l. 174). Con una selección, solo recalcularía la matriz de ROI y sin valores p, igual que el topomapa (`topomap.js` l. 33-35). Pasar el cursor por un electrodo mostraría solo sus aristas. FCz no está entre las 61 claves de `coords.json` [Verificado], así que habría que excluirlo o darle una posición.

**4.6 Control del desorden** [Propuesta]. Por defecto se vería solo la matriz de ROI, y las aristas por electrodo, bajo demanda. En Δ se mostraría solo la componente NBS, si existe; si no, las k = 20 a 30 aristas de mayor |Δ|, rotuladas «magnitud, no significancia». Se ocultarían los pares de vecinos inmediatos, los más expuestos a la conducción de volumen [Inferencia]. El ancho codificaría |Δ| con la escala divergente del topomapa (`C.div`, `core.js` l. 39), y el umbral sería el mismo para NS y SD.

## 5. Matriz de decisión

Opciones: **A** sin conectividad; **B** matriz de conectividad; **C** grafo interactivo independiente; **D** grafo coordinado con el topomapa. En todos los criterios, 5 es lo más favorable.

**Tabla 5a. Rúbrica**

| Criterio | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| C1 Novedad analítica | Redundante con las vistas actuales | Solo cambia la forma | Tarea nueva, en parte resoluble hoy | Tarea nueva no resoluble hoy | Tarea nueva y enlazada a las vistas actuales |
| C2 Relevancia para Q1 a Q7 | Exige otra pregunta y desvía esfuerzo | Tangencial a una pregunta | Neutra (estado actual) | Profundiza una pregunta con métrica complementaria | Refuerza dos o más preguntas con la métrica central |
| C3 Respaldo bibliográfico (reposo, OA, sensores, θ) | Ningún estudio | Solo condiciones no comparables, o nulos en la comparable | Al menos un estudio comparable con efecto corregido | Varios estudios consistentes | Replicado, incluso en el mismo dataset |
| C4 Factibilidad en 3 semanas | Sacrifica entregables obligatorios | Solo recortando otro trabajo | Cabe con margen estrecho | Cabe con margen | Sin trabajo adicional |
| C5 Esfuerzo (horas-persona) | Más de 40 h | 24 a 40 h | 12 a 24 h | Menos de 12 h | 0 h |
| C6 Riesgo metodológico | Alto, sin mitigación posible, y el diseño lo amplifica | Alto, con mitigación parcial | Moderado, con mitigaciones validadas | Bajo, limitaciones documentadas | Sin riesgo nuevo |
| C7 Utilidad para la audiencia | Induciría a error | Poco útil o difícil de relacionar | Neutra (estado actual) | Útil e integrada al cribado | Indispensable |
| C8 Facilidad de evaluación | No evaluable a tiempo | Requiere un experto difícil de conseguir | Requiere sensibilidad y pruebas de tareas | Comprobaciones simples | Nada nuevo que evaluar |

**Tabla 5b. Puntajes** [Inferencia, con base en las secciones 2 a 4]

| Criterio | A | B | C | D | Justificación |
|---|---|---|---|---|---|
| C1 | 1 | 4 | 4 | 5 | B y C permiten preguntar qué pares de regiones cambian su acoplamiento. D además contrasta en un mismo lugar dónde cambia la potencia y dónde cambia el acoplamiento |
| C2 | 3 | 2 | 2 | 4 | Ninguna pregunta pide conectividad. D profundiza Q4 (firma espacial de los vulnerables) usando la selección del *scatter* (Q3) [Verificado, `deliveries/week05/README.md` l. 92-98] |
| C3 | 3 | 2 | 2 | 2 | A tiene precedente en el mismo dataset (R8), no replicado por el equipo. Para conectividad: R1 es nulo con OA y R2 a R4 no son comparables |
| C4 | 5 | 3 | 2 | 2 | El cuaderno nuevo y la vista compiten con el artículo, el póster y la presentación |
| C5 | 5 | 3 | 2 | 2 | B ≈ 16 a 20 h; C ≈ 22 a 28 h; D ≈ 20 a 26 h (8 a 10 h de cuaderno y 12 a 16 h de vista coordinada) |
| C6 | 4 | 2 | 1 | 2 | A arrastra limitaciones ya documentadas. B y D cargan con FCz, ojos sin EOG y 1830 pruebas. C suma métricas de grafo que dependen del umbral |
| C7 | 3 | 3 | 2 | 4 | Un grafo aislado (C) invita a sobrelecturas. D integra el cribado, siempre que la medida sea válida |
| C8 | 5 | 3 | 2 | 3 | B y D requieren CSD, `imcoh`, fiabilidad y pruebas de tareas. C además exige validar sus métricas e interacción propias |
| **Total /40** | **29** | **22** | **17** | **24** | Beneficio (C1, C2, C3, C7): A 10, B 11, C 10, D 15. Costo (C4, C5, C6, C8): A 19, B 11, C 7, D 9 |

**Lectura.** D es la única opción de conectividad con un beneficio claro sobre A, pero pierde por costo y riesgo. Supongamos que un prototipo saliera bien: factibilidad, esfuerzo y riesgo subirían a 3, y D llegaría a 27, todavía por debajo de 29. Solo con un riesgo y una evaluación de 4 empataría. Sin C5, que se solapa con C4, el resultado no cambia (A 24, D 22). Por eso tampoco se justifica «prototipar primero» [Inferencia].

## 6. MVP

**No aplica**, por la recomendación de descartar. **Condiciones para reabrir** [Propuesta]:
- el equipo re-preprocesa los datos con ojos abiertos con referencia promedio e ICA por otro motivo (por ejemplo, para acercarse al pipeline de R8 en Q3 y Q5);
- las tres vistas y el borrador del artículo quedan congelados antes del 11 de noviembre.

Aun así, el alcance sería de 6 h como máximo, solo en cuaderno: una figura estática de wPLI θ por ROI (NS, SD y Δ) para un anexo exploratorio, nunca una vista D3. Las secciones 3 y 4 sirven de especificación.

**Impacto en el plan:** 0 h de conectividad, más 1 a 2 h para un párrafo de trabajo futuro en el artículo final. La responsable sugerida es Andrea, que propuso la extensión [Verificado, `deliveries/week06/reviewed_papers/README.md` l. 13; Propuesta].

## 7. Preguntas pendientes (por prioridad)

| # | Pregunta | Por qué importa | Fuente | Quién | ¿Bloquea? |
|---|---|---|---|---|---|
| 1 | ¿Se alinea el preprocesamiento con R7 y R8 (referencia promedio e ICA) o se mantiene FCz sin ICA? | Condiciona la validez de cualquier conectividad y es una explicación candidata de la no réplica de ρ ≈ 0.55 | R7, R8, R13 | Equipo con un experto en neurofisiología | Sí, para reabrir |
| 2 | ¿Acepta el curso, a esta altura, una pregunta nueva (Q8) o reformular Q4? | Sin pregunta, la vista no tiene una tarea evaluable | Instructor del curso | Equipo | Sí, para una vista D3 |
| 3 | ¿Qué métrica de PVT define la vulnerabilidad? El proyecto usa la mediana del TR (`core.js` l. 53), que en R7 no cambió a nivel de grupo | Afecta a Q3 y Q5 y a cualquier vínculo cerebro-conducta. R4 usa DE del TR y lapsos | R7, R4, R8 | Equipo con un experto | No para esta decisión; sí para Q3 y Q5 |
| 4 | ¿Qué fiabilidad (por ejemplo, entre mitades de épocas) y qué control de artefactos bastarían para mostrar aristas? | Sin criterios de calidad fijados de antemano, las aristas serían difíciles de defender | Experto; R13 | Experto en neurofisiología | Sí, para reabrir |
| 5 | ¿Alguien conserva la copia completa de ds004902 de la semana 6? | Evitaría descargar 6.1 GB | Equipos locales (`DataAnalysis.md` l. 14-17) | Equipo | No |
| 6 | ¿`electrodes.tsv` incluye la posición de FCz? | Hace falta para recuperar FCz y calcular CSD | `electrodes.tsv` en S3 | Equipo o dueño de los datos | No |
| 7 | ¿Cuántos participantes tienen ojos cerrados pareados? R1 solo halló efectos con OC | Sería una vía alternativa, con un n menor | `participants.tsv`; R16 (76 grabaciones con OC) | Equipo | No |
| 8 | ¿Qué diferencia horaria hay entre NS y SD por sujeto? R7 informa < 1.5 h en el 81.59 % | Riesgo de confusión circadiana, como en R3 | R7; autores del dataset | Dueño de los datos | No |
| 9 | ¿Le sirve la conectividad a quien hace cribado en fisiología del sueño? | La utilidad (C7) se supuso, no se midió | Prueba con usuarios | Equipo | No |

## 8. Referencias

Todas se abrieron durante esta revisión. Cada DOI se confirmó en Crossref (`api.crossref.org/works/<DOI>`).

- **R1** Verweij IM, Romeijn N, Smit DJA, Piantoni G, Van Someren EJW, van der Werf YD. Sleep deprivation leads to a loss of functional connectivity in frontal brain regions. *BMC Neuroscience*. 2014;15:88. https://doi.org/10.1186/1471-2202-15-88 (texto completo: https://www.ebi.ac.uk/europepmc/webservices/rest/PMC4108786/fullTextXML)
- **R2** Lian J, Xu L, Song T, Peng Z, Zhang Z, An X, Chen S, Zhong X, Shao Y. Reduced Resting-State EEG Power Spectra and Functional Connectivity after 24 and 36 Hours of Sleep Deprivation. *Brain Sciences*. 2023;13(6):949. https://doi.org/10.3390/brainsci13060949 (texto completo: Europe PMC, PMC10296734)
- **R3** Ma M, Li Y, Shao Y, Weng X. Effect of total sleep deprivation on effective EEG connectivity for young male in resting-state networks in different eye states. *Frontiers in Neuroscience*. 2023;17:1204457. https://doi.org/10.3389/fnins.2023.1204457 (https://www.frontiersin.org/journals/neuroscience/articles/10.3389/fnins.2023.1204457/full)
- **R4** Mason SL, Junges L, Woldman W, Ftouni S, Anderson C, Terry JR, Bagshaw AP. Associating EEG functional networks and the effect of sleep deprivation as measured using psychomotor vigilance tests. *Scientific Reports*. 2024;14:27999. https://doi.org/10.1038/s41598-024-78814-4 (texto completo: Europe PMC, PMC11564749)
- **R5** Yuan J, Xu M, Qian L, Gao L, Sun Y. Task-specific effects of sleep deprivation on cognitive function and EEG brain network in night-shift nurses. *Brain Research Bulletin*. 2025;233:111661. https://doi.org/10.1016/j.brainresbull.2025.111661 (solo resumen, en Europe PMC, PMID 41330225)
- **R6** Kumar D, Narayan A, Lalgudi Ganesan S. An EEG-based machine learning framework for diagnosing acute sleep deprivation. *Frontiers in Physiology*. 2025;16:1668129. https://doi.org/10.3389/fphys.2025.1668129 (texto completo: Europe PMC, PMC12665582)
- **R7** Xiang C, Fan X, Bai D, Lv K, Lei X. A resting-state EEG dataset for sleep deprivation. *Scientific Data*. 2024;11:427. https://doi.org/10.1038/s41597-024-03268-2 (texto completo: Europe PMC, PMC11043390)
- **R8** Cui Z, Xie T, Zhou Y, Gong P, Zhang X, Wang P. Exploring the differences in neural oscillation mechanisms before and after sleep deprivation. *Frontiers in Neuroscience*. 2026;20:1910878. https://doi.org/10.3389/fnins.2026.1910878
- **R9** Vinck M, Oostenveld R, van Wingerden M, Battaglia F, Pennartz CMA. An improved index of phase-synchronization for electrophysiological data in the presence of volume-conduction, noise and sample-size bias. *NeuroImage*. 2011;55(4):1548-1565. https://doi.org/10.1016/j.neuroimage.2011.01.055 (resumen)
- **R10** Stam CJ, Nolte G, Daffertshofer A. Phase lag index: Assessment of functional connectivity from multi channel EEG and MEG with diminished bias from common sources. *Human Brain Mapping*. 2007;28(11):1178-1193. https://doi.org/10.1002/hbm.20346 (resumen)
- **R11** Nolte G, Bai O, Wheaton L, Mari Z, Vorbach S, Hallett M. Identifying true brain interaction from EEG data using the imaginary part of coherency. *Clinical Neurophysiology*. 2004;115(10):2292-2307. https://doi.org/10.1016/j.clinph.2004.04.029 (resumen)
- **R12** Zalesky A, Fornito A, Bullmore ET. Network-based statistic: Identifying differences in brain networks. *NeuroImage*. 2010;53(4):1197-1207. https://doi.org/10.1016/j.neuroimage.2010.06.041 (resumen)
- **R13** Bastos AM, Schoffelen J-M. A Tutorial Review of Functional Connectivity Analysis Methods and Their Interpretational Pitfalls. *Frontiers in Systems Neuroscience*. 2016;9:175. https://doi.org/10.3389/fnsys.2015.00175 (resumen)
- **R14** Kayser J, Tenke CE. Issues and considerations for using the scalp surface Laplacian in EEG/ERP research: A tutorial review. *International Journal of Psychophysiology*. 2015;97(3):189-209. https://doi.org/10.1016/j.ijpsycho.2015.04.012 (resumen)
- **R15** Documentación de MNE-Connectivity 0.9.0: https://mne.tools/mne-connectivity/stable/generated/mne_connectivity.spectral_connectivity_epochs.html y https://mne.tools/mne-connectivity/stable/install.html
- **R16** OpenNeuro ds004902 en S3, listado del 27-10-2026: https://s3.amazonaws.com/openneuro.org?list-type=2&prefix=ds004902/ ; metadatos de `sub-02_ses-1_task-eyesopen_eeg.json` y `_channels.tsv` (solo lectura, sin descarga de señal)
- **R17** PyPI, historial de versiones de mne-connectivity: https://pypi.org/project/mne-connectivity/

Archivos del proyecto citados: `deliveries/week04/README.md`, `deliveries/week04/acquisition.md`, `deliveries/week05/README.md`, `deliveries/week06/DataAnalysis.md`, `deliveries/week06/reviewed_papers/README.md`, `deliveries/week06/code/02_eeg_pipeline.ipynb`, `deliveries/week10/PrototypeReport.md`, `deliveries/week10/README.md`, `deliveries/week10/js/core.js`, `deliveries/week10/js/main.js`, `deliveries/week10/js/topomap.js`, `deliveries/week10/data/`, `requirements.txt`.
