-- Pendientes Fase 5: indicadores de duplicados.
-- Tiempo hasta marcarse y alertas de posible duplicado por decisión.

create or replace view public.v_metrics_duplicate_tickets
with (security_invoker = true)
as
select
  t.id,
  t.building_id,
  t.category_id,
  t.team_id,
  t.dependency_id,
  t.requester_id,
  t.reported_at,
  (select min(e.occurred_at) from public.ticket_events e
    where e.ticket_id = t.id and e.type = 'duplicate_marked') as marked_at,
  (select min(e.occurred_at) from public.ticket_events e
    where e.ticket_id = t.id and e.type = 'duplicate_marked') - t.reported_at as time_to_mark
from public.tickets t
where t.status = 'duplicate';
comment on view public.v_metrics_duplicate_tickets is
  'Tiquets duplicados con el tiempo desde el registro hasta marcarse.';
grant select on public.v_metrics_duplicate_tickets to authenticated;

create or replace view public.v_metrics_duplicate_alerts
with (security_invoker = true)
as
select
  coalesce(c.decision, 'pending') as decision,
  count(*) as candidates,
  count(distinct c.ticket_id) as tickets
from public.ticket_duplicate_candidates c
group by coalesce(c.decision, 'pending');
comment on view public.v_metrics_duplicate_alerts is
  'Candidatos de posible duplicado por decisión (pendiente, ignorado, enlazado, descartado).';
grant select on public.v_metrics_duplicate_alerts to authenticated;
