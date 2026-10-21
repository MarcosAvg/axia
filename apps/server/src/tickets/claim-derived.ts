import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import type { DbExecutor } from './db.js'
import { routeTicket } from './create.js'
import { writeEvent } from './events.js'
import type { TicketForClaim } from './claims.js'

export async function copyDerivedTicket(
  tx: DbExecutor,
  actor: Actor,
  ticket: TicketForClaim,
): Promise<string> {
  const result = await tx.execute(sql`
    insert into public.tickets (
      building_id, location_id, dependency_id, category_id, subcategory_id,
      problem_id, service_type_id, priority_id, channel_id, description,
      requester_id, requester_name, requester_contact, registered_by, team_id
    ) values (
      ${ticket.building_id}, ${ticket.location_id}, ${ticket.dependency_id},
      ${ticket.category_id}, ${ticket.subcategory_id}, ${ticket.problem_id},
      ${ticket.service_type_id}, ${ticket.priority_id}, ${ticket.channel_id},
      ${ticket.description}, ${ticket.requester_id}, ${ticket.requester_name},
      ${ticket.requester_contact}, ${actor.id}, ${ticket.team_id}
    )
    returning id, cycle
  `)
  const created = result.rows[0] as { id: string; cycle: number }
  await tx.execute(sql`
    insert into public.ticket_links (
      ticket_id, linked_ticket_id, link_type, created_by
    ) values (${created.id}, ${ticket.id}, 'derived_from', ${actor.id})
  `)
  await writeEvent(tx, {
    ticketId: created.id,
    type: 'created',
    actorId: actor.id,
    payload: { derivedFrom: ticket.id },
  })
  await routeTicket({
    tx,
    ticketId: created.id,
    cycle: created.cycle,
    teamId: ticket.team_id,
    buildingId: ticket.building_id,
    actorId: actor.id,
  })
  return created.id
}
