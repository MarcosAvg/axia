import type { Client } from 'pg'

import type { DemoCatalogs } from './catalogs.js'
import { STAGE, type DemoTicket } from './data.js'
import type { DemoPeople } from './people.js'

type IdRow = { id: string }

type ResolvedTicket = {
  categoryId: string
  subcategoryId: string
  problemId: string
  buildingId: string
  locationId: string
  dependencyId: string
  teamId: string
  requesterId: string
  requesterName: string
  requesterContact: string
}

type TicketTimes = {
  reportedAt: Date
  created: Date
  taken: Date
  assigned: Date
  started: Date
  attended: Date
  validated: Date
}

type TicketContext = {
  client: Client
  ticket: DemoTicket
  ids: ResolvedTicket
  people: DemoPeople
  times: TicketTimes
  stage: number
}

type DemoEvent = {
  type: string
  at: Date
  actorId: string
  technicianId?: string
}

function pick(
  values: Record<string, string>,
  key: string,
  label: string,
): string {
  const value = values[key]
  if (!value) throw new Error(`Demo catalog not found: ${label} ${key}`)
  return value
}

function resolveTicketIds(
  ticket: DemoTicket,
  catalogs: DemoCatalogs,
  people: DemoPeople,
): ResolvedTicket {
  const categories: Record<string, string> = {
    Eléctrico: catalogs.electrical,
    Plomería: catalogs.plumbing,
    Clima: catalogs.climate,
    Accesos: catalogs.access,
  }
  const subcategories: Record<string, string> = {
    Contacto: catalogs.contact,
    Iluminación: catalogs.lighting,
    Fuga: catalogs.leak,
    Drenaje: catalogs.drainage,
    'Aire acondicionado': catalogs.air,
    Puertas: catalogs.doors,
  }
  const problems: Record<string, string> = {
    'Chispa o corto': catalogs.spark,
    'Lámpara fundida': catalogs.lamp,
    Goteo: catalogs.drip,
    Taponamiento: catalogs.clog,
    'No enfría': catalogs.noCooling,
    'No cierra': catalogs.noClose,
  }
  const buildings: Record<string, string> = {
    'Edificio Central': catalogs.central,
    'Edificio Norte': catalogs.north,
  }
  const locations: Record<string, string> = {
    'Edificio Central|Planta baja': catalogs.locations.centralGround,
    'Edificio Central|Piso 1': catalogs.locations.centralFirst,
    'Edificio Norte|Planta baja': catalogs.locations.northGround,
    'Edificio Norte|Piso 1': catalogs.locations.northFirst,
  }
  const dependencies: Record<string, string> = {
    Sistemas: catalogs.systems,
    'Recursos Humanos': catalogs.hr,
  }
  const isAccess = ticket.category === 'Accesos'
  const isAna = ticket.requester === 'ana'
  return {
    categoryId: pick(categories, ticket.category, 'categoría'),
    subcategoryId: pick(subcategories, ticket.subcategory, 'subcategoría'),
    problemId: pick(problems, ticket.problem, 'problema'),
    buildingId: pick(buildings, ticket.building, 'edificio'),
    locationId: pick(
      locations,
      `${ticket.building}|${ticket.location}`,
      'ubicación',
    ),
    dependencyId: pick(dependencies, ticket.dependency, 'dependencia'),
    teamId: isAccess ? catalogs.security : catalogs.maintenance,
    requesterId: isAna ? people.requesters.ana : people.requesters.beto,
    requesterName: isAna ? 'Ana Pérez' : 'Beto Lima',
    requesterContact: isAna ? 'ana@example.test' : 'beto@example.test',
  }
}

function ticketTimes(ticket: DemoTicket): TicketTimes {
  const reportedAt = new Date(
    Date.now() - ticket.reportedHoursAgo * 60 * 60 * 1000,
  )
  const at = (hours: number) =>
    new Date(reportedAt.getTime() + hours * 60 * 60 * 1000)
  return {
    reportedAt,
    created: reportedAt,
    taken: at(0.5),
    assigned: at(1),
    started: at(2),
    attended: at(24),
    validated: at(48),
  }
}

