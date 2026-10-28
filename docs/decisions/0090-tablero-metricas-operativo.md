# 0090 — Tablero de métricas: jerarquía, una forma por dato y densidad

- Fecha: 2026-10-28
- Estado: aceptada

## Contexto

El tablero acumulaba indicadores en tarjetas grandes, un contexto de filtros que ocupaba 90–175 px
y cinco pestañas con el mismo molde: franja de KPIs, barras y tabla. Los datos se repetían
—cumplimiento de SLA, trabajo activo, tiquets por técnico, duplicados y dimensiones— y siete de
nueve visualizaciones eran barras verticales. En escritorio se leía como un móvil estirado y no
decía qué pregunta respondía cada sección.

Se evaluó apilar las secciones en una página con anclas. Se descartó: las pestañas ya funcionan y
evitaron duplicar paneles con `useMediaQuery`.

## Decisión

- **El contexto no ocupa una franja fija.** Periodo y filtros viven en dos popovers; la exportación
  en un menú. La barra queda en una fila (~44 px) y los chips solo aparecen con filtros activos.
- **La salud deja de ser fija.** Cuatro cifras compactas (tiquets, trabajo activo, SLA,
  satisfacción) encabezan **Resumen**; no se repiten en las demás pestañas.
- **Un dato, un lugar.** Cada indicador aparece una vez. Las cifras de la franja de salud no se
  repiten como tarjetas; las tablas no repiten la gráfica; la vista promedio/acumulado solo vive en
  Tiempos.
- **Una forma por tipo de dato.** Área para evolución, barra apilada para composición (ciclo,
  rechazos), Pareto para motivos, bullet para objetivos, radial para satisfacción y barras dentro de
  tablas para rankings y distribuciones. Se retiran las barras verticales genéricas.
- **Estructura por pregunta.** Resumen (¿cómo va el periodo?), Tiempos (¿en qué se va?), Calidad
  (¿dónde hay retrabajo?), SLA (¿cumplimos?) y Equipo (¿quién carga qué?).
- **Tiempos** muestra el ciclo en una sola barra de fases —respuesta, asignación, trabajo activo,
  validación y pausas/esperas— y una tabla por dimensión con barras.
- **Calidad** usa medidores neutros para las tasas (sin umbrales inventados), una tabla con barra
  para duplicados, Pareto para pausas y barra apilada para rechazos.
- **SLA** usa bullet por prioridad y un gauge radial para satisfacción.
- **Equipo** es una sola tabla con barra de participación; se elimina la gráfica duplicada.
- Las dimensiones se eligen con un selector compacto, no con un segundo nivel de pestañas.

## Consecuencias

- Se retiran `metrics-hero`, `metric-card`, `metrics-kpis`, `dimension-chart`, `technician-chart`,
  `duplicate-rate-chart`, `sla-priority-chart` y `routing-cards`. Se añade `popover` sobre
  `radix-ui`, ya instalado; no hay dependencias nuevas.
- Los conteos de pg llegan como texto: se normalizan en `metrics-api` y en `mergeBy` del servidor,
  con prueba unitaria. Sin eso, las barras de rechazos y duplicados quedaban en cero y el texto
  mostraba `02` en lugar de `2`.
- La regresión visual cubre 1280, 1440, 390 y la pestaña Tiempos; el E2E cubre el periodo en
  popover, los filtros, el selector de dimensión y las pestañas en móvil.
- Los umbrales de “bueno/malo” no se inventan: los medidores de calidad son neutros y el color del
  delta conserva `lowerIsBetter`.
