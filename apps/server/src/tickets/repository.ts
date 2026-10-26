import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import { filterConditions, type TicketFilters } from './filters.js'
import { iso, optionalIso } from './format.js'
import { AppError } from '../http/errors.js'
import { can, canAct, type TicketAccess } from './access.js'
import { scopePredicate } from './scope.js'

type TicketListItem = {
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
}

export type TicketPage = {
  items: TicketListItem[]
  total: number
  page: number
  pageSize: number
}

export type TimelineItem = {
  id: number
  ticketId: string
  cycle: number
  type: string
  payload: Record<string, unknown>
  occurredAt: string
  recordedAt: string
  actorId: string | null
  actorName: string | null
  subjectUserId: string | null
  subjectUserName: string | null
  subjectTechnicianId: string | null
  subjectTechnicianName: string | null
  reasonId: string | null
  reasonName: string | null
}

type AccessRow = {
  id: string
  team_id: string
  building_id: string
  requester_user_id: string | null
  registered_by: string | null
  is_technician: boolean
  is_participant: boolean
  is_supervisor: boolean
}

type ListRow = {
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
  total: number
}

type TimelineRow = {
  id: string | number
  ticket_id: string
  cycle: number
  type: string
  payload: unknown
  occurred_at: Date | string
  recorded_at: Date | string
  actor_id: string | null
  actor_name: string | null
  subject_user_id: string | null
  subject_user_name: string | null
  subject_technician_id: string | null
  subject_technician_name: string | null
  reason_id: string | null
  reason_name: string | null
}

export async function loadTicketAccess(
  db: Database,
  actor: Actor,
  ticketId: string,
): Promise<TicketAccess | null> {
  const result = await db.execute(sql`
    select
      t.id,
      t.team_id,
      t.building_id,
      t.registered_by,
      r.user_id as requester_user_id,
      exists (
        select 1
        from public.ticket_assignments a
        join public.technicians te on te.id = a.assignee_technician_id
        where a.ticket_id = t.id
          and a.ended_at is null
          and te.user_id = ${actor.id}
      ) as is_technician,
      exists (
        select 1
        from public.ticket_participants p
        join public.technicians te on te.id = p.technician_id
        where p.ticket_id = t.id
          and p.ended_at is null
          and te.user_id = ${actor.id}
      ) as is_participant,
      exists (
        select 1
        from public.ticket_assignments a
        where a.ticket_id = t.id
          and a.ended_at is null
          and a.assignee_user_id = ${actor.id}
      ) as is_supervisor
    from public.tickets t
    join public.requesters r on r.id = t.requester_id
    where t.id = ${ticketId}
    limit 1
  `)
  const row = result.rows[0] as AccessRow | undefined
  if (!row) return null

  return {
    id: row.id,
    teamId: row.team_id,
    buildingId: row.building_id,
    requesterUserId: row.requester_user_id,
    registeredBy: row.registered_by,
    isTechnician: row.is_technician,
    isParticipant: row.is_participant,
    isSupervisor: row.is_supervisor,
  }
}

export async function findVisibleTicket(
  db: Database,
  actor: Actor,
  ticketId: string,
): Promise<TicketAccess | null> {
  const access = await loadTicketAccess(db, actor, ticketId)
  if (!access || !can(actor, 'ticket.view', access)) return null
  return access
}

export function assertTicketAction(
  actor: Actor,
  permission: string,
  access: TicketAccess,
): void {
  if (!can(actor, 'ticket.view', access)) {
    throw new AppError(404, 'not_found', 'Tiquet no encontrado')
  }
  if (!canAct(actor, permission, access)) {
    throw new AppError(
      403,
      'forbidden',
      'No tienes permiso para realizar esta acción',
    )
  }
}

export type ListTicketsOptions = {
  filters: TicketFilters
  page: number
  pageSize: number
}

function toListItem(row: ListRow): TicketListItem {
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
  }
}

export async function listTickets(
  db: Database,
  actor: Actor,
  { filters, page, pageSize }: ListTicketsOptions,
): Promise<TicketPage> {
  const conditions = [
    scopePredicate(actor, 'ticket.view'),
    ...filterConditions(filters),
  ]
  const where = sql.join(conditions, sql` and `)
  const offset = (page - 1) * pageSize
  const result = await db.execute(sql`
    select
      t.id, t.folio, t.status, t.reported_at, t.closed_at, t.description,
      t.requester_name, t.possible_duplicate,
      b.name as building_name,
      c.name as category_name,
      p.name as priority_name,
      p.position as priority_position,
      tm.name as team_name,
      count(*) over()::int as total
    from public.tickets t
    join public.requesters r on r.id = t.requester_id
    left join public.buildings b on b.id = t.building_id
    left join public.categories c on c.id = t.category_id
    left join public.priorities p on p.id = t.priority_id
    left join public.teams tm on tm.id = t.team_id
    where ${where}
    order by t.reported_at desc, t.id
    limit ${pageSize} offset ${offset}
  `)

  const rows = result.rows as ListRow[]
  let total = rows[0]?.total ?? 0
  if (rows.length === 0 && page > 1) {
    const count = await db.execute(sql`
      select count(*)::int as total
      from public.tickets t
      join public.requesters r on r.id = t.requester_id
      where ${where}
    `)
    total = (count.rows[0] as { total: number } | undefined)?.total ?? 0
  }

  return {
    items: rows.map(toListItem),
    total,
    page,
    pageSize,
  }
}

export async function getTimeline(
  db: Database,
  actor: Actor,
  ticketId: string,
): Promise<TimelineItem[] | null> {
  const access = await findVisibleTicket(db, actor, ticketId)
  if (!access) return null

  const requesterView =
    actor.requesterUserId !== null &&
    access.requesterUserId !== null &&
    actor.requesterUserId === access.requesterUserId

  const visibility = requesterView
    ? sql`and e.type in (
        select unnest(requester_visible_event_types)
        from public.instance_settings
      )`
    : sql``

  const result = await db.execute(sql`
    select
      e.id, e.ticket_id, e.cycle, e.type, e.payload,
      e.occurred_at, e.recorded_at,
      e.actor_id, e.actor_name,
      e.subject_user_id, e.subject_user_name,
      e.subject_technician_id, e.subject_technician_name,
      e.reason_id, e.reason_name
    from public.v_ticket_timeline e
    where e.ticket_id = ${ticketId}
    ${visibility}
    order by e.occurred_at, e.id
  `)

  return (result.rows as TimelineRow[]).map((row) => ({
    id: Number(row.id),
    ticketId: row.ticket_id,
    cycle: row.cycle,
    type: row.type,
    payload: (row.payload as Record<string, unknown> | null | undefined) ?? {},
    occurredAt: iso(row.occurred_at),
    recordedAt: iso(row.recorded_at),
    actorId: row.actor_id,
    actorName: row.actor_name,
    subjectUserId: row.subject_user_id,
    subjectUserName: row.subject_user_name,
    subjectTechnicianId: row.subject_technician_id,
    subjectTechnicianName: row.subject_technician_name,
    reasonId: row.reason_id,
    reasonName: row.reason_name,
  }))
}
