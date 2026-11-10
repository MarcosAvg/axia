-- Enlaza cada fila de negocio con el evento que la originó o la cerró, para
-- que corregir la hora de un evento mueva también sus filas dependientes.

alter table public.ticket_validations
  add column event_id bigint references public.ticket_events(id);

alter table public.ticket_participants
  add column started_event_id bigint references public.ticket_events(id),
  add column ended_event_id bigint references public.ticket_events(id);

alter table public.ticket_assignments
  add column assigned_event_id bigint references public.ticket_events(id),
  add column ended_event_id bigint references public.ticket_events(id);

alter table public.ticket_pauses
  add column opened_event_id bigint references public.ticket_events(id),
  add column closed_event_id bigint references public.ticket_events(id);

alter table public.ticket_pause_steps
  add column entered_event_id bigint references public.ticket_events(id),
  add column exited_event_id bigint references public.ticket_events(id);

alter table public.ticket_claims
  add column opened_event_id bigint references public.ticket_events(id),
  add column resolved_event_id bigint references public.ticket_events(id);

alter table public.ticket_captures
  add column event_id bigint references public.ticket_events(id);

alter table public.ticket_offers
  add column offered_event_id bigint references public.ticket_events(id),
  add column resolved_event_id bigint references public.ticket_events(id);
