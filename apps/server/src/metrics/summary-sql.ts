import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import { scopePredicate } from '../tickets/scope.js'
import { filterParams, type MetricsFilters } from './filters.js'

/** Estados que cuentan como trabajo todavía abierto. */
const OPEN_STATUSES = sql`(
  'registered', 'with_supervisor', 'assigned', 'in_progress', 'paused',
  'attended', 'under_claim'
)`

export type MetricsScope = 'flow' | 'workload' | 'all'

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
      ) as has_unverified_time
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

function volumeColumns() {
  return sql`
    count(*)::int as tickets,
    count(*) filter (where v.status in ${OPEN_STATUSES})::int as open,
    count(*) filter (where v.status = 'closed')::int as closed,
    count(*) filter (where v.status not in ('rejected', 'cancelled', 'duplicate'))::int as flow_tickets,
    count(*) filter (where v.status = 'rejected')::int as rejected,
    count(*) filter (where v.status = 'cancelled')::int as cancelled,
    count(*) filter (where v.status = 'duplicate')::int as duplicate,
    coalesce(avg(extract(epoch from v.total_time) / 60), 0) as avg_total,
    coalesce(avg(extract(epoch from v.total_time) / 60), 0) as avg_total_all,
    coalesce(avg(extract(epoch from v.total_time_labor) / 60), 0) as avg_total_labor,
    coalesce(sum(extract(epoch from v.total_time) / 60), 0) as sum_total,
    coalesce(sum(extract(epoch from v.total_time) / 60), 0) as sum_total_all,
    coalesce(sum(extract(epoch from v.total_time_labor) / 60), 0) as sum_total_labor
  `
}

function performanceColumns() {
  const p = sql`(v.outcome <> 'duplicate' and not v.has_unverified_time)`
  return sql`
    count(*) filter (where ${p} and v.reassigned_supervisor)::int as reassigned,
    count(*) filter (where ${p} and v.reassigned_technician)::int as reassigned_technician,
    count(*) filter (where ${p} and v.recaptured)::int as recaptured,
    count(*) filter (where ${p} and v.reopened)::int as reopened,
    count(*) filter (where ${p} and v.status = 'closed' and not v.reopened)::int as first_fix,
    count(*) filter (where ${p} and (v.status = 'closed' or v.reopened))::int as closed_or_reopened,
    coalesce(avg(extract(epoch from v.total_time) / 60) filter (
      where v.status = 'closed' and ${p}
    ), 0) as avg_total_closed,
    coalesce(avg(extract(epoch from v.total_time) / 60) filter (
      where v.status = 'closed' and ${p}
    ), 0) as avg_resolution,
    coalesce(avg(extract(epoch from v.net_time) / 60) filter (where ${p}), 0) as avg_net,
    coalesce(avg(extract(epoch from v.active_work_time) / 60) filter (where ${p}), 0) as avg_active,
    coalesce(avg(extract(epoch from v.active_work_time_labor) / 60) filter (where ${p}), 0) as avg_active_labor,
    coalesce(avg(extract(epoch from v.active_work_time_extra) / 60) filter (where ${p}), 0) as avg_active_extra,
    coalesce(avg(extract(epoch from v.response_time) / 60) filter (where ${p}), 0) as avg_response,
    coalesce(avg(extract(epoch from v.assignment_time) / 60) filter (where ${p}), 0) as avg_assignment,
    coalesce(avg(extract(epoch from v.pending_take_time) / 60) filter (where ${p}), 0) as avg_pending_take,
    coalesce(avg(extract(epoch from v.reassignment_time) / 60) filter (where ${p}), 0) as avg_reassignment,
    coalesce(avg(extract(epoch from v.wait_start_time) / 60) filter (where ${p}), 0) as avg_wait,
    coalesce(avg(extract(epoch from v.pause_time) / 60) filter (where ${p}), 0) as avg_pause,
    coalesce(avg(extract(epoch from v.validation_time) / 60) filter (where ${p}), 0) as avg_validation,
    coalesce(avg(extract(epoch from v.claim_time) / 60) filter (where ${p}), 0) as avg_claim,
    coalesce(avg(extract(epoch from v.net_time_labor) / 60) filter (where ${p}), 0) as avg_net_labor,
    coalesce(sum(extract(epoch from v.total_time) / 60) filter (
      where v.status = 'closed' and ${p}
    ), 0) as sum_total_closed,
    coalesce(sum(extract(epoch from v.total_time) / 60) filter (
      where v.status = 'closed' and ${p}
    ), 0) as sum_resolution,
    coalesce(sum(extract(epoch from v.net_time) / 60) filter (where ${p}), 0) as sum_net,
    coalesce(sum(extract(epoch from v.active_work_time) / 60) filter (where ${p}), 0) as sum_active,
    coalesce(sum(extract(epoch from v.active_work_time_extra) / 60) filter (where ${p}), 0) as sum_active_extra,
    coalesce(sum(extract(epoch from v.response_time) / 60) filter (where ${p}), 0) as sum_response,
    coalesce(sum(extract(epoch from v.assignment_time) / 60) filter (where ${p}), 0) as sum_assignment,
    coalesce(sum(extract(epoch from v.pending_take_time) / 60) filter (where ${p}), 0) as sum_pending_take,
    coalesce(sum(extract(epoch from v.reassignment_time) / 60) filter (where ${p}), 0) as sum_reassignment,
    coalesce(sum(extract(epoch from v.wait_start_time) / 60) filter (where ${p}), 0) as sum_wait,
    coalesce(sum(extract(epoch from v.pause_time) / 60) filter (where ${p}), 0) as sum_pause,
    coalesce(sum(extract(epoch from v.validation_time) / 60) filter (where ${p}), 0) as sum_validation,
    coalesce(sum(extract(epoch from v.claim_time) / 60) filter (where ${p}), 0) as sum_claim,
    coalesce(sum(extract(epoch from v.net_time_labor) / 60) filter (where ${p}), 0) as sum_net_labor
  `
}

function aggregateColumns() {
  return sql`${volumeColumns()}, ${performanceColumns()}`
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

export function metricsGroups(compact: boolean) {
  return sql`
    select
      ${compact ? compactSelect() : groupedSelect()}
      ${aggregateColumns()}
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
