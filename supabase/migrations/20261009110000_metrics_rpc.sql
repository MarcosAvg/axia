-- Indicadores agregados con filtros (rango de días y dimensiones) en el servidor.
-- Las vistas globales de métricas no aceptan parámetros; estas funciones las
-- recalculan filtrando por el día (UTC) de registro del tiquet y por dimensión.
-- Son `security invoker`, así que la RLS sigue limitando lo visible por el usuario.

-- ¿El instante cae en el rango de días (UTC)? Compatible con el filtro del cliente.
create or replace function public.metrics_date_in(
  p_at timestamptz,
  p_from date,
  p_to date
)
returns boolean
language sql
immutable
as $$
  select (p_from is null or (p_at at time zone 'UTC')::date >= p_from)
     and (p_to is null or (p_at at time zone 'UTC')::date <= p_to);
$$;
comment on function public.metrics_date_in(timestamptz, date, date) is
  'Verdadero si el día (UTC) del instante cae dentro del rango opcional.';
revoke execute on function public.metrics_date_in(timestamptz, date, date) from public, anon;
grant execute on function public.metrics_date_in(timestamptz, date, date) to authenticated;

-- ¿El tiquet coincide con las dimensiones pedidas (cada una opcional)?
create or replace function public.metrics_dims_in(
  p_building uuid,
  p_team uuid,
  p_category uuid,
  p_dependency uuid,
  t_building uuid,
  t_team uuid,
  t_category uuid,
  t_dependency uuid
)
returns boolean
language sql
immutable
as $$
  select (p_building is null or t_building = p_building)
     and (p_team is null or t_team = p_team)
     and (p_category is null or t_category = p_category)
     and (p_dependency is null or t_dependency = p_dependency);
$$;
comment on function public.metrics_dims_in(uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid) is
  'Verdadero si el tiquet coincide con las dimensiones pedidas (cada una opcional).';
