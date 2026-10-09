# 0050 — Dimensiones simultáneas y periodo comparado visible

- Fecha: 2026-10-09
- Estado: aceptada

## Contexto

El selector "Agrupar por" del tablero (ADR 0048/0049) mezclaba dos conceptos en la barra de
filtros: **filtrar** (fechas y catálogos, que restringe todo el tablero) y **agrupar** (dimensión,
que solo reformaba una gráfica, una tabla y la exportación, y encima en otra pestaña). En la
práctica parecía no hacer nada. Además, los deltas decían "vs periodo anterior" sin decir contra qué
fechas se comparaba, y el botón "7 días" seleccionaba en realidad **8** días (por el cálculo
`now − 7` con comparación inclusiva).

## Decisión

- **Sin selector de dimensión.** Se quita "Agrupar por" de la barra (que queda solo para filtrar).
- **Todas las dimensiones a la vez**, en la pestaña **Resumen**: una **rejilla de cinco gráficas**
  (Equipo · Edificio · Categoría · Dependencia · Solicitante, trabajo activo promedio) y una
  **tabla combinada** con columna "Dimensión". La **exportación** CSV/XLSX incluye la columna
  "Dimensión". El helper `allDimensions` concatena las agrupaciones.
- **KPI globales**: al no haber dimensión seleccionada, los KPI de Tiempos y Calidad se mantienen
  del rango y catálogos (sin desglose).
- **Periodo anterior visible**: el delta muestra las fechas comparadas ("vs 30 sep – 7 oct").
- **Rango correcto**: `rangeForDays` devuelve exactamente N días (terminando hoy); el periodo
  anterior tiene la misma longitud.

## Alternativas consideradas

- **Mantener el selector con opción "Todas"**: mismo resultado por defecto pero con un control
  extra; se prefiere quitarlo por completo.
- **Una tabla por dimensión en secciones**: más repetitivo; una tabla combinada con columna
  "Dimensión" es más compacta.
- **Desglosar los KPI por dimensión**: sin sentido al no haber dimensión activa.

## Consecuencias

- El Resumen es más largo (cinco gráficas + tabla), pero muestra de una vez todo el análisis por
  dimensión y elimina la ambigüedad del selector.
- Los KPI quedan puramente globales del rango; el detalle dimensional vive en el Resumen.
- La regresión visual (`pnpm test:visual`) se actualiza; la compuerta sigue en verde.
