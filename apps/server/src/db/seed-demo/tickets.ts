import type { Client } from 'pg'

import {
  resolveTicketIds,
  ticketTimes,
  type ResolvedTicket,
  type TicketTimes,
} from './ticket-data.js'

import type { DemoCatalogs } from './catalogs.js'
import { STAGE, type DemoTicket } from './data.js'
import type { DemoPeople } from './people.js'
import {
  insertDemoOffers,
  insertDemoValidations,
  repairDemoOffers,
} from './flow.js'
import { insertDemoEvidence, type DemoEvidenceStorage } from './evidence.js'

type IdRow = { id: string }

type TicketContext = {
  client: Client
  ticket: DemoTicket
  ids: ResolvedTicket
  people: DemoPeople
  times: TicketTimes
  stage: number
  storage: DemoEvidenceStorage
}

type DemoEvent = {
  type: string
  at: Date
  actorId: string
  technicianId?: string
  payload?: Record<string, unknown>
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
      null,
    ],
  )
}

function buildEvents(context: TicketContext): DemoEvent[] {
  const { people, times, stage, ticket } = context
  const events: DemoEvent[] = [
    { type: 'created', at: times.created, actorId: people.supervisorId },
    { type: 'offered', at: times.created, actorId: people.supervisorId },
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
      payload: {
        technicianId: people.technicians.lead,
        auxiliary: ticket.category === 'Accesos',
      },
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
      payload: {
        workDescription:
          'Trabajo de demostración concluido; se verificó el funcionamiento.',
      },
      at: times.attended,
      actorId: people.technicianUserId,
    })
  }
  if (stage >= 5) {
    events.push({
      type: 'validated',
      at: times.validated,
      actorId: people.supervisorId,
      payload: { partial: true, role: 'requester' },
    })
    events.push({
      type: 'validated',
      at: times.validated,
      actorId: people.supervisorId,
    })
  }
  return events
}

async function insertEvents(context: TicketContext) {
  const { client, ticket, storage, people } = context
  for (const event of buildEvents(context)) {
    if (event.type === 'started' || event.type === 'attended') {
      await insertDemoEvidence(client, storage, {
        ticketId: ticket.id,
        actorId: people.technicianUserId,
        technicianId: people.technicians.lead,
        type: event.type === 'started' ? 'before' : 'after',
        at: event.at,
      })
    }
    await client.query(
      `insert into public.ticket_events (
         ticket_id, cycle, type, actor_id, subject_technician_id, occurred_at, payload
       ) values ($1, 1, $2::public.event_type, $3, $4, $5, $6::jsonb)`,
      [
        ticket.id,
        event.type,
        event.actorId,
        event.technicianId ?? null,
        event.at,
        JSON.stringify(event.payload ?? {}),
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
     ) values ($1, 1, $2, $6::public.participation_type, $3, $4, $5)`,
    [
      ticket.id,
      people.technicians.lead,
      ids.categoryId,
      times.assigned,
      stage >= 5 ? times.validated : null,
      ticket.category === 'Accesos' ? 'auxiliary' : 'leader',
    ],
  )
}

export async function insertDemoTicket(input: {
  client: Client
  ticket: DemoTicket
  catalogs: DemoCatalogs
  people: DemoPeople
  storage: DemoEvidenceStorage
}) {
  const { client, ticket, catalogs, people, storage } = input
  const context: TicketContext = {
    client,
    ticket,
    people,
    storage,
    ids: resolveTicketIds(ticket, catalogs, people),
    times: ticketTimes(ticket),
    stage: STAGE[ticket.status],
  }
  if (!(await insertTicketRow(context))) {
    await repairDemoOffers(client, ticket)
    return false
  }
  await insertDemoOffers(client, ticket.id, {
    ...context.times,
    stage: context.stage,
    supervisorId: people.supervisorId,
  })
  await insertAssignments(context)
  await insertEvents(context)
  await insertParticipant(context)
  if (context.stage >= 5) {
    await insertDemoValidations(
      client,
      ticket.id,
      people.supervisorId,
      context.times.validated,
    )
  }
  return true
}
