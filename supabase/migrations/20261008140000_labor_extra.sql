-- Fase 5A (ajuste): trabajo fuera de horario ("extra").
-- El trabajo real siempre se registra; el calendario solo separa lo que cayó en horario de lo
-- que no (noches, fin de semana y festivos trabajados). Extra = calendario - laboral.

create or replace function public.ticket_time_by_kind_extra(
  p_ticket_id uuid,
  p_kind public.time_span_kind
)
returns interval
language sql
stable
as $$
  select public.ticket_time_by_kind(p_ticket_id, p_kind)
       - public.ticket_time_by_kind_laboral(p_ticket_id, p_kind);
$$;
comment on function public.ticket_time_by_kind_extra(uuid, public.time_span_kind) is
  'Tiempo de un tipo de tramo fuera del horario laboral (extra).';
revoke execute on function public.ticket_time_by_kind_extra(uuid, public.time_span_kind) from public, anon;
grant execute on function public.ticket_time_by_kind_extra(uuid, public.time_span_kind) to authenticated;

-- Base por tiquet con el trabajo fuera de horario.
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
    where p.ticket_id = t.id and p.participation_type = 'auxiliary') as auxiliary_time,
  public.ticket_time_by_kind_extra(t.id, 'active_work') as active_work_time_extra
from public.tickets t
where t.status <> 'duplicate';
comment on view public.v_ticket_metrics_base is
  'Indicadores base por tiquet (excluye duplicados): tiempos calendario y laboral, trabajo fuera de horario, marcas y conteos.';
grant select on public.v_ticket_metrics_base to authenticated;

-- Carga por técnico con el tiempo fuera de horario.
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
    where a.assignee_technician_id = p.technician_id and a.stage = 'technician') as assigned_count,
  sum(coalesce(p.ended_at, now()) - p.started_at)
    - sum(public.work_calendar_overlap(
        public.ticket_calendar(p.ticket_id), p.started_at, coalesce(p.ended_at, now())
      )) as participation_time_extra
from public.ticket_participants p
join public.technicians tech on tech.id = p.technician_id
group by p.technician_id, tech.full_name;
comment on view public.v_metrics_by_technician is
  'Carga por técnico y horas de apoyo auxiliar (calendario, laboral y fuera de horario).';
grant select on public.v_metrics_by_technician to authenticated;
