import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import { scopePredicate } from '../tickets/scope.js'
import { activityQueries } from './activity-sql.js'
import type { MetricsFilters } from './filters.js'
import { intervalMinutes, minutesToInterval, number } from './format.js'
import { qualityQueries } from './quality-sql.js'
import { visibleTickets } from './summary-sql.js'
export type { MetricsFilters } from './filters.js'
export { metricsSummary } from './summary.js'

type MetricsRow = Record<string, unknown>
const queries = { ...activityQueries, ...qualityQueries }
type Metric = keyof typeof queries

const countFields = [
  'tickets',
  'pauses',
  'candidates',
  'duplicates',
  'ratings',
  'with_target',
  'met',
  'leader_count',
  'auxiliary_count',
  'assigned_count',
  'offers',
  'pending_offers',
  'taken',
]
const intervalFields = [
  'pause_time',
  'pause_time_labor',
  'participation_time',
  'participation_time_labor',
  'participation_time_extra',
  'avg_time_to_take',
  'active_time',
  'active_time_labor',
  'pause_time',
  'pause_time_labor',
  'wait_time',
  'wait_time_labor',
  'validation_time',
  'validation_time_labor',
  'claim_time',
  'claim_time_labor',
]

/** Conserva la representación HTTP sin volver a agrupar resultados SQL. */
function normalizeRow(row: MetricsRow): MetricsRow {
  const normalized = { ...row }
  for (const field of countFields) {
    if (field in row) normalized[field] = number(row[field])
  }
  for (const field of intervalFields) {
    if (field in row) {
      normalized[field] = minutesToInterval(intervalMinutes(row[field]))
    }
  }
  for (const field of [
    'average_score',
    'avg_target_minutes',
    'avg_resolution_minutes',
  ]) {
    if (field in row)
      normalized[field] = row[field] === null ? null : number(row[field])
  }
  return normalizeRates(row, normalized)
}

function normalizeRates(row: MetricsRow, normalized: MetricsRow) {
  if ('duplicate_rate' in row) {
    normalized.duplicate_rate = number(row.duplicates) / number(row.tickets)
  }
  if ('compliance_rate' in row) {
    normalized.compliance_rate =
      number(row.with_target) > 0
        ? number(row.met) / number(row.with_target)
        : null
  }
  return normalized
}

async function scopedRows(
  db: Database,
  actor: Actor,
  filters: MetricsFilters,
  name: Metric,
): Promise<MetricsRow[]> {
  const result = await db.execute(sql`
    with visible_tickets as materialized (
      ${visibleTickets(actor, filters, 'metrics.view')}
    )
    ${queries[name]}
  `)
  return result.rows.map(normalizeRow)
}

export async function recentActivity(
  db: Database,
  actor: Actor,
  limit: number,
) {
  const result = await db.execute(sql`
    select e.id, e.ticket_id, e.type, e.occurred_at, e.actor_name, t.folio
    from public.v_ticket_timeline e
    join public.tickets t on t.id = e.ticket_id
    join public.requesters r on r.id = t.requester_id
    where ${scopePredicate(actor, 'ticket.view')}
    order by e.occurred_at desc, e.id desc
    limit ${limit}
  `)
  return result.rows
}

export async function pausesByReason(
  db: Database,
  actor: Actor,
  filters: MetricsFilters,
) {
  return scopedRows(db, actor, filters, 'metrics_pauses_by_reason')
}

export async function duplicateTickets(
  db: Database,
  actor: Actor,
  filters: MetricsFilters,
) {
  return scopedRows(db, actor, filters, 'metrics_duplicate_tickets')
}

export async function duplicateAlerts(
  db: Database,
  actor: Actor,
  filters: MetricsFilters,
) {
  return scopedRows(db, actor, filters, 'metrics_duplicate_alerts')
}

export async function duplicatesByDimension(
  db: Database,
  actor: Actor,
  filters: MetricsFilters,
) {
  return scopedRows(db, actor, filters, 'metrics_duplicates_by_dimension')
}

export async function satisfaction(
  db: Database,
  actor: Actor,
  filters: MetricsFilters,
) {
  return scopedRows(db, actor, filters, 'metrics_satisfaction')
}

export async function sla(db: Database, actor: Actor, filters: MetricsFilters) {
  return scopedRows(db, actor, filters, 'metrics_sla')
}

export async function slaByPriority(
  db: Database,
  actor: Actor,
  filters: MetricsFilters,
) {
  return scopedRows(db, actor, filters, 'metrics_sla_by_priority')
}

export async function byTechnician(
  db: Database,
  actor: Actor,
  filters: MetricsFilters,
) {
  return scopedRows(db, actor, filters, 'metrics_by_technician')
}

export async function rejectCancel(
  db: Database,
  actor: Actor,
  filters: MetricsFilters,
) {
  return scopedRows(db, actor, filters, 'metrics_reject_cancel_by_reason')
}

export async function routing(
  db: Database,
  actor: Actor,
  filters: MetricsFilters,
) {
  return scopedRows(db, actor, filters, 'metrics_routing')
}
