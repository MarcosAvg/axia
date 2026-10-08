-- Fase 3, tramo 2: línea de tiempo del detalle con nombres y visibilidad al solicitante.
-- El personal ve todos los eventos; el solicitante solo los tipos configurados (RN-23).

create or replace view public.v_ticket_timeline
with (security_invoker = true)
as
select
  e.id,
  e.ticket_id,
  e.cycle,
  e.type,
  e.payload,
  e.occurred_at,
  e.recorded_at,
  e.actor_id,
  actor.full_name as actor_name,
  e.subject_user_id,
  subject.full_name as subject_user_name,
  e.subject_technician_id,
  technician.full_name as subject_technician_name,
  e.reason_id,
  reason.name as reason_name
from public.ticket_events e
left join public.profiles actor on actor.id = e.actor_id
left join public.profiles subject on subject.id = e.subject_user_id
left join public.technicians technician on technician.id = e.subject_technician_id
left join public.reasons reason on reason.id = e.reason_id
where not exists (
    select 1
    from public.requesters requester
    join public.tickets ticket on ticket.requester_id = requester.id
    where ticket.id = e.ticket_id and requester.user_id = auth.uid()
  )
  or e.type in (
    select unnest(requester_visible_event_types) from public.instance_settings
  );
comment on view public.v_ticket_timeline is
  'Línea de tiempo del tiquet con nombres; el solicitante solo ve los tipos configurados.';
grant select on public.v_ticket_timeline to authenticated;
