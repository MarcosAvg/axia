import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import { getPermissionScope } from '../tickets/access.js'
import { scopePredicate } from '../tickets/scope.js'
import {
  intervalMinutes,
  mergeBy,
  minutesToInterval,
  number,
} from './merge-impl.js'

export type MetricsFilters = {
  from?: string
  to?: string
  buildingId?: string
  teamId?: string
  categoryId?: string
  dependencyId?: string
}

type MetricsRow = Record<string, unknown>

function filterParams(filters: MetricsFilters) {
  return {
    p_from: filters.from || null,
    p_to: filters.to || null,
    p_building: filters.buildingId || null,
    p_team: filters.teamId || null,
    p_category: filters.categoryId || null,
    p_dependency: filters.dependencyId || null,
  }
}

async function callMetrics(
  db: Database,
  name: string,
  filters: MetricsFilters,
): Promise<MetricsRow[]> {
  const p = filterParams(filters)
  const result = await db.execute(sql`
    select * from ${sql.raw(`public.${name}`)}(
      ${p.p_from}::date, ${p.p_to}::date,
      ${p.p_building}::uuid, ${p.p_team}::uuid,
      ${p.p_category}::uuid, ${p.p_dependency}::uuid
    )
  `)
  return result.rows as MetricsRow[]
}

type ScopeCall = MetricsFilters

function scopeCalls(actor: Actor, filters: MetricsFilters): ScopeCall[] {
  const scope = getPermissionScope(actor, 'metrics.view')
  if (!scope) return []
  if (scope === 'all') return [filters]
  if (scope === 'team') {
    if (actor.teamIds.length === 0) return []
    return actor.teamIds.map((teamId) => ({ ...filters, teamId }))
  }
  if (scope === 'buildings') {
    return actor.supervisorScopes.flatMap((grant) =>
      grant.buildingIds.length === 0
        ? [{ ...filters, teamId: grant.teamId }]
        : grant.buildingIds.map((buildingId) => ({
            ...filters,
            teamId: grant.teamId,
            buildingId,
          })),
    )
  }
  return []
}

async function scopedRows(
  db: Database,
  actor: Actor,
  filters: MetricsFilters,
  name: string,
): Promise<MetricsRow[]> {
  const calls = scopeCalls(actor, filters)
  const groups = await Promise.all(
    calls.map((call) => callMetrics(db, name, call)),
  )
  return groups.flat()
}

export async function metricsTickets(db: Database, actor: Actor) {
  const result = await db.execute(sql`
    select
      v.id, v.folio, v.status, v.reported_at, v.building_id, v.category_id,
      v.team_id, v.dependency_id, v.requester_id,
      v.total_time, v.net_time, v.active_work_time, v.active_work_time_labor,
      v.active_work_time_extra, v.response_time, v.assignment_time,
      v.validation_time, v.reassigned_supervisor, v.reassigned_technician,
      v.recaptured, v.reopened
    from public.v_ticket_metrics_base v
    where exists (
      select 1 from public.tickets t
      join public.requesters r on r.id = t.requester_id
      where t.id = v.id and ${scopePredicate(actor, 'ticket.view')}
    )
    order by v.reported_at
  `)
  return result.rows
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
  const rows = await scopedRows(db, actor, filters, 'metrics_pauses_by_reason')
  return mergeBy(
    rows,
    (row) => String(row.reason_name),
    ['pauses'],
    ['pause_time', 'pause_time_labor'],
  )
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
  const rows = await scopedRows(db, actor, filters, 'metrics_duplicate_alerts')
  return mergeBy(rows, (row) => String(row.decision), ['candidates', 'tickets'])
}

export async function duplicatesByDimension(
  db: Database,
  actor: Actor,
  filters: MetricsFilters,
) {
  const rows = await scopedRows(
    db,
    actor,
    filters,
    'metrics_duplicates_by_dimension',
  )
  return mergeBy(
    rows,
    (row) => `${String(row.dimension)}:${String(row.dimension_id)}`,
    ['tickets', 'duplicates'],
  ).map((row) => ({
    ...row,
    duplicate_rate:
      number(row.tickets) > 0
        ? number(row.duplicates) / number(row.tickets)
        : 0,
  }))
}

export async function satisfaction(
  db: Database,
  actor: Actor,
  filters: MetricsFilters,
) {
  const rows = await scopedRows(db, actor, filters, 'metrics_satisfaction')
  let ratings = 0
  let total = 0
  for (const row of rows) {
    const count = number(row.ratings)
    ratings += count
    total += number(row.average_score) * count
  }
  return [{ average_score: ratings > 0 ? total / ratings : null, ratings }]
}

export async function sla(db: Database, actor: Actor, filters: MetricsFilters) {
  const rows = await scopedRows(db, actor, filters, 'metrics_sla')
  let withTarget = 0
  let met = 0
  let target = 0
  let resolution = 0
  for (const row of rows) {
    withTarget += number(row.with_target)
    met += number(row.met)
    target += number(row.avg_target_minutes) * number(row.with_target)
    resolution += number(row.avg_resolution_minutes) * number(row.with_target)
  }
  return [
    {
      with_target: withTarget,
      met,
      compliance_rate: withTarget > 0 ? met / withTarget : null,
      avg_target_minutes: withTarget > 0 ? target / withTarget : null,
      avg_resolution_minutes: withTarget > 0 ? resolution / withTarget : null,
    },
  ]
}

export async function slaByPriority(
  db: Database,
  actor: Actor,
  filters: MetricsFilters,
) {
  const rows = await scopedRows(db, actor, filters, 'metrics_sla_by_priority')
  return mergeBy(rows, (row) => String(row.priority_id), [
    'with_target',
    'met',
  ]).map((row) => ({
    ...row,
    compliance_rate:
      number(row.with_target) > 0
        ? number(row.met) / number(row.with_target)
        : null,
  }))
}

export async function byTechnician(
  db: Database,
  actor: Actor,
  filters: MetricsFilters,
) {
  const rows = await scopedRows(db, actor, filters, 'metrics_by_technician')
  return mergeBy(
    rows,
    (row) => String(row.technician_id),
    ['tickets', 'leader_count', 'auxiliary_count', 'assigned_count'],
    [
      'participation_time',
      'participation_time_labor',
      'participation_time_extra',
    ],
  )
}

export async function rejectCancel(
  db: Database,
  actor: Actor,
  filters: MetricsFilters,
) {
  const rows = await scopedRows(
    db,
    actor,
    filters,
    'metrics_reject_cancel_by_reason',
  )
  return mergeBy(
    rows,
    (row) => `${String(row.event_type)}:${String(row.reason_name)}`,
    ['tickets'],
  )
}

export async function routing(
  db: Database,
  actor: Actor,
  filters: MetricsFilters,
) {
  const rows = await scopedRows(db, actor, filters, 'metrics_routing')
  let offers = 0
  let pending = 0
  let taken = 0
  let weighted = 0
  for (const row of rows) {
    offers += number(row.offers)
    pending += number(row.pending_offers)
    taken += number(row.taken)
    weighted += intervalMinutes(row.avg_time_to_take) * number(row.taken)
  }
  return [
    {
      offers,
      pending_offers: pending,
      taken,
      avg_time_to_take: minutesToInterval(taken > 0 ? weighted / taken : 0),
    },
  ]
}
