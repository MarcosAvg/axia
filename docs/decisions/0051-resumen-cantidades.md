# 0051 — Resumen por cantidades y tiempos en su pestaña

- Fecha: 2026-10-09
- Estado: aceptada

## Contexto

Al mostrar todas las dimensiones a la vez en el Resumen (ADR 0050) quedaron ahí las métricas de
**tiempo** (trabajo activo promedio, tiempo total, fuera de horario), heredadas de cuando la tabla
por dimensión vivía en la pestaña Tiempos. Para el uso normal se quiere saber **cuántos tiquets**,
no cuánto tiempo; el tiempo pertenece a la pestaña **Tiempos**, donde además se filtra con la barra.

## Decisión

- **Resumen = cantidades**: las cinco gráficas por dimensión muestran **tiquets** (no tiempo) y la
  tabla combinada queda con **Dimensión · Agrupación · Tiquets · Reasignación · Recaptura**.
- **Tiempos = tiempos**: la pestaña Tiempos recupera el **desglose por dimensión con tiempos**
  (Dimensión · Agrupación · Tiquets · Trabajo activo · Tiempo total · Fuera de horario), debajo de
  sus tarjetas de KPI.
- La **exportación** del tablero mantiene todas las columnas (cantidades y tiempos).

## Alternativas consideradas

- **Dejar los tiempos en el Resumen**: lo aleja del lugar natural y confunde la lectura rápida.
- **Tabla solo con Tiquets en el Resumen**: se conservan las tasas de reasignación y recaptura, que
  no son tiempos y dan contexto de calidad.

## Consecuencias

- El Resumen responde de inmediato "cuántos" por dimensión; el detalle temporal vive en Tiempos.
- Sin cambios de dominio ni de base de datos; se actualiza la captura visual del Resumen.
