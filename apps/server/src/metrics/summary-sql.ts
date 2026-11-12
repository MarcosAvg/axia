import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import { scopePredicate } from '../tickets/scope.js'
import { aggregateColumns, OPEN_STATUSES } from './aggregate-columns.js'
import type { MeasureStat, MetricsTimeMode } from './phase-columns.js'
import { filterParams, type MetricsFilters } from './filters.js'

/** Estados que cuentan como trabajo todavía abierto. */
type MetricsScope = 'flow' | 'workload' | 'all'

/** Base visible y filtrada; cada llamador conserva el permiso de su endpoint. */
type QueryOptions = { scope?: MetricsScope; ignorePeriod?: boolean }

export function visibleTickets(
  actor: Actor,
  filters: MetricsFilters,
  permission: string,
  options: QueryOptions = {},
) {
  const scope = options.scope ?? 'flow'
  const ignorePeriod = options.ignorePeriod ?? false
  const p = filterParams(filters)
  return sql`
    select t.*
    from public.tickets t
    join public.requesters r on r.id = t.requester_id
    where ${scopePredicate(actor, permission)}
      ${
        ignorePeriod
          ? sql``
          : sql`and public.metrics_date_in(
            t.reported_at, ${p.p_from}::date, ${p.p_to}::date,
            ${actor.timezone}
          )`
      }
      and (${p.p_building}::uuid is null or t.building_id = ${p.p_building}::uuid)
      and (${p.p_team}::uuid is null or t.team_id = ${p.p_team}::uuid)
      and (${p.p_category}::uuid is null or t.category_id = ${p.p_category}::uuid)
      and (${p.p_dependency}::uuid is null or t.dependency_id = ${p.p_dependency}::uuid)
      and (${p.p_outcome}::text is null
        or (${p.p_outcome}::text = 'open'
          and t.status not in ('closed', 'rejected', 'cancelled', 'duplicate'))
        or t.status::text = ${p.p_outcome}::text)
      and (${scope}::text = 'all'
        or (${scope}::text = 'workload' and t.status <> 'duplicate')
        or (${scope}::text = 'flow'
          and t.status not in ('rejected', 'cancelled', 'duplicate')))
  `
}

/** Añade las dimensiones y los tiempos de la vista al conjunto autorizado. */
export function metricsBase(
  actor: Actor,
  filters: MetricsFilters,
  permission = 'ticket.view',
  options: QueryOptions = {},
) {
  return sql`
    select v.*, t.subcategory_id, t.problem_id, t.location_id,
      t.channel_id, t.service_type_id,
      exists (
        select 1 from public.ticket_events e
        where e.ticket_id = v.id and e.time_confidence = 'unverified'
      ) as has_unverified_time,
      public.ticket_time_by_kind(v.id, 'dormant'::public.time_span_kind)
        as dormant_time,
      public.ticket_time_by_kind(v.id, 'duplicate_review'::public.time_span_kind)
        as duplicate_review_time,
      public.ticket_time_by_kind_extra(v.id, 'supervisor_response'::public.time_span_kind)
        as response_time_extra,
      public.ticket_time_by_kind_extra(v.id, 'technician_assignment'::public.time_span_kind)
        as assignment_time_extra,
      public.ticket_time_by_kind_extra(v.id, 'pending_take'::public.time_span_kind)
        as pending_take_time_extra,
      public.ticket_time_by_kind_extra(v.id, 'reassignment'::public.time_span_kind)
        as reassignment_time_extra,
      public.ticket_time_by_kind_extra(v.id, 'wait_start'::public.time_span_kind)
        as wait_start_time_extra,
      public.ticket_time_by_kind_extra(v.id, 'pause'::public.time_span_kind)
        as pause_time_extra,
      public.ticket_time_by_kind_extra(v.id, 'validation'::public.time_span_kind)
        as validation_time_extra,
      public.ticket_time_by_kind_extra(v.id, 'claim'::public.time_span_kind)
        as claim_time_extra
    from public.v_ticket_metrics_base v
    join (${visibleTickets(actor, filters, permission, options)}) t
      on t.id = v.id
  `
}

function dimensionCase() {
  return sql`case
    when grouping(v.team_id) = 0 then 'team'
    when grouping(v.building_id) = 0 then 'building'
    when grouping(v.location_id) = 0 then 'location'
    when grouping(v.category_id) = 0 then 'category'
    when grouping(v.subcategory_id) = 0 then 'subcategory'
    when grouping(v.problem_id) = 0 then 'problem'
    when grouping(v.dependency_id) = 0 then 'dependency'
    when grouping(v.requester_id) = 0 then 'requester'
    when grouping(v.outcome) = 0 then 'outcome'
    when grouping(v.status) = 0 then 'status'
    when grouping(v.priority_id) = 0 then 'priority'
    when grouping(v.channel_id) = 0 then 'channel'
    when grouping(v.service_type_id) = 0 then 'service_type'
    else 'all'
  end`
}

