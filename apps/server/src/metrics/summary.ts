import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import { scopePredicate } from '../tickets/scope.js'
import { filterParams, type MetricsFilters } from './filters.js'

function metricsBase(actor: Actor, filters: MetricsFilters) {
  const p = filterParams(filters)
  return sql`
    select v.*
    from public.v_ticket_metrics_base v
    where exists (
      select 1 from public.tickets t
      join public.requesters r on r.id = t.requester_id
      where t.id = v.id and ${scopePredicate(actor, 'ticket.view')}
    )
      and public.metrics_date_in(
        v.reported_at, ${p.p_from}::date, ${p.p_to}::date
      )
      and (${p.p_building}::uuid is null or v.building_id = ${p.p_building}::uuid)
      and (${p.p_team}::uuid is null or v.team_id = ${p.p_team}::uuid)
      and (${p.p_category}::uuid is null or v.category_id = ${p.p_category}::uuid)
      and (${p.p_dependency}::uuid is null or v.dependency_id = ${p.p_dependency}::uuid)
  `
}

function metricsGroups(compact: boolean) {
  return sql`
    select
      ${
        compact
          ? sql`'all' as dimension, null::text as dimension_id,`
          : sql`case
              when grouping(v.team_id) = 0 then 'team'
              when grouping(v.building_id) = 0 then 'building'
              when grouping(v.category_id) = 0 then 'category'
              when grouping(v.dependency_id) = 0 then 'dependency'
              when grouping(v.requester_id) = 0 then 'requester'
              else 'all'
            end as dimension,
            case
              when grouping(v.team_id) = 0 then v.team_id::text
              when grouping(v.building_id) = 0 then v.building_id::text
              when grouping(v.category_id) = 0 then v.category_id::text
              when grouping(v.dependency_id) = 0 then v.dependency_id::text
              when grouping(v.requester_id) = 0 then v.requester_id::text
            end as dimension_id,`
      }
      count(*)::int as tickets,
      count(*) filter (where v.reassigned_supervisor)::int as reassigned,
      count(*) filter (where v.reassigned_technician)::int as reassigned_technician,
      count(*) filter (where v.recaptured)::int as recaptured,
      count(*) filter (where v.reopened)::int as reopened,
      count(*) filter (where v.status = 'closed')::int as closed,
      count(*) filter (where v.status = 'closed' and not v.reopened)::int as first_fix,
      coalesce(avg(extract(epoch from v.total_time) / 60), 0) as avg_total,
      coalesce(avg(extract(epoch from v.net_time) / 60), 0) as avg_net,
      coalesce(avg(extract(epoch from v.active_work_time) / 60), 0) as avg_active,
      coalesce(avg(extract(epoch from v.active_work_time_labor) / 60), 0) as avg_active_labor,
      coalesce(avg(extract(epoch from v.active_work_time_extra) / 60), 0) as avg_active_extra,
      coalesce(avg(extract(epoch from v.response_time) / 60), 0) as avg_response,
      coalesce(avg(extract(epoch from v.assignment_time) / 60), 0) as avg_assignment,
      coalesce(avg(extract(epoch from v.validation_time) / 60), 0) as avg_validation,
      coalesce(sum(extract(epoch from v.total_time) / 60), 0) as sum_total,
      coalesce(sum(extract(epoch from v.net_time) / 60), 0) as sum_net,
      coalesce(sum(extract(epoch from v.active_work_time) / 60), 0) as sum_active,
      coalesce(sum(extract(epoch from v.active_work_time_extra) / 60), 0) as sum_active_extra,
      coalesce(sum(extract(epoch from v.response_time) / 60), 0) as sum_response,
      coalesce(sum(extract(epoch from v.assignment_time) / 60), 0) as sum_assignment,
      coalesce(sum(extract(epoch from v.validation_time) / 60), 0) as sum_validation
    from base v
    group by ${
      compact
        ? sql`grouping sets (())`
        : sql`grouping sets (
            (v.team_id), (v.building_id), (v.category_id), (v.dependency_id),
            (v.requester_id), ()
          )`
    }
  `
}

function metricsVolume() {
  return sql`
    select
      to_char(v.reported_at at time zone 'UTC', 'YYYY-MM') as month,
      count(*)::int as tickets
    from base v
    group by 1
  `
}

function metricsAging() {
  return sql`
    select
      v.id, v.folio, v.status,
      greatest(0, extract(epoch from (now() - v.reported_at)) / 60) as age_minutes
    from base v
    where v.status in (
      'registered', 'with_supervisor', 'assigned', 'in_progress',
      'paused', 'attended', 'under_claim'
    )
    order by age_minutes desc
    limit 8
  `
}