async function insertTicketRow(context: TicketContext) {
  const { client, ticket, ids, people, times } = context
  const result = await client.query<IdRow>(
    `insert into public.tickets (
       id, status, cycle, team_id, building_id, location_id, dependency_id,
       category_id, subcategory_id, problem_id, service_type_id, priority_id,
       channel_id, description, requester_id, requester_name,
       requester_contact, registered_by, reported_at, closed_at
     ) values (
       $1, $2::public.ticket_status, 1, $3, $4, $5, $6, $7, $8, $9,
       (select id from public.service_types where name = $10),
       (select id from public.priorities where name = $11),
       (select id from public.channels where name = $12),
       $13, $14, $15, $16, $17, $18, $19
     )
     on conflict (id) do nothing
     returning id`,
    [
      ticket.id,
      ticket.status,
      ids.teamId,
      ids.buildingId,
      ids.locationId,
      ids.dependencyId,
      ids.categoryId,
      ids.subcategoryId,
      ids.problemId,
      ticket.serviceType,
      ticket.priority,
      ticket.channel,
      ticket.description,
      ids.requesterId,
      ids.requesterName,
      ids.requesterContact,
      people.supervisorId,
      times.reportedAt,
      ticket.status === 'closed' ? times.validated : null,
    ],
  )
  return result.rowCount === 1
}

async function insertAssignments(context: TicketContext) {
  const { client, ticket, people, times, stage } = context
  if (stage < 1) return
  await client.query(
    `insert into public.ticket_assignments (
       ticket_id, cycle, stage, assignee_user_id, assigned_by, assigned_at
     ) values ($1, 1, 'supervisor', $2, $2, $3)`,
    [ticket.id, people.supervisorId, times.taken],
  )
  if (stage < 2) return
  await client.query(
    `insert into public.ticket_assignments (
       ticket_id, cycle, stage, assignee_technician_id, assigned_by,
       assigned_at, ended_at
     ) values ($1, 1, 'technician', $2, $3, $4, $5)`,
    [
      ticket.id,
      people.technicians.lead,
      people.supervisorId,
      times.assigned,
      stage >= 4 ? times.attended : null,
    ],
  )
}

function buildEvents(context: TicketContext): DemoEvent[] {
  const { people, times, stage } = context
  const events: DemoEvent[] = [
    { type: 'created', at: times.created, actorId: people.supervisorId },
  ]
  if (stage >= 1) {
    events.push({
      type: 'taken',
      at: times.taken,
      actorId: people.supervisorId,
    })
  }
  if (stage >= 2) {
    events.push({
      type: 'assigned_technician',
      at: times.assigned,
      actorId: people.supervisorId,
      technicianId: people.technicians.lead,
    })
  }
  if (stage >= 3) {
    events.push({
      type: 'started',
      at: times.started,
      actorId: people.technicianUserId,
    })
  }
  if (stage >= 4) {
    events.push({
      type: 'attended',
      at: times.attended,
      actorId: people.technicianUserId,
    })
  }
  if (stage >= 5) {
    events.push({
      type: 'validated',
      at: times.validated,
      actorId: people.supervisorId,
    })
  }
  return events
}

async function insertEvents(context: TicketContext) {
  const { client, ticket } = context
  for (const event of buildEvents(context)) {
    await client.query(
      `insert into public.ticket_events (
         ticket_id, cycle, type, actor_id, subject_technician_id, occurred_at
       ) values ($1, 1, $2::public.event_type, $3, $4, $5)`,
      [
        ticket.id,
        event.type,
        event.actorId,
        event.technicianId ?? null,
        event.at,
      ],
    )
  }
}

async function insertParticipant(context: TicketContext) {
  const { client, ticket, ids, people, times, stage } = context
  if (stage < 2) return
  await client.query(
    `insert into public.ticket_participants (
       ticket_id, cycle, technician_id, participation_type, category_id,
       started_at, ended_at
     ) values ($1, 1, $2, 'leader', $3, $4, $5)`,
    [
      ticket.id,
      people.technicians.lead,
      ids.categoryId,
      times.assigned,
      stage >= 4 ? times.attended : null,
    ],
  )
}

export async function insertDemoTicket(
  client: Client,
  ticket: DemoTicket,
  catalogs: DemoCatalogs,
  people: DemoPeople,
) {
  const context: TicketContext = {
    client,
    ticket,
    ids: resolveTicketIds(ticket, catalogs, people),
    people,
    times: ticketTimes(ticket),
    stage: STAGE[ticket.status],
  }
  if (!(await insertTicketRow(context))) return false
  await insertAssignments(context)
  await insertEvents(context)
  await insertParticipant(context)
  return true
}