function dimensionIdCase() {
  return sql`case
    when grouping(v.team_id) = 0 then v.team_id::text
    when grouping(v.building_id) = 0 then v.building_id::text
    when grouping(v.location_id) = 0 then v.location_id::text
    when grouping(v.category_id) = 0 then v.category_id::text
    when grouping(v.subcategory_id) = 0 then v.subcategory_id::text
    when grouping(v.problem_id) = 0 then v.problem_id::text
    when grouping(v.dependency_id) = 0 then v.dependency_id::text
    when grouping(v.requester_id) = 0 then v.requester_id::text
    when grouping(v.outcome) = 0 then v.outcome
    when grouping(v.status) = 0 then v.status::text
    when grouping(v.priority_id) = 0 then v.priority_id::text
    when grouping(v.channel_id) = 0 then v.channel_id::text
    when grouping(v.service_type_id) = 0 then v.service_type_id::text
  end`
}

function dimensionNameCase() {
  return sql`case
    when grouping(v.team_id) = 0 then max(tm.name)
    when grouping(v.building_id) = 0 then max(bld.name)
    when grouping(v.location_id) = 0 then max(loc.name)
    when grouping(v.category_id) = 0 then max(cat.name)
    when grouping(v.subcategory_id) = 0 then max(sub.name)
    when grouping(v.problem_id) = 0 then max(prob.name)
    when grouping(v.dependency_id) = 0 then max(dep.name)
    when grouping(v.requester_id) = 0 then max(req.full_name)
    when grouping(v.outcome) = 0 then max(v.outcome)
    when grouping(v.status) = 0 then max(v.status::text)
    when grouping(v.priority_id) = 0 then max(pri.name)
    when grouping(v.channel_id) = 0 then max(ch.name)
    when grouping(v.service_type_id) = 0 then max(st.name)
  end`
}

function parentIdCase() {
  return sql`case
    when grouping(v.problem_id) = 0 then max(v.subcategory_id::text)
    when grouping(v.subcategory_id) = 0 then max(v.category_id::text)
    when grouping(v.location_id) = 0 then max(v.building_id::text)
  end`
}

function groupedSelect() {
  return sql`${dimensionCase()} as dimension,
    ${dimensionIdCase()} as dimension_id,
    ${dimensionNameCase()} as dimension_name,
    ${parentIdCase()} as parent_id,`
}

function compactSelect() {
  return sql`'all' as dimension,
    null::text as dimension_id,
    null::text as dimension_name,
    null::text as parent_id,`
}

function catalogJoins() {
  return sql`
    left join public.teams tm on tm.id = v.team_id
    left join public.buildings bld on bld.id = v.building_id
    left join public.locations loc on loc.id = v.location_id
    left join public.categories cat on cat.id = v.category_id
    left join public.subcategories sub on sub.id = v.subcategory_id
    left join public.problems prob on prob.id = v.problem_id
    left join public.dependencies dep on dep.id = v.dependency_id
    left join public.requesters req on req.id = v.requester_id
    left join public.priorities pri on pri.id = v.priority_id
    left join public.channels ch on ch.id = v.channel_id
    left join public.service_types st on st.id = v.service_type_id
  `
}

function groupingSets() {
  return sql`grouping sets (
    (v.team_id), (v.building_id), (v.location_id), (v.category_id),
    (v.subcategory_id), (v.problem_id), (v.dependency_id),
    (v.requester_id), (v.outcome), (v.status), (v.priority_id), (v.channel_id),
    (v.service_type_id), ()
  )`
}

export function metricsGroups(
  compact: boolean,
  stat: MeasureStat,
  mode: MetricsTimeMode,
) {
  return sql`
    select
      ${compact ? compactSelect() : groupedSelect()}
      ${aggregateColumns(stat, mode)}
    from base v
    ${catalogJoins()}
    group by ${compact ? sql`grouping sets (())` : groupingSets()}
  `
}

export function metricsVolume(tz: string) {
  return sql`
    select
      to_char(v.reported_at at time zone ${tz}, 'YYYY-MM') as month,
      count(*)::int as tickets
    from base v
    group by 1
  `
}

export function metricsAgingBuckets() {
  return sql`
    select bucket, count(*)::int as tickets
    from (
      select case
        when extract(epoch from (now() - v.reported_at)) <= 86400 then '0-1'
        when extract(epoch from (now() - v.reported_at)) <= 259200 then '2-3'
        when extract(epoch from (now() - v.reported_at)) <= 604800 then '4-7'
        when extract(epoch from (now() - v.reported_at)) <= 1209600 then '8-14'
        when extract(epoch from (now() - v.reported_at)) <= 2592000 then '15-30'
        else '30+'
      end as bucket
      from aging_base v
      where v.status in ${OPEN_STATUSES}
    ) a
    group by bucket
    order by bucket
  `
}

export function metricsAging() {
  return sql`
    select
      v.id, v.folio, v.status,
      greatest(0, extract(epoch from (now() - v.reported_at)) / 60) as age_minutes
    from aging_base v
    where v.status in ${OPEN_STATUSES}
    order by age_minutes desc
    limit 8
  `
}

export function metricsRatings() {
  return sql`
    select tr.score, count(*)::int as ratings
    from base v
    join public.ticket_ratings tr on tr.ticket_id = v.id
    where v.status not in ('rejected', 'cancelled', 'duplicate')
    group by tr.score
  `
}
