# 0026 — Indicadores de duplicados y satisfacción

- Fecha: 2026-10-08
- Estado: aceptada

## Contexto

La Fase 5 dejó pendientes dos indicadores de la especificación §11: los de **duplicados** (la tasa
por dimensión ya existía, pero no el tiempo hasta marcarse ni las alertas) y la **satisfacción**
(no había dónde guardarla; la calificación se difirió desde la Fase 3A). La zona horaria quedó
confirmada como `America/Mexico_City`.

## Decisión

- **Duplicados.** Se agregan dos vistas: `v_metrics_duplicate_tickets` (tiquets duplicados con el
  **tiempo hasta marcarse**) y `v_metrics_duplicate_alerts` (candidatos de posible duplicado por
  **decisión**: pendiente, ignorado, enlazado, descartado). El tablero gana una sección con la
  **tasa por dimensión** (`v_metrics_duplicates_by_dimension`, ya existente), el tiempo medio y las
  alertas.
- **Satisfacción.** Tabla `ticket_ratings` (una por tiquet, 1–5 y comentario opcional) con RLS de
  lectura por `can_see_ticket`. La RPC `ticket_rate` valida `ticket.rate` (propia) o
  `ticket.rate_on_behalf` (a nombre del solicitante), exige tiquet **cerrado**, es **idempotente**
  (`client_request_id`) y **recalificable** (upsert). Escribe el evento `rated`. La vista
  `v_metrics_satisfaction` da el promedio y la distribución, y el detalle del tiquet cerrado muestra
  un formulario de estrellas 1–5 para quien pueda calificar.
- **Zona horaria.** Confirmada `America/Mexico_City` (sin cambios de código).

## Alternativas consideradas

- **Guardar la calificación solo como evento:** se consulta mucho; se prefirió una tabla dedicada.
- **Varias calificaciones por tiquet:** se descartó; una por tiquet (se recalifica).
- **Calificación obligatoria:** la especificación la quiere siempre opcional; no se bloquea el cierre.

## Consecuencias

- El KPI de satisfacción muestra `—` sin datos; no bloquea nada.
- El filtro por fecha/dimensión del tablero **no** aplica a satisfacción ni a pausas (vistas
  agregadas); si se pide, se mueve a una función con filtros.
- Los **tiempos objetivo (SLA)** siguen pendientes de valores (pregunta #5).
