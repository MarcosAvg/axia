-- Índices para los filtros de desglose de métricas sobre la lista de tiquets.
create index if not exists ticket_pauses_ticket_idx
  on public.ticket_pauses (ticket_id);

create index if not exists ticket_pause_steps_pause_reason_idx
  on public.ticket_pause_steps (pause_id, reason_id);

create index if not exists ticket_captures_ticket_idx
  on public.ticket_captures (ticket_id);

create index if not exists ticket_ratings_ticket_idx
  on public.ticket_ratings (ticket_id);
