import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import { iso, optionalIso } from './format.js'
import { findVisibleTicket } from './repository.js'

type TicketCycleTimes = {
  total: number
  response: number
  assignment: number
  reassignment: number
  wait: number
  active: number
  pause: number
  validation: number
  claim: number
}

export type TicketDetail = {
  id: string
  folio: string
  status: string
  reportedAt: string
  closedAt: string | null
  description: string
  requesterName: string
  possibleDuplicate: boolean
  buildingName: string | null
  categoryName: string | null
  priorityName: string | null
  priorityPosition: number | null
  teamName: string | null
  cycle: number
  cycleTimes: TicketCycleTimes
  buildingId: string
  locationId: string
  dependencyId: string
  categoryId: string
  subcategoryId: string | null
  problemId: string | null
  serviceTypeId: string | null
  priorityId: string
  locationName: string | null
  dependencyName: string | null
  subcategoryName: string | null
  problemName: string | null
  serviceTypeName: string | null
  channelName: string | null
  requesterContact: string | null
  duplicateOfId: string | null
}

type DetailRow = {
  id: string
  folio: string
  status: string
  reported_at: Date | string
  closed_at: Date | string | null
  description: string
  requester_name: string
  possible_duplicate: boolean
  building_name: string | null
  category_name: string | null
  priority_name: string | null
  priority_position: number | null
  team_name: string | null
  cycle: number
  total_minutes: number | string
  response_minutes: number | string
  assignment_minutes: number | string
  reassignment_minutes: number | string
  wait_minutes: number | string
  active_minutes: number | string
  pause_minutes: number | string
  validation_minutes: number | string
  claim_minutes: number | string
  building_id: string
  location_id: string
  dependency_id: string
  category_id: string
  subcategory_id: string | null
  problem_id: string | null
  service_type_id: string | null
  priority_id: string
  location_name: string | null
  dependency_name: string | null
  subcategory_name: string | null
  problem_name: string | null
  service_type_name: string | null
  channel_name: string | null
  requester_contact: string | null
  duplicate_of_id: string | null
}

function toDetail(row: DetailRow): TicketDetail {
  return {
    id: row.id,
    folio: row.folio,
    status: row.status,
    reportedAt: iso(row.reported_at),
    closedAt: optionalIso(row.closed_at),
    description: row.description,
    requesterName: row.requester_name,
    possibleDuplicate: row.possible_duplicate,
    buildingName: row.building_name,
    categoryName: row.category_name,
    priorityName: row.priority_name,
    priorityPosition: row.priority_position,
    teamName: row.team_name,
    cycle: row.cycle,
    cycleTimes: {
      total: Number(row.total_minutes),
      response: Number(row.response_minutes),
      assignment: Number(row.assignment_minutes),
      reassignment: Number(row.reassignment_minutes),
      wait: Number(row.wait_minutes),
      active: Number(row.active_minutes),
      pause: Number(row.pause_minutes),
      validation: Number(row.validation_minutes),
      claim: Number(row.claim_minutes),
    },
    buildingId: row.building_id,
    locationId: row.location_id,
    dependencyId: row.dependency_id,
    categoryId: row.category_id,
    subcategoryId: row.subcategory_id,
    problemId: row.problem_id,
    serviceTypeId: row.service_type_id,
    priorityId: row.priority_id,
    locationName: row.location_name,
    dependencyName: row.dependency_name,
    subcategoryName: row.subcategory_name,
    problemName: row.problem_name,
    serviceTypeName: row.service_type_name,
    channelName: row.channel_name,
    requesterContact: row.requester_contact,
    duplicateOfId: row.duplicate_of_id,
  }
}

function detailQuery(ticketId: string) {
  return sql`
    select
      t.id, t.folio, t.status, t.reported_at, t.closed_at, t.description,
      t.requester_name, t.possible_duplicate,
      t.cycle, t.building_id, t.location_id, t.dependency_id, t.category_id,
      t.subcategory_id, t.problem_id, t.service_type_id, t.priority_id,
      t.requester_contact, t.duplicate_of_id,
      b.name as building_name,
      l.name as location_name,
      d.name as dependency_name,
      c.name as category_name,
      sc.name as subcategory_name,
      pr.name as problem_name,
      st.name as service_type_name,
      ch.name as channel_name,
      p.name as priority_name,
      p.position as priority_position,
      tm.name as team_name,
      extract(epoch from (coalesce(t.closed_at, now()) - t.reported_at)) / 60 as total_minutes,
      extract(epoch from public.ticket_time_by_kind(t.id, 'supervisor_response'::public.time_span_kind)) / 60 as response_minutes,
      extract(epoch from public.ticket_time_by_kind(t.id, 'technician_assignment'::public.time_span_kind)) / 60 as assignment_minutes,
      extract(epoch from public.ticket_time_by_kind(t.id, 'reassignment'::public.time_span_kind)) / 60 as reassignment_minutes,
      extract(epoch from public.ticket_time_by_kind(t.id, 'wait_start'::public.time_span_kind)) / 60 as wait_minutes,
      extract(epoch from public.ticket_time_by_kind(t.id, 'active_work'::public.time_span_kind)) / 60 as active_minutes,
      extract(epoch from public.ticket_time_by_kind(t.id, 'pause'::public.time_span_kind)) / 60 as pause_minutes,
      extract(epoch from public.ticket_time_by_kind(t.id, 'validation'::public.time_span_kind)) / 60 as validation_minutes,
      extract(epoch from public.ticket_time_by_kind(t.id, 'claim'::public.time_span_kind)) / 60 as claim_minutes
    from public.tickets t
    left join public.buildings b on b.id = t.building_id
    left join public.locations l on l.id = t.location_id
    left join public.dependencies d on d.id = t.dependency_id
    left join public.categories c on c.id = t.category_id
    left join public.subcategories sc on sc.id = t.subcategory_id
    left join public.problems pr on pr.id = t.problem_id
    left join public.service_types st on st.id = t.service_type_id
    left join public.channels ch on ch.id = t.channel_id
    left join public.priorities p on p.id = t.priority_id
    left join public.teams tm on tm.id = t.team_id
    where t.id = ${ticketId}
    limit 1
  `
}

export async function getTicketDetail(
  db: Database,
  actor: Actor,
  ticketId: string,
): Promise<TicketDetail | null> {
  const access = await findVisibleTicket(db, actor, ticketId)
  if (!access) return null

  const result = await db.execute(detailQuery(ticketId))
  const row = result.rows[0] as DetailRow | undefined
  return row ? toDetail(row) : null
}
