# 0073 — SSE y notificaciones in-app

**Fecha:** 2026-10-21
**Estado:** aceptada

## Contexto

El frontend necesita invalidar consultas y mostrar novedades sin recargar. No se usa Realtime de un
proveedor externo: el servidor propio debe reaccionar a los eventos de PostgreSQL y filtrar cada
conexión por el alcance del actor.

## Decisión

1. **`LISTEN/NOTIFY` con conexión dedicada.** Un `pg.Client` fuera del pool escucha `axia_events`;
   si falla, reintenta con backoff. No consume una de las 10 conexiones del pool.
2. **Disparador de difusión.** `ticket_events_broadcast` envía solo `{eventId, ticketId, type,
   occurredAt}` mediante `pg_notify`. No se envía contenido sensible.
3. **SSE en `GET /api/events`.** Requiere sesión y `ticket.view`; cada evento se filtra con
   `findVisibleTicket`. Si el actor es el solicitante, se aplica además
   `requester_visible_event_types`.
4. **Catch-up.** `GET /api/events/changes?since=<eventId>` devuelve los eventos visibles posteriores,
   con el mismo filtro de alcance y visibilidad del solicitante.
5. **Notificaciones in-app.** La migración `0006` siembra las reglas de referencia. La bandeja lista
   solo notificaciones del actor y tiquets visibles; permite marcar una o todas.
6. **Heartbeat y proxy.** `GET /api/events` envía un comentario cada 15 s (`SSE_HEARTBEAT_MS`) y
   cabeceras `no-cache`, `no-transform` y `X-Accel-Buffering: no`.
7. **Push y planificador quedan opcionales.** No bloquean el corte; `push_subscriptions` y
   `notification_deliveries` siguen disponibles para una fase posterior.

## Consecuencias

- Una sola conexión SSE por pestaña; el cliente debe reconectar y pedir catch-up.
- El filtro se ejecuta en el servidor por cada suscriptor, con una consulta acotada por PK.
- La bandeja no necesita un contenedor adicional ni un proveedor de push.

## Alternativas descartadas

- **Realtime de un proveedor externo:** dependencia innecesaria.
- **Enviar payloads completos por `pg_notify`:** expone datos y rompe el límite de tamaño.
- **Filtrar solo en el cliente:** no es una frontera de seguridad.
