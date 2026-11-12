import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import type { MetricsFilters } from './filters.js'
import type { MeasureStat, MetricsTimeMode } from './phase-columns.js'
import {
  metricsAging,
  metricsAgingBuckets,
  metricsBase,
  metricsGroups,
  metricsRatings,
  metricsVolume,
} from './summary-sql.js'

type AggregateRow = Record<string, unknown>

const META_KEYS = new Set([
  'dimension',
  'dimension_id',
  'dimension_name',
  'parent_id',
])

function camelize(key: string) {
  return key.replace(/_([a-z0-9])/g, (_, letter: string) =>
    letter.toUpperCase(),
  )
}

function value(row: AggregateRow, key: string): number {
  return Number(row[key] ?? 0)
}

/** Convierte las columnas SQL (snake_case) en el contrato de la API. */
function numbers(row: AggregateRow): Record<string, number> {
  const result: Record<string, number> = {}
  for (const [key, raw] of Object.entries(row)) {
    if (META_KEYS.has(key)) continue
    result[camelize(key)] = Number(raw ?? 0)
  }
  return result
}

function rate(part: number, total: number) {
  return total > 0 ? part / total : 0
}

function toSummary(row: AggregateRow | undefined) {
  const data = row ?? {}
  const tickets = value(data, 'tickets')
  return {
    ...numbers(data),
    reassignmentRate: rate(value(data, 'reassigned'), tickets),
    technicianReassignmentRate: rate(
      value(data, 'reassigned_technician'),
      tickets,
    ),
    recaptureRate: rate(value(data, 'recaptured'), tickets),
    reopenRate: rate(
      value(data, 'reopened'),
      value(data, 'closed_or_reopened'),
    ),
    firstTimeFixRate: rate(value(data, 'first_fix'), value(data, 'closed')),
  }
}

function toGroup(row: AggregateRow) {
  const tickets = value(row, 'tickets')
  const closed = value(row, 'closed')
  return {
    dimension: String(row.dimension),
    row: {
      id: typeof row.dimension_id === 'string' ? row.dimension_id : '',
      name: typeof row.dimension_name === 'string' ? row.dimension_name : '',
      parentId: typeof row.parent_id === 'string' ? row.parent_id : null,
      ...numbers(row),
      reassignmentRate: rate(value(row, 'reassigned'), tickets),
      recaptureRate: rate(value(row, 'recaptured'), tickets),
      reopenRate: rate(
        value(row, 'reopened'),
        value(row, 'closed_or_reopened'),
      ),
      firstFixRate: rate(value(row, 'first_fix'), closed),
      reopened: value(row, 'reopened'),
      closed,
    },
  }
}

interface SummaryData {
  groups: AggregateRow[] | null
  volume: Array<{ month: string; tickets: number }> | null
  aging_buckets: Array<{ bucket: string; tickets: number }> | null
  aging: Array<{
    id: string
    folio: string
    status: string
    age_minutes: number
  }> | null
  rating_counts: Array<{ score: number; ratings: number }> | null
}

function volumePoints(data: SummaryData | undefined) {
  return (data?.volume ?? []).map((point) => ({
    month: point.month,
    tickets: Number(point.tickets),
  }))
}

function agingRows(data: SummaryData | undefined) {
  return (data?.aging ?? []).map((row) => ({
    id: row.id,
    folio: row.folio,
    status: row.status,
    ageMinutes: Number(row.age_minutes),
  }))
}

function agingBuckets(data: SummaryData | undefined) {
  return (data?.aging_buckets ?? []).map((row) => ({
    bucket: row.bucket,
    tickets: Number(row.tickets),
  }))
}

function satisfaction(data: SummaryData | undefined) {
  const ratings = data?.rating_counts ?? []
  return [1, 2, 3, 4, 5].map(
    (score) =>
      Number(ratings.find((row) => Number(row.score) === score)?.ratings) || 0,
  )
}

function toResponse(data: SummaryData | undefined) {
  const groups = data?.groups ?? []
  const all = groups.find((group) => group.dimension === 'all')
  return {
    summary: toSummary(all),
    groups: groups.filter((group) => group.dimension !== 'all').map(toGroup),
    volume: volumePoints(data),
    aging: agingRows(data),
    agingBuckets: agingBuckets(data),
    satisfactionDistribution: satisfaction(data),
  }
}

export async function metricsSummary(
  db: Database,
  actor: Actor,
  filters: MetricsFilters,
  options: {
    compact?: boolean
    stat?: MeasureStat
    timeMode?: MetricsTimeMode
  } = {},
) {
  const compact = options.compact ?? false
  const stat = options.stat ?? 'average'
  const timeMode = options.timeMode ?? 'calendar'
  const result = await db.execute(sql`
    with base as materialized (${metricsBase(actor, filters, 'ticket.view', { scope: 'all' })}),
    aging_base as materialized (
      ${metricsBase(actor, filters, 'ticket.view', { scope: 'all', ignorePeriod: true })}
    ),
    grouped as (${metricsGroups(compact, stat, timeMode)}),
    volume as (${metricsVolume(actor.timezone)}),
    aging as (${metricsAging()}),
    aging_buckets as (${metricsAgingBuckets()}),
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