revoke execute on function public.metrics_dims_in(uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.metrics_dims_in(uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid) to authenticated;

-- Cumplimiento de SLA filtrado.
create or replace function public.metrics_sla(
  p_from date default null,
  p_to date default null,
  p_building uuid default null,
  p_team uuid default null,
  p_category uuid default null,
  p_dependency uuid default null
)
returns table (
  with_target bigint,
  met bigint,
  compliance_rate numeric,
  avg_target_minutes numeric,
  avg_resolution_minutes numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    count(*) filter (where s.target_minutes is not null and s.closed_at is not null),
    count(*) filter (where s.meets),
    round(
      count(*) filter (where s.meets)::numeric
        / nullif(count(*) filter (where s.target_minutes is not null and s.closed_at is not null), 0),
      4),
    avg(s.target_minutes) filter (where s.target_minutes is not null and s.closed_at is not null),
    avg(s.resolution_minutes) filter (where s.target_minutes is not null and s.closed_at is not null)
  from public.v_ticket_sla s
  join public.tickets t on t.id = s.id
  where public.metrics_date_in(t.reported_at, p_from, p_to)
    and public.metrics_dims_in(p_building, p_team, p_category, p_dependency,
      t.building_id, t.team_id, t.category_id, t.dependency_id);
$$;
comment on function public.metrics_sla(date, date, uuid, uuid, uuid, uuid) is
  'Cumplimiento de tiempos objetivo filtrado por rango y dimensión.';
revoke execute on function public.metrics_sla(date, date, uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.metrics_sla(date, date, uuid, uuid, uuid, uuid) to authenticated;

-- Cumplimiento de SLA por prioridad, filtrado.
create or replace function public.metrics_sla_by_priority(
  p_from date default null,
  p_to date default null,
  p_building uuid default null,
  p_team uuid default null,
  p_category uuid default null,
  p_dependency uuid default null
)
returns table (
  priority_id uuid,
  priority_name text,
  with_target bigint,
  met bigint,
  compliance_rate numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    pr.id,
    pr.name,
    count(*) filter (where s.target_minutes is not null and s.closed_at is not null),
    count(*) filter (where s.meets),
    round(
      count(*) filter (where s.meets)::numeric
        / nullif(count(*) filter (where s.target_minutes is not null and s.closed_at is not null), 0),
      4)
  from public.v_ticket_sla s
  join public.tickets t on t.id = s.id
  join public.priorities pr on pr.id = s.priority_id
  where public.metrics_date_in(t.reported_at, p_from, p_to)
    and public.metrics_dims_in(p_building, p_team, p_category, p_dependency,
      t.building_id, t.team_id, t.category_id, t.dependency_id)
  group by pr.id, pr.name
  order by pr.name;
$$;
comment on function public.metrics_sla_by_priority(date, date, uuid, uuid, uuid, uuid) is
  'Cumplimiento de tiempos objetivo por prioridad, filtrado.';
revoke execute on function public.metrics_sla_by_priority(date, date, uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.metrics_sla_by_priority(date, date, uuid, uuid, uuid, uuid) to authenticated;

-- Satisfacción filtrada.
create or replace function public.metrics_satisfaction(
  p_from date default null,
  p_to date default null,
  p_building uuid default null,
  p_team uuid default null,
  p_category uuid default null,
  p_dependency uuid default null
)
returns table (average_score numeric, ratings bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select round(avg(r.score)::numeric, 3), count(*)
  from public.ticket_ratings r
  join public.tickets t on t.id = r.ticket_id
  where public.metrics_date_in(t.reported_at, p_from, p_to)
    and public.metrics_dims_in(p_building, p_team, p_category, p_dependency,
      t.building_id, t.team_id, t.category_id, t.dependency_id);
$$;
comment on function public.metrics_satisfaction(date, date, uuid, uuid, uuid, uuid) is
  'Satisfacción promedio y número de calificaciones, filtrado.';
revoke execute on function public.metrics_satisfaction(date, date, uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.metrics_satisfaction(date, date, uuid, uuid, uuid, uuid) to authenticated;

-- Pausas por motivo, filtradas.
create or replace function public.metrics_pauses_by_reason(
  p_from date default null,
  p_to date default null,
  p_building uuid default null,
  p_team uuid default null,
  p_category uuid default null,
  p_dependency uuid default null
)
returns table (
  reason_name text,
  pauses bigint,
  pause_time interval,
  pause_time_labor interval
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    r.name,
    count(*),
    sum(coalesce(p.closed_at, now()) - p.opened_at),
    sum(public.work_calendar_overlap(
      public.ticket_calendar(p.ticket_id),
      p.opened_at,
      coalesce(p.closed_at, now())))
  from public.ticket_pauses p
  join public.reasons r on r.id = p.reason_id
  join public.tickets t on t.id = p.ticket_id
  where public.metrics_date_in(t.reported_at, p_from, p_to)
    and public.metrics_dims_in(p_building, p_team, p_category, p_dependency,
      t.building_id, t.team_id, t.category_id, t.dependency_id)
  group by r.name
  order by count(*) desc;
$$;
comment on function public.metrics_pauses_by_reason(date, date, uuid, uuid, uuid, uuid) is
  'Pausas por motivo con su tiempo, filtradas.';
revoke execute on function public.metrics_pauses_by_reason(date, date, uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.metrics_pauses_by_reason(date, date, uuid, uuid, uuid, uuid) to authenticated;

-- Tiquets duplicados con su tiempo hasta marcarse, filtrados.
create or replace function public.metrics_duplicate_tickets(
  p_from date default null,
  p_to date default null,
  p_building uuid default null,
  p_team uuid default null,
  p_category uuid default null,
  p_dependency uuid default null
)
returns table (time_to_mark interval)
language sql
stable
security invoker
set search_path = ''
as $$
  select min(e.occurred_at) - t.reported_at
  from public.tickets t
  left join public.ticket_events e
    on e.ticket_id = t.id and e.type = 'duplicate_marked'
  where t.status = 'duplicate'
    and public.metrics_date_in(t.reported_at, p_from, p_to)
    and public.metrics_dims_in(p_building, p_team, p_category, p_dependency,
      t.building_id, t.team_id, t.category_id, t.dependency_id)
  group by t.id, t.reported_at;
$$;
comment on function public.metrics_duplicate_tickets(date, date, uuid, uuid, uuid, uuid) is
  'Tiquets duplicados con el tiempo desde el registro hasta marcarse, filtrado.';
revoke execute on function public.metrics_duplicate_tickets(date, date, uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.metrics_duplicate_tickets(date, date, uuid, uuid, uuid, uuid) to authenticated;

-- Alertas de posible duplicado por decisión, filtradas.
create or replace function public.metrics_duplicate_alerts(
  p_from date default null,
  p_to date default null,
  p_building uuid default null,
  p_team uuid default null,
  p_category uuid default null,
  p_dependency uuid default null
)
returns table (decision text, candidates bigint, tickets bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(c.decision, 'pending'), count(*), count(distinct c.ticket_id)
  from public.ticket_duplicate_candidates c
  join public.tickets t on t.id = c.ticket_id
  where public.metrics_date_in(t.reported_at, p_from, p_to)
    and public.metrics_dims_in(p_building, p_team, p_category, p_dependency,
      t.building_id, t.team_id, t.category_id, t.dependency_id)
  group by coalesce(c.decision, 'pending');
$$;
comment on function public.metrics_duplicate_alerts(date, date, uuid, uuid, uuid, uuid) is
  'Candidatos de posible duplicado por decisión, filtrados.';
revoke execute on function public.metrics_duplicate_alerts(date, date, uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.metrics_duplicate_alerts(date, date, uuid, uuid, uuid, uuid) to authenticated;

-- Tasa de duplicados por dimensión, filtrada.
create or replace function public.metrics_duplicates_by_dimension(
  p_from date default null,
  p_to date default null,
  p_building uuid default null,
  p_team uuid default null,
  p_category uuid default null,
  p_dependency uuid default null
)
returns table (
  dimension text,
  dimension_id uuid,
  dimension_name text,
  tickets bigint,
  duplicates bigint,
  duplicate_rate numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  with base as (
    select t.team_id, t.building_id, t.dependency_id, t.requester_id, t.status
    from public.tickets t
    where public.metrics_date_in(t.reported_at, p_from, p_to)
      and public.metrics_dims_in(p_building, p_team, p_category, p_dependency,
        t.building_id, t.team_id, t.category_id, t.dependency_id)
  ),
  agg as (
    select
      grouping(b.team_id) as g_team,
      grouping(b.building_id) as g_building,
      grouping(b.dependency_id) as g_dependency,
      b.team_id, b.building_id, b.dependency_id, b.requester_id,
      count(*) as tickets,
      count(*) filter (where b.status = 'duplicate') as duplicates
    from base b
    group by grouping sets ((b.team_id), (b.building_id), (b.dependency_id), (b.requester_id))
  )
  select
    case
      when agg.g_team = 0 then 'team'
      when agg.g_building = 0 then 'building'
      when agg.g_dependency = 0 then 'dependency'
      else 'requester'
    end,
    coalesce(agg.team_id, agg.building_id, agg.dependency_id, agg.requester_id),
    coalesce(tm.name, bld.name, dep.name, req.full_name),
    agg.tickets,
    agg.duplicates,
    round(agg.duplicates::numeric / nullif(agg.tickets, 0), 4)
  from agg
  left join public.teams tm on tm.id = agg.team_id
  left join public.buildings bld on bld.id = agg.building_id
  left join public.dependencies dep on dep.id = agg.dependency_id
  left join public.requesters req on req.id = agg.requester_id;
$$;
comment on function public.metrics_duplicates_by_dimension(date, date, uuid, uuid, uuid, uuid) is
  'Tasa de duplicados por equipo, edificio, dependencia y solicitante, filtrada.';
revoke execute on function public.metrics_duplicates_by_dimension(date, date, uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.metrics_duplicates_by_dimension(date, date, uuid, uuid, uuid, uuid) to authenticated;

-- Carga por técnico, filtrada.
create or replace function public.metrics_by_technician(
  p_from date default null,
  p_to date default null,
  p_building uuid default null,
  p_team uuid default null,
  p_category uuid default null,
  p_dependency uuid default null
)
returns table (
  technician_id uuid,
  technician_name text,
  tickets bigint,
  leader_count bigint,
  auxiliary_count bigint,
  participation_time interval,
  participation_time_labor interval,
  participation_time_extra interval,
  assigned_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    p.technician_id,
    tech.full_name,
    count(distinct p.ticket_id),
    count(*) filter (where p.participation_type = 'leader'),
    count(*) filter (where p.participation_type = 'auxiliary'),
    sum(coalesce(p.ended_at, now()) - p.started_at),
    sum(public.work_calendar_overlap(
      public.ticket_calendar(p.ticket_id),
      p.started_at,
      coalesce(p.ended_at, now()))),
    sum(coalesce(p.ended_at, now()) - p.started_at)
      - sum(public.work_calendar_overlap(
          public.ticket_calendar(p.ticket_id),
          p.started_at,
          coalesce(p.ended_at, now()))),
    (select count(*)
       from public.ticket_assignments a
       join public.tickets ta on ta.id = a.ticket_id
      where a.assignee_technician_id = p.technician_id
        and a.stage = 'technician'
        and public.metrics_date_in(ta.reported_at, p_from, p_to)
        and public.metrics_dims_in(p_building, p_team, p_category, p_dependency,
          ta.building_id, ta.team_id, ta.category_id, ta.dependency_id))
  from public.ticket_participants p
  join public.technicians tech on tech.id = p.technician_id
  join public.tickets t on t.id = p.ticket_id
  where public.metrics_date_in(t.reported_at, p_from, p_to)
    and public.metrics_dims_in(p_building, p_team, p_category, p_dependency,
      t.building_id, t.team_id, t.category_id, t.dependency_id)
  group by p.technician_id, tech.full_name
  order by count(distinct p.ticket_id) desc;
$$;
comment on function public.metrics_by_technician(date, date, uuid, uuid, uuid, uuid) is
  'Carga por técnico y horas de apoyo, filtrada.';
revoke execute on function public.metrics_by_technician(date, date, uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.metrics_by_technician(date, date, uuid, uuid, uuid, uuid) to authenticated;

-- Rechazos y cancelaciones por motivo, filtrados.
create or replace function public.metrics_reject_cancel_by_reason(
  p_from date default null,
  p_to date default null,
  p_building uuid default null,
  p_team uuid default null,
  p_category uuid default null,
  p_dependency uuid default null
)
returns table (event_type text, reason_name text, tickets bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select e.type::text, r.name, count(*)
  from public.ticket_events e
  join public.reasons r on r.id = e.reason_id
  join public.tickets t on t.id = e.ticket_id
  where e.type in ('rejected', 'cancelled')
    and public.metrics_date_in(t.reported_at, p_from, p_to)
    and public.metrics_dims_in(p_building, p_team, p_category, p_dependency,
      t.building_id, t.team_id, t.category_id, t.dependency_id)
  group by e.type, r.name
  order by count(*) desc;
$$;
comment on function public.metrics_reject_cancel_by_reason(date, date, uuid, uuid, uuid, uuid) is
  'Rechazos y cancelaciones agrupados por motivo, filtrados.';
revoke execute on function public.metrics_reject_cancel_by_reason(date, date, uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.metrics_reject_cancel_by_reason(date, date, uuid, uuid, uuid, uuid) to authenticated;

-- Ruteo y toma agregados, filtrados.
create or replace function public.metrics_routing(
  p_from date default null,
  p_to date default null,
  p_building uuid default null,
  p_team uuid default null,
  p_category uuid default null,
  p_dependency uuid default null
)
returns table (
  offers bigint,
  pending_offers bigint,
  taken bigint,
  avg_time_to_take interval
)
language sql
stable
security invoker
set search_path = ''
as $$
  with base as (
    select
      t.id,
      (select count(*) from public.ticket_offers o where o.ticket_id = t.id) as offers,
      (select count(*) from public.ticket_offers o
        where o.ticket_id = t.id and o.status = 'offered') as pending_offers,
      (select count(*) from public.ticket_offers o
        where o.ticket_id = t.id and o.status = 'taken') as taken,
      (select min(o.resolved_at) from public.ticket_offers o
        where o.ticket_id = t.id and o.status = 'taken') - t.reported_at as time_to_take
    from public.tickets t
    where public.metrics_date_in(t.reported_at, p_from, p_to)
      and public.metrics_dims_in(p_building, p_team, p_category, p_dependency,
        t.building_id, t.team_id, t.category_id, t.dependency_id)
  )
  select sum(offers), sum(pending_offers), sum(taken), avg(time_to_take)
  from base;
$$;
comment on function public.metrics_routing(date, date, uuid, uuid, uuid, uuid) is
  'Ofertas, pendientes, tomadas y tiempo medio hasta la toma, filtrados.';
revoke execute on function public.metrics_routing(date, date, uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.metrics_routing(date, date, uuid, uuid, uuid, uuid) to authenticated;