type AggregateRow = {
  dimension: string
  dimension_id: string | null
  tickets: number
  reassigned: number
  reassigned_technician: number
  recaptured: number
  reopened: number
  closed: number
  first_fix: number
  avg_total: number
  avg_net: number
  avg_active: number
  avg_active_labor: number
  avg_active_extra: number
  avg_response: number
  avg_assignment: number
  avg_validation: number
  sum_total: number
  sum_net: number
  sum_active: number
  sum_active_extra: number
  sum_response: number
  sum_assignment: number
  sum_validation: number
}

const EMPTY_AGGREGATE: AggregateRow = {
  dimension: 'all',
  dimension_id: null,
  tickets: 0,
  reassigned: 0,
  reassigned_technician: 0,
  recaptured: 0,
  reopened: 0,
  closed: 0,
  first_fix: 0,
  avg_total: 0,
  avg_net: 0,
  avg_active: 0,
  avg_active_labor: 0,
  avg_active_extra: 0,
  avg_response: 0,
  avg_assignment: 0,
  avg_validation: 0,
  sum_total: 0,
  sum_net: 0,
  sum_active: 0,
  sum_active_extra: 0,
  sum_response: 0,
  sum_assignment: 0,
  sum_validation: 0,
}

function rate(part: number, total: number) {
  return total > 0 ? part / total : 0
}

function toSummary(row: AggregateRow | undefined) {
  const data = row ?? EMPTY_AGGREGATE
  const tickets = Number(data.tickets)
  return {
    tickets,
    reassigned: Number(data.reassigned),
    reassignedTechnician: Number(data.reassigned_technician),
    recaptured: Number(data.recaptured),
    reopened: Number(data.reopened),
    reassignmentRate: rate(Number(data.reassigned), tickets),
    technicianReassignmentRate: rate(
      Number(data.reassigned_technician),
      tickets,
    ),
    recaptureRate: rate(Number(data.recaptured), tickets),
    reopenRate: rate(Number(data.reopened), tickets),
    firstTimeFixRate: rate(Number(data.first_fix), Number(data.closed)),
    avgTotal: Number(data.avg_total),
    avgNet: Number(data.avg_net),
    avgActive: Number(data.avg_active),
    avgActiveLabor: Number(data.avg_active_labor),
    avgActiveExtra: Number(data.avg_active_extra),
    avgResponse: Number(data.avg_response),
    avgAssignment: Number(data.avg_assignment),
    avgValidation: Number(data.avg_validation),
    sumTotal: Number(data.sum_total),
    sumNet: Number(data.sum_net),
    sumActive: Number(data.sum_active),
    sumActiveExtra: Number(data.sum_active_extra),
    sumResponse: Number(data.sum_response),
    sumAssignment: Number(data.sum_assignment),
    sumValidation: Number(data.sum_validation),
  }
}

function toGroup(row: AggregateRow) {
  const tickets = Number(row.tickets)
  return {
    dimension: row.dimension,
    row: {
      id: row.dimension_id ?? '',
      tickets,
      avgActive: Number(row.avg_active),
      avgTotal: Number(row.avg_total),
      avgActiveExtra: Number(row.avg_active_extra),
      sumActive: Number(row.sum_active),
      sumTotal: Number(row.sum_total),
      sumActiveExtra: Number(row.sum_active_extra),
      reassignmentRate: rate(Number(row.reassigned), tickets),
      recaptureRate: rate(Number(row.recaptured), tickets),
    },
  }
}

export async function metricsSummary(
  db: Database,
  actor: Actor,
  filters: MetricsFilters,
  compact = false,
) {
  const result = await db.execute(sql`
    with base as materialized (${metricsBase(actor, filters)}),
    grouped as (${metricsGroups(compact)}),
    volume as (${metricsVolume()}),
    aging as (${metricsAging()})
    select
      (select json_agg(g order by g.tickets desc, g.dimension_id)
        from grouped g) as groups,
      (select json_agg(v order by v.month) from volume v) as volume,
      ${
        compact
          ? sql`null::json`
          : sql`(select json_agg(a order by a.age_minutes desc) from aging a)`
      } as aging
  `)
  const data = result.rows[0] as
    | {
        groups: AggregateRow[] | null
        volume: Array<{ month: string; tickets: number }> | null
        aging: Array<{
          id: string
          folio: string
          status: string
          age_minutes: number
        }> | null
      }
    | undefined
  const groups = data?.groups ?? []
  const all = groups.find((group) => group.dimension === 'all')
  return {
    summary: toSummary(all),
    groups: groups.filter((group) => group.dimension !== 'all').map(toGroup),
    volume: (data?.volume ?? []).map((point) => ({
      month: point.month,
      tickets: Number(point.tickets),
    })),
    aging: (data?.aging ?? []).map((row) => ({
      id: row.id,
      folio: row.folio,
      status: row.status,
      ageMinutes: Number(row.age_minutes),
    })),
  }
}
