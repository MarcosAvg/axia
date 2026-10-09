# 0048 — Rediseño del tablero de métricas por pestañas

- Fecha: 2026-10-09
- Estado: aceptada

## Contexto

Tras el rediseño de interfaz (ADR 0038–0047), el tablero de `/metricas` seguía siendo un
**scroll largo** con todos los indicadores a la vez: una fila de KPI destacados y cuatro bloques
(Carga · Tiempos · Calidad · SLA) apilados, más gráficas, tablas y exportación repartidas dentro de
la tabla de dimensión. En pantallas normales el usuario debía desplazarse para llegar a lo que le
interesaba, y el selector de dimensión y la exportación quedaban lejos de los filtros. Es la última
vista pendiente de un rediseño total.

## Decisión

Rediseñar `/metricas` conservando **toda la lógica de dominio y las consultas** (mismas funciones
puras y hooks; no se toca RLS ni RPC):

- **Barra de herramientas sticky** (una sola tarjeta, siempre visible) que reúne en un lugar:
  - **Rangos rápidos**: 7 · 30 · 90 días y "Todo" (recalculan `from`/`to` sobre la fecha local).
  - **Fechas** desde/hasta y **filtros** por edificio, equipo, categoría y dependencia.
  - **Selector de dimensión** (equipo · edificio · categoría · dependencia) que mueve a la vez la
    gráfica, la tabla y la exportación.
  - **Exportación** CSV/XLSX de la tabla por dimensión y acción "Limpiar".
- **Fila de KPI destacados** siempre visible: tiquets, tiempo activo, SLA, satisfacción y primera
  solución (lo esencial sin desplazarse).
- **Pestañas por tema**: Resumen · Tiempos · Calidad · SLA y satisfacción. Cada pestaña muestra
  solo sus KPI, gráficas y tablas:
  - Resumen: volumen por día, por dimensión y antigüedad de abiertos.
  - Tiempos: KPI de tiempos y tabla por dimensión.
  - Calidad: KPI de calidad, pausas por motivo y duplicados.
  - SLA y satisfacción: cumplimiento, SLA por prioridad y calificación.
- **Componentes**: se extraen `MetricsToolbar`, `MetricsHero`, `MetricsTabs`, `MetricsExport` y
  `KpiGrid`; `DimensionTable` queda como tabla reutilizable sin selector ni exportación.

Se descarta, por ahora, mostrar el **delta contra el periodo anterior**: añade consulta y estado
extra sin una petición explícita; queda como mejora opcional.

## Alternativas consideradas

- **Solo reagrupar** los bloques existentes sin pestañas: no resuelve el scroll largo.
- **Menú lateral de secciones** en lugar de pestañas: más estructura de la necesaria para cinco
  bloques de contenido.
- **Dejar dimensión y exportación dentro de la tabla**: mantiene la duplicación de controles y
  aleja la exportación de los filtros.

## Consecuencias

- Cada tema se ve y se escanea sin desplazarse; la barra de herramientas concentra el control.
- La navegación por pestañas no se conserva en la URL (estado local); aceptable para una vista de
  análisis y reversible si se pide.
- Los componentes del tablero quedan más pequeños y con responsabilidad única, dentro de los
  límites de tamaño y complejidad del proyecto.
- Sin cambios de base de datos: la compuerta (`pnpm check`) se mantiene en verde con la misma
  cobertura de dominio (nueva prueba pura `rangeForDays`) y la regresión visual con capturas sigue
  como mejora opcional.
