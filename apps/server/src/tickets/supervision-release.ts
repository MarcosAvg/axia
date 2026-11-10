import { sql } from 'drizzle-orm'

import { routeTicket } from './routing.js'
import type { DbExecutor } from './db.js'

type ReleasedTicket = {
  id: string
  cycle: number
  status: string
  team_id: string
  building_id: string
}

async function hasOpenSupervisor(tx: DbExecutor, ticketId: string) {
  const result = await tx.execute(sql`
    select 1 from public.ticket_assignments
    where ticket_id = ${ticketId} and stage = 'supervisor' and ended_at is null
    limit 1
  `)
  return Boolean(result.rows[0])
}

async function hasOpenOffer(tx: DbExecutor, ticketId: string, cycle: number) {
  const result = await tx.execute(sql`
    select 1 from public.ticket_offers
    where ticket_id = ${ticketId} and cycle = ${cycle} and status = 'offered'
    limit 1
  `)
  return Boolean(result.rows[0])
}

async function releaseTicket(
  tx: DbExecutor,
  userId: string,
  actorId: string,
  ticket: ReleasedTicket,
) {
  // Proceso de mantenimiento: lo dispara la desactivación de una cuenta, no una
  // acción de usuario, así que no hay instante de acción que propagar.
  await tx.execute(sql`
    update public.ticket_assignments set ended_at = now()
    where ticket_id = ${ticket.id}
      and stage = 'supervisor'
      and assignee_user_id = ${userId}
      and ended_at is null
  `)
  await tx.execute(sql`
    update public.ticket_offers set status = 'withdrawn', resolved_at = now()
    where ticket_id = ${ticket.id}
      and supervisor_user_id = ${userId}
      and status = 'offered'
  `)
  if (!['registered', 'with_supervisor'].includes(ticket.status)) return
  if (await hasOpenSupervisor(tx, ticket.id)) return
  if (await hasOpenOffer(tx, ticket.id, ticket.cycle)) return
  await tx.execute(sql`
    update public.tickets set status = 'registered' where id = ${ticket.id}
  `)
  await routeTicket({
    tx,
    ticketId: ticket.id,
    cycle: ticket.cycle,
    teamId: ticket.team_id,
    buildingId: ticket.building_id,
    actorId,
  })
}

/**
 * Libera los tiquets que quedaron a cargo de una cuenta desactivada. Cierra la
 * asignación y las ofertas del usuario; si el trabajo aún no empezó y no queda
 * otro responsable, devuelve el tiquet a ruteo para que no quede sin salida.
 */
export async function releaseSupervision(
  tx: DbExecutor,
  userId: string,
  actorId: string,
) {
  const result = await tx.execute(sql`
    with affected as (
      select ticket_id from public.ticket_assignments
      where stage = 'supervisor'
        and assignee_user_id = ${userId}
        and ended_at is null
      union
      select ticket_id from public.ticket_offers
      where supervisor_user_id = ${userId} and status = 'offered'
    )
    select t.id, t.cycle, t.status, t.team_id, t.building_id
    from public.tickets t
    join affected a on a.ticket_id = t.id
    for update of t
  `)
  for (const row of result.rows as ReleasedTicket[]) {
    await releaseTicket(tx, userId, actorId, row)
  }
}
