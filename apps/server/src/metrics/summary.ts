import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import type { MetricsFilters } from './filters.js'
import {
  metricsAging,
  metricsBase,
  metricsGroups,
  metricsRatings,
  metricsVolume,
} from './summary-sql.js'

type AggregateRow = {
  dimension: string
  dimension_id: string | null
  dimension_name: string | null
  parent_id: string | null
  tickets: number
  open: number
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
  avg_reassignment: number
  avg_wait: number
  avg_pause: number
  avg_validation: number
  avg_claim: number
  avg_total_labor: number
  avg_net_labor: number
  sum_total: number
  sum_net: number
  sum_active: number
  sum_active_extra: number
  sum_response: number
  sum_assignment: number
  sum_reassignment: number
  sum_wait: number
  sum_pause: number
  sum_validation: number
  sum_claim: number
  sum_total_labor: number
  sum_net_labor: number
}

const EMPTY_AGGREGATE: AggregateRow = {
  dimension: 'all',
  dimension_id: null,
  dimension_name: null,
  parent_id: null,
  tickets: 0,
  open: 0,
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
  avg_reassignment: 0,
  avg_wait: 0,
  avg_pause: 0,
  avg_validation: 0,
  avg_claim: 0,
  avg_total_labor: 0,
  avg_net_labor: 0,
  sum_total: 0,
  sum_net: 0,
  sum_active: 0,
  sum_active_extra: 0,
  sum_response: 0,
  sum_assignment: 0,
  sum_reassignment: 0,
  sum_wait: 0,
  sum_pause: 0,
  sum_validation: 0,
  sum_claim: 0,
  sum_total_labor: 0,
  sum_net_labor: 0,
}

function rate(part: number, total: number) {
  return total > 0 ? part / total : 0
}

function toSummary(row: AggregateRow | undefined) {
  const data = row ?? EMPTY_AGGREGATE
  const tickets = Number(data.tickets)
  return {
    tickets,
    open: Number(data.open),
    reassigned: Number(data.reassigned),
    reassignedTechnician: Number(data.reassigned_technician),
    recaptured: Number(data.recaptured),
    reopened: Number(data.reopened),
    closed: Number(data.closed),
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
    avgReassignment: Number(data.avg_reassignment),
    avgWait: Number(data.avg_wait),
    avgPause: Number(data.avg_pause),
    avgValidation: Number(data.avg_validation),
    avgClaim: Number(data.avg_claim),
    avgTotalLabor: Number(data.avg_total_labor),
    avgNetLabor: Number(data.avg_net_labor),
    sumTotal: Number(data.sum_total),
    sumNet: Number(data.sum_net),
    sumActive: Number(data.sum_active),
    sumActiveExtra: Number(data.sum_active_extra),
    sumResponse: Number(data.sum_response),
    sumAssignment: Number(data.sum_assignment),
    sumReassignment: Number(data.sum_reassignment),
    sumWait: Number(data.sum_wait),
    sumPause: Number(data.sum_pause),
    sumValidation: Number(data.sum_validation),
    sumClaim: Number(data.sum_claim),
    sumTotalLabor: Number(data.sum_total_labor),
    sumNetLabor: Number(data.sum_net_labor),
  }
}

function toGroup(row: AggregateRow) {
  const tickets = Number(row.tickets)
  const closed = Number(row.closed)
  return {
    dimension: row.dimension,
    row: {
      id: row.dimension_id ?? '',
      name: row.dimension_name ?? '',
      parentId: row.parent_id,
      tickets,
      open: Number(row.open),
      avgActive: Number(row.avg_active),
      avgTotal: Number(row.avg_total),
      avgActiveExtra: Number(row.avg_active_extra),
      avgResponse: Number(row.avg_response),
      avgAssignment: Number(row.avg_assignment),
      avgReassignment: Number(row.avg_reassignment),
      avgWait: Number(row.avg_wait),
      avgPause: Number(row.avg_pause),
      avgValidation: Number(row.avg_validation),
      avgClaim: Number(row.avg_claim),
      avgTotalLabor: Number(row.avg_total_labor),
      avgNetLabor: Number(row.avg_net_labor),
      sumActive: Number(row.sum_active),
      sumTotal: Number(row.sum_total),
      sumActiveExtra: Number(row.sum_active_extra),
      sumResponse: Number(row.sum_response),
      sumAssignment: Number(row.sum_assignment),
      sumReassignment: Number(row.sum_reassignment),
      sumWait: Number(row.sum_wait),
      sumPause: Number(row.sum_pause),
      sumValidation: Number(row.sum_validation),
      sumClaim: Number(row.sum_claim),
      sumTotalLabor: Number(row.sum_total_labor),
      sumNetLabor: Number(row.sum_net_labor),
      reassignmentRate: rate(Number(row.reassigned), tickets),
      recaptureRate: rate(Number(row.recaptured), tickets),
      reopenRate: rate(Number(row.reopened), tickets),
      firstFixRate: rate(Number(row.first_fix), closed),
      reopened: Number(row.reopened),
      closed,
    },
  }
}

interface SummaryData {
  groups: AggregateRow[] | null
  volume: Array<{ month: string; tickets: number }> | null
  aging: Array<{
    id: string
    folio: string
    status: string
    age_minutes: number
  }> | null
  rating_counts: Array<{ score: number; ratings: number }> | null
}

function toResponse(data: SummaryData | undefined) {
  const groups = data?.groups ?? []
  const all = groups.find((group) => group.dimension === 'all')
  const ratings = data?.rating_counts ?? []
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
    satisfactionDistribution: [1, 2, 3, 4, 5].map(
      (score) =>
        Number(ratings.find((row) => Number(row.score) === score)?.ratings) ||
        0,
    ),
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
    aging as (${metricsAging()}),
    ratings as (${metricsRatings()})
    select
      (select json_agg(g order by g.tickets desc, g.dimension_id)
        from grouped g) as groups,
      (select json_agg(v order by v.month) from volume v) as volume,
      ${
        compact
          ? sql`null::json`
          : sql`(select json_agg(a order by a.age_minutes desc) from aging a)`
      } as aging,
      (select json_agg(r order by r.score) from ratings r) as rating_counts
  `)
  return toResponse(result.rows[0] as SummaryData | undefined)
}
