-- Fase 5A, tramo 3: vistas de indicadores (calendario y laboral, sin duplicados).
-- La vista base por tiquet excluye duplicados (indicadores de desempeño). Los indicadores de
-- duplicados se calculan aparte, sobre todos los tiquets. Ver docs/modelo-datos.md §10.

-- Índices de apoyo para las consultas previsibles.
create index if not exists idx_ticket_events_ticket_type
  on public.ticket_events (ticket_id, type);
create index if not exists idx_evidence_ticket_type
  on public.evidence (ticket_id, type);
create index if not exists idx_ticket_participants_technician
  on public.ticket_participants (technician_id);
create index if not exists idx_tickets_status_reported
  on public.tickets (status, reported_at);

-- Base por tiquet: todos los tramos en modo calendario y laboral, marcas y conteos.
create or replace view public.v_ticket_metrics_base
with (security_invoker = true)
as
select
  t.id,
  t.ticket_number,
  t.folio,
  t.status,
  t.building_id,
  t.category_id,
  t.priority_id,
  t.team_id,
  t.reported_at,
  t.closed_at,
  public.ticket_time_total(t.id) as total_time,
  public.ticket_time_net(t.id) as net_time,
  public.ticket_time_by_kind(t.id, 'active_work') as active_work_time,
  public.ticket_time_total_laboral(t.id) as total_time_labor,
  public.ticket_time_net_laboral(t.id) as net_time_labor,
  public.ticket_time_by_kind_laboral(t.id, 'active_work') as active_work_time_labor,
  public.ticket_time_by_kind(t.id, 'supervisor_response') as response_time,
  public.ticket_time_by_kind_laboral(t.id, 'supervisor_response') as response_time_labor,
  public.ticket_time_by_kind(t.id, 'technician_assignment') as assignment_time,
  public.ticket_time_by_kind_laboral(t.id, 'technician_assignment') as assignment_time_labor,
  public.ticket_time_by_kind(t.id, 'reassignment') as reassignment_time,
  public.ticket_time_by_kind_laboral(t.id, 'reassignment') as reassignment_time_labor,
  public.ticket_time_by_kind(t.id, 'wait_start') as wait_start_time,
  public.ticket_time_by_kind_laboral(t.id, 'wait_start') as wait_start_time_labor,
  public.ticket_time_by_kind(t.id, 'pause') as pause_time,
  public.ticket_time_by_kind_laboral(t.id, 'pause') as pause_time_labor,
  public.ticket_time_by_kind(t.id, 'validation') as validation_time,
  public.ticket_time_by_kind_laboral(t.id, 'validation') as validation_time_labor,
  public.ticket_time_by_kind(t.id, 'claim') as claim_time,
  public.ticket_time_by_kind_laboral(t.id, 'claim') as claim_time_labor,
  t.requester_id,
  t.dependency_id,
  exists (select 1 from public.ticket_events e
    where e.ticket_id = t.id and e.type = 'reassigned_supervisor') as reassigned_supervisor,
  exists (select 1 from public.ticket_events e
    where e.ticket_id = t.id and e.type = 'reassigned_technician') as reassigned_technician,
  exists (select 1 from public.ticket_captures c where c.ticket_id = t.id) as recaptured,
  exists (select 1 from public.ticket_events e
    where e.ticket_id = t.id and e.type = 'reopened') as reopened,
  exists (select 1 from public.evidence ev
    where ev.ticket_id = t.id and ev.type = 'request') as has_request_evidence,
  exists (select 1 from public.evidence ev
    where ev.ticket_id = t.id and ev.type = 'before') as has_before_evidence,
  exists (select 1 from public.evidence ev
    where ev.ticket_id = t.id and ev.type = 'after') as has_after_evidence,
  exists (select 1 from public.ticket_validations v
    where v.ticket_id = t.id and v.validator_role = 'requester') as validated_requester,
  exists (select 1 from public.ticket_validations v
    where v.ticket_id = t.id and v.validator_role = 'supervisor') as validated_supervisor,
  (select count(*) from public.ticket_captures c where c.ticket_id = t.id) as recapture_count,
  (select count(*) from public.ticket_events e
    where e.ticket_id = t.id and e.type = 'reopened') as reopen_count,
  (select count(*) from public.ticket_participants p
    where p.ticket_id = t.id and p.participation_type = 'auxiliary') as auxiliary_count,
  (select sum(coalesce(p.ended_at, now()) - p.started_at)
    from public.ticket_participants p
    where p.ticket_id = t.id and p.participation_type = 'auxiliary') as auxiliary_time
