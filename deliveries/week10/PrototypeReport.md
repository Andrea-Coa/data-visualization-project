# BATIMIX — Reporte del prototipo funcional (Semana 10)

**Curso:** DS5343 Data Visualization, UTEC, semestre 2026-2
**Equipo:** Jimena Gurbillon, Andrea Coa, Paolo Medrano
**Dataset:** OpenNeuro ds004902, EEG de reposo y privación de sueño, 71 participantes (68 con EEG pareado)
**Fecha:** 14 de octubre de 2026

## Problema y audiencia

La vulnerabilidad a la privación de sueño es un rasgo individual: ante la misma falta de sueño, algunas personas se deterioran mucho y otras casi nada, y el promedio grupal diluye esa diferencia (Van Dongen et al., 2004).

La audiencia es el investigador en fisiología del sueño que hace screening exploratorio sobre datos públicos. Busca correlatos fisiológicos candidatos de la vulnerabilidad antes de comprometerse con un modelo formal. La decisión que apoya la herramienta es cuáles canales, regiones y covariables merecen una prueba estadística formal. No es diagnóstica ni predictiva.

## Funcionalidades implementadas

Todas las vistas usan datos reales procesados por el equipo en la Semana 6: EEG de ojos abiertos, 75 épocas de 4 s por registro, potencia theta.

### 1. Historia por escenas (flujo analítico principal)

Un escenario SVG fijo y siete bloques de texto que se activan al desplazarse, mediante IntersectionObserver. Los 68 puntos son siempre las mismas 68 personas y viajan entre escenas (constancia de objeto):

| Escena | Qué muestra | Cifra real que cita |
|---|---|---|
| Portada | Cuadrícula de 68 personas, ordenada por Δσθ frontal | n = 68 pareado |
| El promedio | Enjambre sobre Δσθ frontal con la media marcada | media +0.0043; DE 0.023 (la media es ~1/5 de la dispersión) |
| Las personas | El mismo enjambre coloreado por signo del cambio | 39 más inestables, 29 más estables |
| Conducta | Dispersión Δσθ × ΔPVT; quienes no tienen PVT bajan a una franja | 30 con PVT; 27 más lentos; ρ = −0.10 [−0.44, 0.27]; 6 en el cuadrante vulnerable |
| Cuero cabelludo | Los puntos vuelan a los electrodos; el mapa Δσθ se abre desde el centro | 59/61 suben; 4 con p < 0.05; 0 tras FDR |
| Cinco minutos | Serie NS vs SD que se dibuja en el tiempo, media ± EE | SD > NS en 52/75 épocas; +3.3 % |
| Los vulnerables | Serie de los 6 vulnerables frente al resto | 0.119 → 0.158 (+33 %) frente a +1 % en el resto, con advertencia de n = 6 |

Todas las cifras se calculan en el navegador a partir de los JSON; ninguna está escrita a mano.

### 2. Explorador enlazado (interacciones principales)

- **Vulnerabilidad (conduce).** Dispersión del cambio NS→SD.
  - Eje X: Δσθ de la región activa.
  - Eje Y: marcador seleccionable (PVT, KSS, SSS, PANAS+, PANAS−).
  - Color: moderador seleccionable (perfil vulnerable, edad, PSQI, sexo, orden de sesión).
  - Cuadrante vulnerable sombreado, medianas punteadas y ρ de Spearman con IC 95 % y n.
  - Brush para seleccionar un grupo y clic para fijar un participante.
  - El hover usa la vecindad de Delaunay (radio de 16 px), así que no hace falta acertar al punto exacto.
  - Tabla equivalente con los mismos datos, operable con teclado.
- **Cuero cabelludo (responde).**
  - Campo interpolado por distancia inversa ponderada con isolíneas.
  - Alterna métrica (σ / μ) y condición (NS / SD / Δ). NS y SD comparten escala; Δ usa escala divergente centrada en cero.
  - Cada electrodo es enfocable y muestra NS, SD, Δ, Δ %, p y q-FDR.
  - Las franjas por región comparan la selección con los 68.
- **Cinco minutos (responde).**
  - Media ± error estándar por época, recalculada sujeto a sujeto para el grupo seleccionado.
  - El participante fijado aparece como serie punteada.
  - Reproducir recorre las 75 épocas; también se puede inspeccionar cada época con el cursor.
- **Estado global.**
  - Región EEG, n activo y botón para limpiar; <kbd>Esc</kbd> limpia todo.
  - Chips de cobertura: verde n ≥ 60, ámbar 30–59, rojo < 30.

### 3. Método y límites

Acordeón con datos, codificaciones, estadística y limitaciones, dentro de la misma página.

