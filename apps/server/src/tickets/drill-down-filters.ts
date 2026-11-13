import { sql, type SQL } from 'drizzle-orm'

import type { TicketFilters } from './filters.js'

const PHASE_COLUMNS: Record<string, string | null> = {
  total: 'total_time',
  response: 'response_time',
  assignment: 'assignment_time',
  pending_take: 'pending_take_time',
  reassignment: 'reassignment_time',
  wait: 'wait_start_time',
  active: 'active_work_time',
  pause: 'pause_time',
  validation: 'validation_time',
  claim: 'claim_time',
  resolution: 'total_time',
  dormant: null,
}

function outcomeAndRating(filters: TicketFilters): SQL[] {
  const conditions: SQL[] = []
  if (filters.outcome) {
    conditions.push(
      filters.outcome === 'open'
        ? sql`t.status not in ('closed', 'rejected', 'cancelled', 'duplicate')`
        : sql`t.status = ${filters.outcome}::public.ticket_status`,
    )
  }
  if (filters.rating !== undefined) {
    conditions.push(sql`exists (
      select 1 from public.ticket_ratings r
      where r.ticket_id = t.id and r.score = ${filters.rating}
    )`)
  }
  return conditions
}

function pauseAndTerminal(filters: TicketFilters): SQL[] {
  const conditions: SQL[] = []
  if (filters.pauseReasonId) {
    conditions.push(sql`exists (
      select 1 from public.ticket_pauses p
      where p.ticket_id = t.id and p.reason_id = ${filters.pauseReasonId}
    )`)
  }
  if (filters.pauseSubstateId) {
    conditions.push(sql`exists (
      select 1
      from public.ticket_pauses p
      join public.ticket_pause_steps s on s.pause_id = p.id
      where p.ticket_id = t.id and s.reason_id = ${filters.pauseSubstateId}
    )`)
  }
  if (filters.terminalReasonId) {
    conditions.push(sql`t.status in ('rejected', 'cancelled') and exists (
      select 1 from public.ticket_events e
      where e.ticket_id = t.id
        and e.cycle = t.cycle
        and e.type in ('rejected', 'cancelled')
        and e.reason_id = ${filters.terminalReasonId}
    )`)
  }
  return conditions
}

function qualityFlags(filters: TicketFilters): SQL[] {
  const conditions: SQL[] = []
  if (filters.reassigned) {
    conditions.push(sql`exists (
      select 1 from public.ticket_events e
      where e.ticket_id = t.id and e.type = 'reassigned_supervisor'
    )`)
  }
  if (filters.recaptured) {
    conditions.push(sql`exists (
      select 1 from public.ticket_captures c where c.ticket_id = t.id
    )`)
  }
  if (filters.reopened) {
    conditions.push(sql`exists (
      select 1 from public.ticket_events e
      where e.ticket_id = t.id and e.type = 'reopened'
    )`)
  }
  if (filters.firstFix) {
    conditions.push(sql`t.status = 'closed' and not exists (
      select 1 from public.ticket_events e
      where e.ticket_id = t.id and e.type = 'reopened'
    ) and not exists (
      select 1 from public.ticket_events e
      where e.ticket_id = t.id and e.time_confidence = 'unverified'
    )`)
  }
  if (filters.unverifiedTime) {
    conditions.push(sql`exists (
      select 1 from public.ticket_events e
      where e.ticket_id = t.id and e.time_confidence = 'unverified'
    )`)
  }
  return conditions
}

function routingAndPeople(filters: TicketFilters): SQL[] {
  const conditions: SQL[] = []
  if (filters.pendingOffer) {
    conditions.push(sql`exists (
      select 1 from public.ticket_offers o
      where o.ticket_id = t.id and o.cycle = t.cycle and o.status = 'offered'
    )`)
  }
  if (filters.participantTechnicianId) {
    conditions.push(sql`exists (
      select 1 from public.ticket_participants p
      where p.ticket_id = t.id
        and p.technician_id = ${filters.participantTechnicianId}
    )`)
  }
  return conditions
}

function slaCondition(filters: TicketFilters): SQL[] {
  if (!filters.sla) return []
  if (filters.sla === 'with_target') {
    return [
      sql`exists (
        select 1 from public.v_ticket_sla s
        where s.id = t.id and s.target_minutes is not null and s.closed_at is not null
      )`,
    ]
  }
  if (!filters.slaClock) {
    return [
      sql`exists (
        select 1 from public.v_ticket_sla s
        where s.id = t.id
          and s.target_minutes is not null
          and s.closed_at is not null
          and s.meets is ${filters.sla === 'met' ? sql`true` : sql`false`}
      )`,
    ]
  }
  const resolution =
    filters.slaClock === 'laboral'
      ? sql`extract(epoch from public.ticket_time_total_laboral(s.id)) / 60`
      : sql`extract(epoch from (s.closed_at - t.reported_at)) / 60`
  const comparison = filters.sla === 'met' ? sql`<=` : sql`>`
  return [
    sql`exists (
      select 1 from public.v_ticket_sla s
      where s.id = t.id
        and s.target_minutes is not null
        and s.closed_at is not null
        and ${resolution} ${comparison} s.target_minutes
    )`,
  ]
}

function phaseCondition(filters: TicketFilters): SQL[] {
  if (!filters.phase) return []
  const column = PHASE_COLUMNS[filters.phase]
  if (column === undefined) return []
  if (column === null && filters.timeMode === 'laboral') return [sql`false`]
  const minutes =
    column === null
      ? sql`extract(epoch from public.ticket_time_by_kind(t.id, 'dormant')) / 60`
      : sql`extract(epoch from v.${sql.identifier(
          `${column}${filters.timeMode === 'laboral' ? '_labor' : ''}`,
        )}) / 60`
  return [
    sql`exists (
      select 1
      from public.v_ticket_metrics_base v
      where v.id = t.id
        and v.outcome <> 'duplicate'
        and not exists (
          select 1 from public.ticket_events e
          where e.ticket_id = t.id and e.time_confidence = 'unverified'
        )
        ${filters.phase === 'resolution' ? sql`and v.status = 'closed'` : sql``}
        and ${minutes} > 0
    )`,
  ]
}

/** Filtros que conectan las métricas con la lista de tiquets. */
export function drillDownConditions(filters: TicketFilters): SQL[] {
  return [
    ...outcomeAndRating(filters),
    ...pauseAndTerminal(filters),
    ...qualityFlags(filters),
    ...routingAndPeople(filters),
    ...slaCondition(filters),
    ...phaseCondition(filters),
  ]
}