from public.tickets t
where t.status <> 'duplicate';
comment on view public.v_ticket_metrics_base is
  'Indicadores base por tiquet (excluye duplicados): tiempos calendario y laboral, marcas y conteos.';
grant select on public.v_ticket_metrics_base to authenticated;

-- Agregados por dimensión (equipo, categoría, edificio, dependencia y solicitante).
create or replace view public.v_metrics_by_dimension
with (security_invoker = true)
as
select
  case
    when grouping(m.team_id) = 0 then 'team'
    when grouping(m.category_id) = 0 then 'category'
    when grouping(m.building_id) = 0 then 'building'
    when grouping(m.dependency_id) = 0 then 'dependency'
    else 'requester'
  end as dimension,
  coalesce(m.team_id, m.category_id, m.building_id, m.dependency_id, m.requester_id) as dimension_id,
  coalesce(tm.name, cat.name, bld.name, dep.name, req.full_name) as dimension_name,
  count(*) as tickets,
  count(*) filter (where m.reassigned_supervisor) as reassigned,
  count(*) filter (where m.recaptured) as recaptured,
  count(*) filter (where m.reopened) as reopened,
  round(count(*) filter (where m.reassigned_supervisor)::numeric / nullif(count(*), 0), 4) as reassignment_rate,
  round(count(*) filter (where m.recaptured)::numeric / nullif(count(*), 0), 4) as recapture_rate,
  round(count(*) filter (where m.reopened)::numeric / nullif(count(*), 0), 4) as reopen_rate,
  round(
    count(*) filter (where m.status = 'closed' and not m.reopened)::numeric
      / nullif(count(*) filter (where m.status = 'closed'), 0), 4) as first_time_fix_rate,
  avg(m.response_time) as avg_response_time,
  avg(m.assignment_time) as avg_assignment_time,
  avg(m.reassignment_time) as avg_reassignment_time,
  avg(m.wait_start_time) as avg_wait_start_time,
  avg(m.active_work_time) as avg_active_work_time,
  avg(m.pause_time) as avg_pause_time,
  avg(m.validation_time) as avg_validation_time,
  avg(m.total_time) as avg_total_time,
  avg(m.net_time) as avg_net_time,
  avg(m.total_time_labor) as avg_total_time_labor,
  avg(m.net_time_labor) as avg_net_time_labor,
  avg(m.active_work_time_labor) as avg_active_work_time_labor
from public.v_ticket_metrics_base m
left join public.teams tm on tm.id = m.team_id
left join public.categories cat on cat.id = m.category_id
left join public.buildings bld on bld.id = m.building_id
left join public.dependencies dep on dep.id = m.dependency_id
left join public.requesters req on req.id = m.requester_id
group by grouping sets (
  (m.team_id, tm.name),
  (m.category_id, cat.name),
  (m.building_id, bld.name),
  (m.dependency_id, dep.name),
  (m.requester_id, req.full_name)
);
comment on view public.v_metrics_by_dimension is
  'Indicadores de desempeño agregados por equipo, categoría, edificio, dependencia y solicitante.';
grant select on public.v_metrics_by_dimension to authenticated;

-- Tasa de duplicados por dimensión (sobre todos los tiquets, incluidos duplicados).
create or replace view public.v_metrics_duplicates_by_dimension
with (security_invoker = true)
as
with agg as (
  select
    grouping(t.team_id) as g_team,
    grouping(t.building_id) as g_building,
    grouping(t.dependency_id) as g_dependency,
    grouping(t.requester_id) as g_requester,
    t.team_id, t.building_id, t.dependency_id, t.requester_id,
    count(*) as tickets,
    count(*) filter (where t.status = 'duplicate') as duplicates
  from public.tickets t
  group by grouping sets ((t.team_id), (t.building_id), (t.dependency_id), (t.requester_id))
)
select
  case
    when agg.g_team = 0 then 'team'
    when agg.g_building = 0 then 'building'
    when agg.g_dependency = 0 then 'dependency'
    else 'requester'
  end as dimension,
  coalesce(agg.team_id, agg.building_id, agg.dependency_id, agg.requester_id) as dimension_id,
  coalesce(tm.name, bld.name, dep.name, req.full_name) as dimension_name,
  agg.tickets,
  agg.duplicates,
  round(agg.duplicates::numeric / nullif(agg.tickets, 0), 4) as duplicate_rate
from agg
left join public.teams tm on tm.id = agg.team_id
left join public.buildings bld on bld.id = agg.building_id
left join public.dependencies dep on dep.id = agg.dependency_id
left join public.requesters req on req.id = agg.requester_id;
comment on view public.v_metrics_duplicates_by_dimension is
  'Tasa de duplicados por equipo, edificio, dependencia y solicitante.';
