-- Duplicados por dimensión: agrega la dimensión categoría (faltaba en la vista).
-- Recrea la función con el mismo contrato; solo se añade el agrupamiento por categoría.

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
    select
      t.team_id,
      t.building_id,
      t.category_id,
      t.dependency_id,
      t.requester_id,
      t.status
    from public.tickets t
    where public.metrics_date_in(t.reported_at, p_from, p_to)
      and public.metrics_dims_in(p_building, p_team, p_category, p_dependency,
        t.building_id, t.team_id, t.category_id, t.dependency_id)
  ),
  agg as (
    select
      grouping(b.team_id) as g_team,
      grouping(b.building_id) as g_building,
      grouping(b.category_id) as g_category,
      grouping(b.dependency_id) as g_dependency,
      b.team_id,
      b.building_id,
      b.category_id,
      b.dependency_id,
      b.requester_id,
      count(*) as tickets,
      count(*) filter (where b.status = 'duplicate') as duplicates
    from base b
    group by grouping sets (
      (b.team_id), (b.building_id), (b.category_id), (b.dependency_id), (b.requester_id)
    )
  )
  select
    case
      when agg.g_team = 0 then 'team'
      when agg.g_building = 0 then 'building'
      when agg.g_category = 0 then 'category'
      when agg.g_dependency = 0 then 'dependency'
      else 'requester'
    end,
    coalesce(agg.team_id, agg.building_id, agg.category_id, agg.dependency_id, agg.requester_id),
    coalesce(tm.name, bld.name, cat.name, dep.name, req.full_name),
    agg.tickets,
    agg.duplicates,
    round(agg.duplicates::numeric / nullif(agg.tickets, 0), 4)
  from agg
  left join public.teams tm on tm.id = agg.team_id
  left join public.buildings bld on bld.id = agg.building_id
  left join public.categories cat on cat.id = agg.category_id
  left join public.dependencies dep on dep.id = agg.dependency_id
  left join public.requesters req on req.id = agg.requester_id;
$$;
comment on function public.metrics_duplicates_by_dimension(date, date, uuid, uuid, uuid, uuid) is
  'Tasa de duplicados por equipo, edificio, categoría, dependencia y solicitante, filtrada.';
revoke execute on function public.metrics_duplicates_by_dimension(date, date, uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.metrics_duplicates_by_dimension(date, date, uuid, uuid, uuid, uuid) to authenticated;
