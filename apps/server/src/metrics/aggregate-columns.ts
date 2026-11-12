import { sql, type SQL } from 'drizzle-orm'

import {
  PHASE_KEYS,
  isRobustStat,
  performancePredicate,
  phaseMinutes,
  phasePredicate,
  statAggregate,
  type MeasureStat,
  type MetricsTimeMode,
} from './phase-columns.js'

export const OPEN_STATUSES = sql`(
  'registered', 'with_supervisor', 'assigned', 'in_progress', 'paused',
  'attended', 'under_claim'
)`

function performance() {
  return performancePredicate()
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
    count(*) filter (where v.has_unverified_time)::int as unverified_tickets,
    count(*) filter (
      where exists (
        select 1 from public.ticket_time_alerts a
        where a.ticket_id = v.id and a.status = 'open'
      )
    )::int as open_time_alerts,
    coalesce(avg(extract(epoch from v.total_time) / 60), 0) as avg_total,
    coalesce(avg(extract(epoch from v.total_time) / 60), 0) as avg_total_all,
    coalesce(avg(extract(epoch from v.total_time_labor) / 60), 0) as avg_total_labor,
    coalesce(avg(greatest(0, extract(epoch from (v.total_time - v.total_time_labor))) / 60), 0) as avg_total_extra,
    coalesce(sum(extract(epoch from v.total_time) / 60), 0) as sum_total,
    coalesce(sum(extract(epoch from v.total_time) / 60), 0) as sum_total_all,
    coalesce(sum(extract(epoch from v.total_time_labor) / 60), 0) as sum_total_labor,
    coalesce(sum(greatest(0, extract(epoch from (v.total_time - v.total_time_labor))) / 60), 0) as sum_total_extra
  `
}

function rateColumns() {
  const p = performance()
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
    coalesce(avg(extract(epoch from v.total_time_labor) / 60) filter (
      where v.status = 'closed' and ${p}
    ), 0) as avg_total_closed_labor,
    coalesce(avg(extract(epoch from v.total_time) / 60) filter (
      where v.status = 'closed' and ${p}
    ), 0) as avg_resolution,
    coalesce(sum(extract(epoch from v.total_time) / 60) filter (
      where v.status = 'closed' and ${p}
    ), 0) as sum_total_closed,
    coalesce(sum(extract(epoch from v.total_time_labor) / 60) filter (
      where v.status = 'closed' and ${p}
    ), 0) as sum_total_closed_labor,
    coalesce(sum(extract(epoch from v.total_time) / 60) filter (
      where v.status = 'closed' and ${p}
    ), 0) as sum_resolution
  `
}

function phaseColumns() {
  const p = performance()
  return sql`
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
    coalesce(sum(extract(epoch from v.net_time) / 60) filter (where ${p}), 0) as sum_net,
    coalesce(sum(extract(epoch from v.active_work_time) / 60) filter (where ${p}), 0) as sum_active,
    coalesce(sum(extract(epoch from v.active_work_time_labor) / 60) filter (where ${p}), 0) as sum_active_labor,
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

const MODE_PHASES: Array<[string, string]> = [
  ['response', 'response_time'],
  ['assignment', 'assignment_time'],
  ['pending_take', 'pending_take_time'],
  ['reassignment', 'reassignment_time'],
  ['wait', 'wait_start_time'],
  ['pause', 'pause_time'],
  ['validation', 'validation_time'],
  ['claim', 'claim_time'],
]

function modeColumns() {
  const p = performance()
  const parts: SQL[] = []
  for (const [key, column] of MODE_PHASES) {
    parts.push(
      sql`coalesce(avg(extract(epoch from v.${sql.identifier(`${column}_labor`)}) / 60) filter (where ${p}), 0) as ${sql.identifier(`avg_${key}_labor`)}`,
    )
    parts.push(
      sql`coalesce(avg(extract(epoch from v.${sql.identifier(`${column}_extra`)}) / 60) filter (where ${p}), 0) as ${sql.identifier(`avg_${key}_extra`)}`,
    )
    parts.push(
      sql`coalesce(sum(extract(epoch from v.${sql.identifier(`${column}_labor`)}) / 60) filter (where ${p}), 0) as ${sql.identifier(`sum_${key}_labor`)}`,
    )
    parts.push(
      sql`coalesce(sum(extract(epoch from v.${sql.identifier(`${column}_extra`)}) / 60) filter (where ${p}), 0) as ${sql.identifier(`sum_${key}_extra`)}`,
    )
  }
  return sql.join(parts, sql`, `)
}

function statColumns(stat: MeasureStat, mode: MetricsTimeMode) {
  if (!isRobustStat(stat)) return sql``
  const p = performance()
  const parts: SQL[] = []
  for (const key of PHASE_KEYS) {
    const minutes = phaseMinutes(key, mode)
    const filter = sql`${p} and ${minutes} > 0 and ${phasePredicate(key)}`
    parts.push(
      sql`coalesce(${statAggregate(stat, minutes)} filter (where ${filter}), 0) as ${sql.identifier(`stat_${key}`)}`,
    )
    parts.push(
      sql`count(*) filter (where ${filter})::int as ${sql.identifier(`n_${key}`)}`,
    )
  }
  return sql.join(parts, sql`, `)
}

function specialColumns() {
  const p = performance()
  return sql`
    coalesce(avg(extract(epoch from v.dormant_time) / 60) filter (where ${p}), 0) as avg_dormant,
    coalesce(sum(extract(epoch from v.dormant_time) / 60) filter (where ${p}), 0) as sum_dormant,
    coalesce(avg(extract(epoch from v.duplicate_review_time) / 60) filter (where v.duplicate_review_time > interval '0'), 0) as avg_duplicate_review,
    coalesce(sum(extract(epoch from v.duplicate_review_time) / 60), 0) as sum_duplicate_review
  `
}

export function aggregateColumns(stat: MeasureStat, mode: MetricsTimeMode) {
  const parts = [volumeColumns(), rateColumns(), phaseColumns(), modeColumns()]
  if (isRobustStat(stat)) parts.push(statColumns(stat, mode))
  parts.push(specialColumns())
  return sql.join(parts, sql`, `)
}
