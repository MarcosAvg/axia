import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import { AppError } from '../http/errors.js'
import {
  conflict,
  isFinalStatus,
  lockTicket,
  notFound,
  requireReason,
  validateHandled,
  type ActionResult,
} from './action-shared.js'
import type { DbExecutor } from './db.js'
import { findHandledEvent, writeEvent } from './events.js'
import { assertTicketAction, findVisibleTicket } from './repository.js'

export type AuxiliaryInput = {
  ticketId: string
  technicianId: string
  reasonId: string
  note: string | null
  clientRequestId: string
}

async function validateAuxiliary(
  tx: DbExecutor,
  input: AuxiliaryInput,
  ticket: { cycle: number },
) {
  await requireReason(tx, input.reasonId, 'auxiliary_support', 'Motivo')
  const existing = await tx.execute(sql`
    select 1 from public.ticket_participants
    where ticket_id = ${input.ticketId}
      and technician_id = ${input.technicianId}
      and ended_at is null
    limit 1
  `)
  if (existing.rows[0]) {
    throw conflict('Ese técnico ya participa en el tiquet')
  }
  const technician = await tx.execute(sql`
    select id from public.technicians
    where id = ${input.technicianId} and active
    limit 1
  `)
  if (!technician.rows[0]) {
    throw new AppError(400, 'validation_error', 'Técnico no válido')
  }
  return ticket.cycle
}

async function auxiliaryInTransaction(
  tx: DbExecutor,
  actor: Actor,
  input: AuxiliaryInput,
): Promise<ActionResult> {
  const before = validateHandled(
    await findHandledEvent(tx, input.clientRequestId),
    input.ticketId,
    'auxiliary_added',
    'add_auxiliary',
  )
  if (before) return before
  const ticket = await lockTicket(tx, input.ticketId)
  const after = validateHandled(
    await findHandledEvent(tx, input.clientRequestId),
    input.ticketId,
    'auxiliary_added',
    'add_auxiliary',
  )
  if (after) return after
  if (isFinalStatus(ticket.status)) {
    throw conflict('El tiquet no admite apoyo auxiliar')
  }
  const cycle = await validateAuxiliary(tx, input, ticket)
  await tx.execute(sql`
    insert into public.ticket_participants (
      ticket_id, cycle, technician_id, participation_type, category_id,
      recorded_by, client_request_id
    ) values (
      ${input.ticketId}, ${cycle}, ${input.technicianId}, 'auxiliary',
      ${ticket.category_id}, ${actor.id}, ${input.clientRequestId}
    )
  `)
  await writeEvent(tx, {
    ticketId: input.ticketId,
    type: 'auxiliary_added',
    actorId: actor.id,
    clientRequestId: input.clientRequestId,
    reasonId: input.reasonId,
    subjectTechnicianId: input.technicianId,
    payload: { technicianId: input.technicianId, note: input.note },
  })
  return { ticketId: input.ticketId, action: 'add_auxiliary', replayed: false }
}

export async function addAuxiliary(
  db: Database,
  actor: Actor,
  input: AuxiliaryInput,
): Promise<ActionResult> {
  const access = await findVisibleTicket(db, actor, input.ticketId)
  if (!access) throw notFound()
  assertTicketAction(actor, 'ticket.add_auxiliary', access)
  return db.transaction((tx) => auxiliaryInTransaction(tx, actor, input))
}
