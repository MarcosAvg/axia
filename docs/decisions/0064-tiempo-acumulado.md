# 0064 — Vista de tiempos: promedio o acumulado

- Fecha: 2026-10-10
- Estado: aceptada
- Relacionada: 0021 (tiempo laboral e indicadores), 0048 (pestañas de métricas), 0052 (panel ampliado)

## Contexto

Los indicadores de tiempo de Métricas (trabajo activo, fuera de horario, tiempo total, neto,
respuesta, asignación y validación) y la tarjeta "Trabajo activo" del Panel mostraban **solo el
promedio** por tiquet. Faltaba leer el **tiempo acumulado** (la suma de todos los tiquets del
periodo), útil para dimensionar la carga total y el esfuerzo invertido.

Los tiempos se calculan en el cliente a partir de los tiquets filtrados (`summarize` y
`byDimension`), así que la suma no requiere cambiar el servidor. La gráfica de pausas ya mostraba
un valor acumulado (suma de minutos), de modo que el concepto no era ajeno a la interfaz.

## Decisión

- Se añade **`sumActive`, `sumTotal`, `sumActiveExtra`, `sumNet`, `sumResponse`, `sumAssignment` y
  `sumValidation`** a `MetricsSummary`, y `sumActive`/`sumTotal`/`sumActiveExtra` a `DimensionRow`,
  junto a los promedios existentes. La comparación contra el periodo anterior aplica a ambos modos
  (suma contra suma).
- Un **control segmentado** ("Promedio" / "Acumulado") alterna la **vista de tiempos**. En
  **Métricas** vive en la barra; en el **Panel** aparece solo cuando el rol tiene indicadores de
  tiempo.
- La preferencia es **una sola** para las dos pantallas, se guarda en `localStorage`
  (`axia.time-aggregation`) mediante un **contexto** (`TimeAggregationProvider` /
  `useTimeAggregation`) y el módulo puro `lib/time-aggregation.ts`.
- El modo afecta los **KPI de tiempo**, las **columnas de tiempo por dimensión** y la
  **exportación** CSV/XLSX. Las etiquetas se marcan con el sufijo "(acumulado)" y los textos de
  ayuda explican el modo activo.
- **No** afecta a los indicadores que son tasas o promedios por naturaleza (SLA, satisfacción,
  reasignación/recaptura/reapertura), que no tienen un acumulado con sentido.

## Alternativas consideradas

- **Mostrar ambos valores a la vez** (promedio y suma en cada tarjeta): más denso y ruidoso; se
  prefirió un modo con control explícito.
- **Solo añadir columnas de acumulado a las tablas**: no cubría las tarjetas KPI, que es donde más
  se pidió.
- **Guardar el modo en la URL**: se dejó fuera por simplicidad; `localStorage` es suficiente y
  reversible. Añadir la URL después es directo.

## Consecuencias

- El acumulado es la **suma por tiquet**, no tiempo de reloj del periodo: varios tiquets pueden
  solaparse y la suma puede superar la duración del rango. Los textos de ayuda lo aclaran.
- Cambia la barra de Métricas (nuevo control): la **regresión visual** (opt-in) se regenera.
- `lib/time-aggregation.ts` concentra la preferencia; Métricas y Panel la comparten.
- Se separó `byDimension`/`DimensionRow` a `domain/dimensions.ts` (límite de líneas del dominio).
