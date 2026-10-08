# 0024 — Tablero de métricas: Recharts, agregación y exportación

- Fecha: 2026-10-08
- Estado: aceptada

## Contexto

Los indicadores se calculan en la base (ADR 0021/0022) en vistas `security_invoker`. Falta la
interfaz. La convención del proyecto exige Recharts (componente `chart` de shadcn/ui) y no hay
gráficas instaladas. La especificación §11 pide muchos indicadores; se elige un primer tablero útil
sin duplicados ni SLA.

## Decisión

- **Sección `/metricas`** con el permiso `metrics.view` (enlace en el nav solo con el permiso). La
  RLS de las tablas subyacentes acota lo que cada quien ve.
- **Recharts 3.10.1** (MIT, soporta React 19) y un componente `chart` propio que sigue la API del
  `chart` de shadcn/ui (`ChartContainer`, `ChartTooltip`, `ChartTooltipContent`) adaptado a `cn`.
  Se implementa compacto para respetar los límites de líneas/complejidad del lint; el componente
  completo de shadcn los excede.
- **Datos y filtros**: el frontend lee `v_ticket_metrics_base` y `v_metrics_pauses_by_reason`, y
  **agrega con funciones puras** (filtros por rango de fechas y dimensión, KPI, volumen por día,
  por dimensión, antigüedad). Los nombres de dimensión salen de los catálogos del cliente.
- **Exportación CSV** en el cliente (Blob). XLSX queda fuera (agregaría dependencia).

## Alternativas consideradas

- **Función SQL con filtros** (`metrics_by_dimension(p_from, p_to)`): más eficiente a escala, pero
  innecesaria al inicio; se difiere.
- **Componente `chart` completo de shadcn**: choca con `max-lines`; se usó una versión compacta.
- **XLSX**: postergado por dependencia y licencia.

## Consecuencias

- El tablero no filtra por fecha en SQL; si crece el volumen se moverá la agregación a la base.
- Quedan pendientes los indicadores de **duplicados** en el tablero, la **satisfacción** (sin tabla
  de calificación) y el **SLA** (tramo aparte).
- Recharts queda como única librería de gráficas, conforme a la convención.
