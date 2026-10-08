-- Cierre de la Fase 5: tiempos objetivo (SLA), configurables como datos.
-- El objetivo del tipo de servicio sobrescribe al de la prioridad; si ninguno existe, no hay SLA.
-- La medición es la resolución (registro -> cierre) en el modo de reloj de la instancia.

alter table public.service_types
  add column target_minutes integer check (target_minutes is null or target_minutes > 0);
comment on column public.service_types.target_minutes is
  'Tiempo objetivo opcional del tipo de servicio; sobrescribe al de la prioridad.';

alter table public.instance_settings
  add column sla_clock_mode text not null default 'calendar'
    check (sla_clock_mode in ('calendar', 'laboral'));
comment on column public.instance_settings.sla_clock_mode is
  'Modo de reloj con el que se mide el cumplimiento de los tiempos objetivo.';

create or replace view public.v_ticket_sla
with (security_invoker = true)
as
with base as (
  select
    t.id,
    t.ticket_number,
    t.folio,
    t.status,
    t.description,
    t.priority_id,
    t.service_type_id,
    t.building_id,
    t.category_id,
    t.team_id,
    t.reported_at,
    t.closed_at,
    coalesce(st.target_minutes, pr.target_minutes) as target_minutes,
    case
      when t.closed_at is null then null
      when (select sla_clock_mode from public.instance_settings limit 1) = 'laboral'
        then extract(epoch from public.ticket_time_total_laboral(t.id)) / 60
      else extract(epoch from (t.closed_at - t.reported_at)) / 60
    end as resolution_minutes
  from public.tickets t
  left join public.service_types st on st.id = t.service_type_id
  left join public.priorities pr on pr.id = t.priority_id
  where t.status <> 'duplicate'
)
select
  base.*,
  case
    when base.resolution_minutes is not null and base.target_minutes is not null
      then base.resolution_minutes <= base.target_minutes
  end as meets
from base;
comment on view public.v_ticket_sla is
  'Cumplimiento de tiempos objetivo por tiquet (resolución en el modo de reloj de la instancia).';
grant select on public.v_ticket_sla to authenticated;

create or replace view public.v_metrics_sla
with (security_invoker = true)
as
select
  count(*) filter (where target_minutes is not null and closed_at is not null) as with_target,
  count(*) filter (where meets) as met,
  round(
    count(*) filter (where meets)::numeric
      / nullif(count(*) filter (where target_minutes is not null and closed_at is not null), 0),
    4) as compliance_rate,
  avg(target_minutes) filter (where target_minutes is not null and closed_at is not null)
    as avg_target_minutes,
  avg(resolution_minutes) filter (where target_minutes is not null and closed_at is not null)
    as avg_resolution_minutes
from public.v_ticket_sla;
comment on view public.v_metrics_sla is
  'Cumplimiento global de tiempos objetivo (tiquets cerrados con objetivo).';
grant select on public.v_metrics_sla to authenticated;

create or replace view public.v_metrics_sla_by_priority
with (security_invoker = true)
as
select
  pr.id as priority_id,
  pr.name as priority_name,
  count(*) filter (where s.target_minutes is not null and s.closed_at is not null) as with_target,
  count(*) filter (where s.meets) as met,
  round(
    count(*) filter (where s.meets)::numeric
      / nullif(count(*) filter (where s.target_minutes is not null and s.closed_at is not null), 0),
    4) as compliance_rate
from public.v_ticket_sla s
join public.priorities pr on pr.id = s.priority_id
group by pr.id, pr.name;
comment on view public.v_metrics_sla_by_priority is
  'Cumplimiento de tiempos objetivo por prioridad.';
grant select on public.v_metrics_sla_by_priority to authenticated;