grant select on public.v_metrics_duplicates_by_dimension to authenticated;

-- Carga por técnico y horas de apoyo auxiliar.
create or replace view public.v_metrics_by_technician
with (security_invoker = true)
as
select
  p.technician_id,
  tech.full_name as technician_name,
  count(distinct p.ticket_id) as tickets,
  count(*) filter (where p.participation_type = 'leader') as leader_count,
  count(*) filter (where p.participation_type = 'auxiliary') as auxiliary_count,
  sum(coalesce(p.ended_at, now()) - p.started_at) as participation_time,
  sum(public.work_calendar_overlap(
    public.ticket_calendar(p.ticket_id), p.started_at, coalesce(p.ended_at, now())
  )) as participation_time_labor,
  (select count(*) from public.ticket_assignments a
    where a.assignee_technician_id = p.technician_id and a.stage = 'technician') as assigned_count
from public.ticket_participants p
join public.technicians tech on tech.id = p.technician_id
group by p.technician_id, tech.full_name;
comment on view public.v_metrics_by_technician is
  'Carga por técnico y horas de apoyo auxiliar (calendario y laboral).';
grant select on public.v_metrics_by_technician to authenticated;

-- Pausas por motivo (tiempo calendario y laboral).
create or replace view public.v_metrics_pauses_by_reason
with (security_invoker = true)
as
select
  r.id as reason_id,
  r.name as reason_name,
  count(*) as pauses,
  count(distinct p.ticket_id) as tickets,
  sum(coalesce(p.closed_at, now()) - p.opened_at) as pause_time,
  sum(public.work_calendar_overlap(
    public.ticket_calendar(p.ticket_id), p.opened_at, coalesce(p.closed_at, now())
  )) as pause_time_labor
from public.ticket_pauses p
join public.reasons r on r.id = p.reason_id
group by r.id, r.name;
comment on view public.v_metrics_pauses_by_reason is
  'Pausas por motivo con su tiempo en modo calendario y laboral.';
grant select on public.v_metrics_pauses_by_reason to authenticated;

-- Rechazos y cancelaciones por motivo.
create or replace view public.v_metrics_reject_cancel_by_reason
with (security_invoker = true)
as
select
  e.type as event_type,
  r.id as reason_id,
  r.name as reason_name,
  count(*) as tickets
from public.ticket_events e
join public.reasons r on r.id = e.reason_id
where e.type in ('rejected', 'cancelled')
group by e.type, r.id, r.name;
comment on view public.v_metrics_reject_cancel_by_reason is
  'Rechazos y cancelaciones agrupados por motivo.';
grant select on public.v_metrics_reject_cancel_by_reason to authenticated;

-- Antigüedad de pendientes (aging) por tiquet abierto.
create or replace view public.v_metrics_aging
with (security_invoker = true)
as
select
  t.id,
  t.folio,
  t.status,
  t.team_id,
  t.category_id,
  t.priority_id,
  t.reported_at,
  now() - t.reported_at as age,
  public.work_calendar_overlap(public.ticket_calendar(t.id), t.reported_at, now()) as age_labor,
  public.ticket_time_by_kind(t.id, 'wait_start') as wait_start_time,
  public.ticket_time_by_kind(t.id, 'pause') as pause_time
from public.tickets t
where t.status not in ('closed', 'rejected', 'cancelled', 'duplicate');
comment on view public.v_metrics_aging is
  'Antigüedad de los tiquets pendientes (calendario y laboral).';
grant select on public.v_metrics_aging to authenticated;

-- Ruteo y toma: sin candidatos (sin ruteo) y ofertas pendientes (sin tomar).
create or replace view public.v_metrics_routing
with (security_invoker = true)
as
select
  t.id,
  t.folio,
  t.status,
  t.building_id,
  t.team_id,
  t.reported_at,
  (select count(*) from public.ticket_offers o where o.ticket_id = t.id) as offers_count,
  (select count(*) from public.ticket_offers o
    where o.ticket_id = t.id and o.status = 'offered') as pending_offers,
  (select count(*) from public.ticket_offers o
    where o.ticket_id = t.id and o.status = 'taken') as taken_offers,
  (select min(o.resolved_at) from public.ticket_offers o
    where o.ticket_id = t.id and o.status = 'taken') - t.reported_at as time_to_take
from public.tickets t;
comment on view public.v_metrics_routing is
  'Estado de ruteo por tiquet: sin candidatos, ofertas pendientes y tiempo hasta la toma.';
grant select on public.v_metrics_routing to authenticated;
