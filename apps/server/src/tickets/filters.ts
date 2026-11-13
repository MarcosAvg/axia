import { sql, type SQL } from 'drizzle-orm'

import { drillDownConditions } from './drill-down-filters.js'
import { isUnroutedSql } from './routing-sql.js'

export type TicketFilters = {
  status?: string
  statuses?: string[]
  buildingId?: string
  dependencyId?: string
  teamId?: string
  categoryId?: string
  subcategoryId?: string
  problemId?: string
  locationId?: string
  channelId?: string
  priorityId?: string
  requesterId?: string
  technicianId?: string
  serviceTypeId?: string
  from?: string
  to?: string
  unrouted?: boolean
  possibleDuplicate?: boolean
  search?: string
  outcome?: string
  sla?: 'met' | 'missed' | 'with_target'
  slaClock?: 'calendar' | 'laboral'
  rating?: number
  reassigned?: boolean
  recaptured?: boolean
  reopened?: boolean
  firstFix?: boolean
  unverifiedTime?: boolean
  pauseReasonId?: string
  pauseSubstateId?: string
  terminalReasonId?: string
  pendingOffer?: boolean
  participantTechnicianId?: string
  phase?: string
  timeMode?: 'calendar' | 'laboral'
  assigneeTechnicianId?: string
  offerSupervisorUserId?: string
  excludeFinal?: boolean
}

function statusConditions(filters: TicketFilters): SQL[] {
  const conditions: SQL[] = []
  if (filters.status) conditions.push(sql`t.status = ${filters.status}`)
  if (filters.statuses?.length) {
    const statuses = filters.statuses.map((status) => sql`${status}`)
    conditions.push(sql`t.status in (${sql.join(statuses, sql`, `)})`)
  }
  return conditions
}

function placeConditions(filters: TicketFilters): SQL[] {
  const conditions: SQL[] = []
  if (filters.buildingId) {
    conditions.push(sql`t.building_id = ${filters.buildingId}`)
  }
  if (filters.dependencyId) {
    conditions.push(sql`t.dependency_id = ${filters.dependencyId}`)
  }
  return conditions
}

function classificationConditions(filters: TicketFilters): SQL[] {
  const conditions: SQL[] = []
  if (filters.teamId) conditions.push(sql`t.team_id = ${filters.teamId}`)
  if (filters.categoryId) {
    conditions.push(sql`t.category_id = ${filters.categoryId}`)
  }
  if (filters.subcategoryId) {
    conditions.push(sql`t.subcategory_id = ${filters.subcategoryId}`)
  }
  if (filters.problemId) {
    conditions.push(sql`t.problem_id = ${filters.problemId}`)
  }
  if (filters.locationId) {
    conditions.push(sql`t.location_id = ${filters.locationId}`)
  }
  if (filters.channelId) {
    conditions.push(sql`t.channel_id = ${filters.channelId}`)
  }
  if (filters.priorityId) {
    conditions.push(sql`t.priority_id = ${filters.priorityId}`)
  }
  if (filters.requesterId) {
    conditions.push(sql`t.requester_id = ${filters.requesterId}`)
  }
  if (filters.serviceTypeId) {
    conditions.push(sql`t.service_type_id = ${filters.serviceTypeId}`)
  }
  return conditions
}

function technicianCondition(filters: TicketFilters): SQL[] {
  if (!filters.technicianId) return []
  return [
    sql`(
      select a.assignee_technician_id
      from public.ticket_assignments a
      where a.ticket_id = t.id
        and a.cycle = t.cycle
        and a.stage = 'technician'
      order by a.assigned_at desc
      limit 1
    ) = ${filters.technicianId}`,
  ]
}

function rangeAndFlagConditions(
  filters: TicketFilters,
  timezone: string,
): SQL[] {
  const conditions: SQL[] = []
  if (filters.from || filters.to) {
    conditions.push(
      sql`public.metrics_date_in(
        t.reported_at, ${filters.from ?? null}::date,
        ${filters.to ?? null}::date, ${timezone}
      )`,
    )
  }
  if (filters.unrouted) conditions.push(isUnroutedSql())
  if (filters.possibleDuplicate) {
    conditions.push(sql`t.possible_duplicate`)
  }
  return conditions
}

function searchConditions(filters: TicketFilters): SQL[] {
  const search = filters.search?.replace(/[\\%_(),]/g, '').trim()
  if (!search) return []
  const term = `%${search}%`
  return [sql`(t.folio ilike ${term} or t.description ilike ${term})`]
}

function baseConditions(filters: TicketFilters, timezone: string): SQL[] {
  return [
    ...statusConditions(filters),
    ...placeConditions(filters),
    ...classificationConditions(filters),
    ...technicianCondition(filters),
    ...rangeAndFlagConditions(filters, timezone),
    ...searchConditions(filters),
    ...drillDownConditions(filters),
  ]
}

function assignmentConditions(filters: TicketFilters): SQL[] {
  const conditions: SQL[] = []
  if (filters.assigneeTechnicianId) {
    conditions.push(sql`exists (
      select 1
      from public.ticket_assignments a
      where a.ticket_id = t.id
        and a.ended_at is null
        and a.assignee_technician_id = ${filters.assigneeTechnicianId}
    )`)
  }
  if (filters.offerSupervisorUserId) {
    conditions.push(sql`exists (
      select 1
      from public.ticket_offers o
      where o.ticket_id = t.id
        and o.cycle = t.cycle
        and o.supervisor_user_id = ${filters.offerSupervisorUserId}
        and o.status = 'offered'
    )`)
  }
  if (filters.excludeFinal) {
    conditions.push(
      sql`t.status not in ('closed', 'rejected', 'cancelled', 'duplicate')`,
    )
  }
  return conditions
}

export function filterConditions(
  filters: TicketFilters,
  timezone: string,
): SQL[] {
  return [
    ...baseConditions(filters, timezone),
    ...assignmentConditions(filters),
  ]
}
