import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import { can as hasPermission } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import {
  conflict,
  forbidden,
  lockTicket,
  notFound,
  validateHandled,
  type ActionResult,
} from './action-shared.js'
import type { DbExecutor } from './db.js'
import { findHandledEvent, writeEvent } from './events.js'
import { findVisibleTicket } from './repository.js'

async function assertOffer(tx: DbExecutor, ticketId: string, actorId: string) {
  const result = await tx.execute(sql`
    select 1
    from public.ticket_offers
    where ticket_id = ${ticketId}
      and supervisor_user_id = ${actorId}
      and status = 'offered'
    limit 1
  `)
  if (!result.rows[0]) {
    throw forbidden('No tienes una oferta activa para este tiquet')
  }
}

async function markTaken(
  tx: DbExecutor,
  ticketId: string,
  actorId: string,
  cycle: number,
) {
  const updated = await tx.execute(sql`
    update public.tickets
    set status = 'with_supervisor'
    where id = ${ticketId} and status = 'registered'
    returning id
  `)
  if (!updated.rows[0]) throw conflict('El tiquet ya no está registrado')

  await tx.execute(sql`
    update public.ticket_offers
    set
      status = case
        when supervisor_user_id = ${actorId} then 'taken'::public.offer_status
        else 'withdrawn'::public.offer_status
      end,
      resolved_at = now()
    where ticket_id = ${ticketId} and status = 'offered'
  `)
  await tx.execute(sql`
    insert into public.ticket_assignments (
      ticket_id, cycle, stage, assignee_user_id, assigned_by
    ) values (${ticketId}, ${cycle}, 'supervisor', ${actorId}, ${actorId})
  `)
}

async function takeInTransaction(
  tx: DbExecutor,
  actor: Actor,
  ticketId: string,
  clientRequestId: string,
): Promise<ActionResult> {
  const before = validateHandled(
    await findHandledEvent(tx, clientRequestId),
    ticketId,
    'taken',
    'take',
  )
  if (before) return before

  const ticket = await lockTicket(tx, ticketId)
  const after = validateHandled(
    await findHandledEvent(tx, clientRequestId),
    ticketId,
    'taken',
    'take',
  )
  if (after) return after
  if (ticket.status !== 'registered') {
    throw conflict('El tiquet ya no está registrado')
  }

  await assertOffer(tx, ticketId, actor.id)
  await markTaken(tx, ticketId, actor.id, ticket.cycle)
  await writeEvent(tx, {
    ticketId,
    type: 'taken',
    actorId: actor.id,
    clientRequestId,
  })
  return { ticketId, action: 'take', replayed: false }
}

export async function takeTicket(
  db: Database,
  actor: Actor,
  ticketId: string,
  clientRequestId: string,
): Promise<ActionResult> {
  if (!hasPermission(actor, 'ticket.take_offer')) {
    throw forbidden('No tienes permiso para tomar tiquets')
  }
  if (!(await findVisibleTicket(db, actor, ticketId))) throw notFound()
  return db.transaction((tx) =>
    takeInTransaction(tx, actor, ticketId, clientRequestId),
  )
}
