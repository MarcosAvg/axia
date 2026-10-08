# 0021 — Tiempo laboral e indicadores (Fase 5A)

- Fecha: 2026-10-08
- Estado: aceptada

## Contexto

La especificación §7 y §11 exigen medir los tiempos en dos modos (calendario continuo y laboral
según jornadas configurables) y calcular un conjunto amplio de indicadores desde el historial,
sin guardar cifras sueltas. El tramo 6 de la Fase 1 ya dejó los tramos (`time_spans`) y los
calendarios (`work_calendars` con franjas semanales y días no laborables), pero el tiempo laboral
no se consumía y solo existía una vista base mínima de indicadores.

## Decisión

**Tiempo laboral.** El recorte se hace con `work_calendar_overlap(calendar_id, start, end)`, que
suma las intersecciones con las franjas del día de la semana, excluye días no laborables y
convierte con la zona horaria del calendario. El calendario de un tiquet es el del equipo
(`teams.work_calendar_id`, columna nueva) y, si es nulo, el de la instancia
(`instance_settings.default_calendar_id`). Sin calendario configurado el modo laboral coincide con
el calendario continuo. Además de `ticket_time_total/net/by_kind` (calendario) se agregan las
variantes `_laboral`.

**Indicadores.** Se calculan con vistas `security_invoker` (apoyadas en la RLS de lectura):
- `v_ticket_metrics_base`: por tiquet, todos los tramos en ambos modos, marcas (reasignación,
  recaptura, reapertura, evidencias, validaciones) y conteos (recapturas, reaperturas, auxiliares).
  **Excluye duplicados** (indicadores de desempeño).
- `v_metrics_by_dimension`: desempeño agregado por equipo, categoría, edificio, dependencia y
  solicitante (sumas, promedios y tasas).
- `v_metrics_duplicates_by_dimension`: tasa de duplicados por equipo, edificio, dependencia y
  solicitante (sobre todos los tiquets).
- `v_metrics_by_technician`, `v_metrics_pauses_by_reason`,
  `v_metrics_reject_cancel_by_reason`, `v_metrics_aging` y `v_metrics_routing`.

Se agrega el permiso `metrics.view` (administrador `all`; supervisor `buildings`) para acotar el
acceso a los tableros; las vistas siguen la RLS de las tablas subyacentes. Los tiempos objetivo
(SLA) y la satisfacción **no** entran en 5A.

## Alternativas consideradas

- **Calendario solo de la instancia:** los técnicos trabajan por turnos; se descartó a favor del
  calendario por equipo con respaldo global.
- **Recortar en la aplicación:** el cálculo debe vivir donde están los datos y ser auditable.
- **Una vista por dimensión:** se prefirió una vista larga (`dimension` + `dimension_id`) sobre
  `GROUPING SETS` para no multiplicar objetos casi idénticos.

## Consecuencias

- El modo laboral depende de que exista un calendario con franjas; sin franjas el tiempo laboral
  es cero (un calendario explícito y vacío no equivale a continuo).
- La **satisfacción** queda pendiente: no hay tabla de calificación todavía (la calificación se
  difirió en la Fase 3A).
- Los **tiempos objetivo (SLA)** por prioridad y tipo de servicio quedan como tramo aparte.
- Los tableros y la exportación (Recharts) son la Fase 5B.
