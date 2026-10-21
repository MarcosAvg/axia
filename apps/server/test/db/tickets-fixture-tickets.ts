import { sql, type SQL } from 'drizzle-orm'

import type { Database } from '../../src/db/client.js'
import { insertOne, type Catalog } from './tickets-fixture-catalog.js'
import type { People } from './tickets-fixture-people.js'

export type TicketFixtureIds = {
  ticketA1: string
  ticketA2: string
  ticketAux: string
  ticketB1: string
}

type TicketInput = {
  teamId: string
  buildingId: string
  locationId: string
  categoryId: string
  requesterId: string
  description: string
}

function baseTicket(catalog: Catalog, input: TicketInput): SQL {
  return sql`insert into public.tickets (
    team_id, building_id, location_id, dependency_id, category_id,
    service_type_id, priority_id, channel_id, description,
    requester_id, requester_name
  ) values (
    ${input.teamId}, ${input.buildingId}, ${input.locationId}, ${catalog.dependency.id}, ${input.categoryId},
    ${catalog.serviceType.id}, ${catalog.priority.id}, ${catalog.channel.id}, ${input.description},
    ${input.requesterId}, 'Solicitante'
  ) returning id`
}

export async function createTickets(
  db: Database,
  catalog: Catalog,
  people: People,
): Promise<TicketFixtureIds> {
  const ticketA1 = await insertOne(
    db,
    baseTicket(catalog, {
      teamId: catalog.teamA.id,
      buildingId: catalog.buildingA1.id,
      locationId: catalog.locationA1.id,
      categoryId: catalog.categoryA.id,
      requesterId: people.requesterRow.id,
      description: 'Fuga en el baño',
    }),
  )
  const ticketA2 = await insertOne(
    db,
    baseTicket(catalog, {
      teamId: catalog.teamA.id,
      buildingId: catalog.buildingA2.id,
      locationId: catalog.locationA2.id,
      categoryId: catalog.categoryA.id,
      requesterId: people.requesterRow.id,
      description: 'Luz fundida',
    }),
  )
  const ticketAux = await insertOne(
    db,
    baseTicket(catalog, {
      teamId: catalog.teamA.id,
      buildingId: catalog.buildingA1.id,
      locationId: catalog.locationA1.id,
      categoryId: catalog.categoryA.id,
      requesterId: people.otherRequester.id,
      description: 'Puerta trabada',
    }),
  )
  const ticketB1 = await insertOne(
    db,
    baseTicket(catalog, {
      teamId: catalog.teamB.id,
      buildingId: catalog.buildingB1.id,
      locationId: catalog.locationB1.id,
      categoryId: catalog.categoryB.id,
      requesterId: people.otherRequester.id,
      description: 'Aire acondicionado',
    }),
  )

  return {
    ticketA1: ticketA1.id,
    ticketA2: ticketA2.id,
    ticketAux: ticketAux.id,
    ticketB1: ticketB1.id,
  }
}

export async function createTicketActivity(
  db: Database,
  catalog: Catalog,
  people: People,
  ids: TicketFixtureIds,
) {
  await db.execute(sql`
    insert into public.ticket_assignments (
      ticket_id, cycle, stage, assignee_technician_id
    ) values (${ids.ticketA1}, 1, 'technician', ${people.technicianRow.id})
  `)
  await db.execute(sql`
    insert into public.ticket_assignments (
      ticket_id, cycle, stage, assignee_user_id
    ) values (${ids.ticketA1}, 1, 'supervisor', ${people.supervisorUserId})
  `)
  await db.execute(sql`
    insert into public.ticket_participants (
      ticket_id, cycle, technician_id, participation_type, category_id
    ) values (${ids.ticketAux}, 1, ${people.technicianRow.id}, 'leader', ${catalog.categoryA.id})
  `)
  await db.execute(sql`
    insert into public.ticket_offers (ticket_id, cycle, supervisor_user_id)
    values (${ids.ticketAux}, 1, ${people.supervisorUserId})
  `)
  await db.execute(sql`
    insert into public.ticket_events (ticket_id, cycle, type, actor_id, payload)
    values (${ids.ticketA1}, 1, 'created', ${people.adminId}, '{}'::jsonb)
  `)
  await db.execute(sql`
    insert into public.ticket_events (ticket_id, cycle, type, actor_id, payload)
    values (${ids.ticketA1}, 1, 'comment', ${people.adminId}, '{"text":"nota interna"}'::jsonb)
  `)
}