## Decisiones de diseño y alternativas consideradas

**Historia + explorador en vez de solo dashboard.** La versión anterior era un dashboard de panel único con una guía por preguntas. Funcionaba, pero obligaba a la audiencia a descubrir sola el hallazgo central: el promedio esconde respuestas opuestas. La historia lo muestra en orden y luego entrega el control. *Alternativa descartada:* el dashboard con guía, por su carga cognitiva inicial.

**Constancia de objeto: los mismos 68 puntos en todas las escenas.** Cada transición muestra a dónde va cada persona, en lugar de cambiar de gráfico. La dispersión conserva la escala X del enjambre: los puntos solo suben según su PVT o bajan a la franja "sin PVT". *Alternativa descartada:* cortes entre gráficos independientes, que rompen el vínculo entre personas y vistas.

**Faltantes visibles en vez de ocultos.** Las 38 personas sin PVT no desaparecen: bajan a una franja rotulada con su n. Ninguna vista sugiere más participantes de los que tiene.

**Honestidad estadística en el propio relato.** El mapa muestra p sin corregir y FDR a la vez. El texto dice que ninguna diferencia por electrodo sobrevive la corrección y advierte que n = 6 es una pista, no un hallazgo.

**Color con significado y validado.** Morado = NS, naranja rosado = SD. El par pasa el validador de la skill dataviz (separación para daltonismo ΔE ≥ 24, contraste ≥ 3:1) sobre el papel `#F7F6F3` y sobre blanco. Las escalas son divergentes solo donde hay cero natural (Δ). NS y SD comparten la escala secuencial. *Alternativa descartada:* la paleta neón sobre fondo oscuro de versiones previas, poco legible en proyector y con contraste dudoso.

**Estética claro editorial y minimalista.** Papel cálido, tinta carbón y bordes de 1 px, sin sombras pesadas. Newsreader para titulares, Schibsted Grotesk para el texto e IBM Plex Mono para cifras. El color queda reservado para los datos.

**Motion con propósito.** Se siguieron las skills animate y emil-design-eng:

- Los viajes narrativos duran 900 ms con ease-in-out fuerte (`cubic-bezier(0.77, 0, 0.175, 1)`) y un escalonado de 5 ms por punto.
- Dos momentos de autor: el mapa se abre radialmente con clip-path y las series se dibujan de izquierda a derecha.
- La interfaz del explorador queda bajo 300 ms: indicador deslizante en los controles segmentados (clip-path, 250 ms) y escala 0.98 al presionar.
- Con `prefers-reduced-motion` los puntos no viajan, se funden.

**Accesibilidad.**

- Cada gráfico del explorador tiene una alternativa sin cursor: tabla de datos, electrodos enfocables con teclado y cifras en texto.
- Foco visible en todos los controles.
- Los textos secundarios cumplen 4.5:1, verificado con el detector de impeccable.

## Limitaciones conocidas y elementos incompletos

1. El mapa por electrodo usa el promedio de los 68: los datos por electrodo no están desagregados por sujeto, así que no se recalcula con la selección. Como sustituto, las franjas por región sí siguen la selección. Conectar el mapa a la selección requiere exportar potencia por electrodo y sujeto en la Semana 6.
2. Las pruebas por electrodo son t pareadas exploratorias. Con FDR de Benjamini–Hochberg ninguna sobrevive para σ ni para μ.
3. Los grupos pequeños (vulnerables, n = 6) dan medias por época muy ruidosas. La escena final las muestra con su banda de error para no sobrevenderlas.
4. EEG pareado = 68 de 71: tres archivos estaban corruptos en origen (documentado en la Semana 6). PVT existe solo para 30, KSS para 32 y SSS para 33 de los 68.
5. En la historia, los puntos que vuelan a los electrodos y a la línea temporal son transiciones visuales y no codifican datos de esa persona. El texto y la leyenda lo aclaran al desvanecerse.
6. Falta la URL pública: el despliegue en GitHub Pages está documentado en el README y queda pendiente de que el equipo publique el repositorio.

## Preguntas para los revisores

1. ¿La transición de puntos-persona a electrodos se entiende como metáfora ("de personas a cuero cabelludo") o confunde, porque esos puntos dejan de representar personas?
2. ¿Conviene que el explorador comience con el cuadrante vulnerable ya seleccionado, para continuar la historia, o es mejor que arranque neutro como ahora?
3. En la escena de la dispersión, ¿la franja "sin PVT" comunica bien los faltantes, o preferirían ocultarlos y solo indicar el n?
4. Con el efecto por electrodo tan difuso, ¿vale la pena mantener el mapa interpolado o sería más honesto un mapa de puntos discretos con su p?
