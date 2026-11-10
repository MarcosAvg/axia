-- La línea de tiempo expone la confianza de la hora del evento para que la
-- interfaz marque las acciones pendientes de corrección.

create or replace view public.v_ticket_timeline
with (security_invoker = true) as
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
  reason.name as reason_name,
  e.subject_requester_id,
  requester.full_name as subject_requester_name,
  e.time_confidence
from public.ticket_events e
left join public.users actor on actor.id = e.actor_id
left join public.users subject on subject.id = e.subject_user_id
left join public.technicians technician on technician.id = e.subject_technician_id
left join public.requesters requester on requester.id = e.subject_requester_id
left join public.reasons reason on reason.id = e.reason_id;

comment on view public.v_ticket_timeline is
  'Línea de tiempo del tiquet con actor, sujeto y confianza de la hora.';
