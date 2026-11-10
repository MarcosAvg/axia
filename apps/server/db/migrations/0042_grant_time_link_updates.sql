-- El enlace y el ajuste de tiempos actualizan columnas concretas de tablas
-- append-only. Se concede solo lo necesario, no el update completo.

grant update (event_id, validated_at)
  on public.ticket_validations to axia_app;

grant update (event_id, changed_at)
  on public.ticket_captures to axia_app;

grant update (occurred_at, time_confidence)
  on public.ticket_events to axia_app;
