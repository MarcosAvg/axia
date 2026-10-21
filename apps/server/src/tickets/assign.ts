import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import { AppError } from '../http/errors.js'
import {
  conflict,
  lockTicket,
  notFound,
  validateHandled,
  type ActionResult,
} from './action-shared.js'
import type { DbExecutor } from './db.js'
import { findHandledEvent, writeEvent } from './events.js'
import { assertTicketAction, findVisibleTicket } from './repository.js'

export type AssignTechnicianInput = {
  ticketId: string
  technicianId: string
  reasonId: string | null
  clientRequestId: string
}

type TechnicianRow = {
  id: string
}

async function loadTechnician(
  tx: DbExecutor,
  technicianId: string,
): Promise<TechnicianRow> {
  const result = await tx.execute(sql`
    select id
    from public.technicians
    where id = ${technicianId} and active
    limit 1
  `)
  const row = result.rows[0] as TechnicianRow | undefined
  if (!row) {
    throw new AppError(400, 'validation_error', 'Técnico no válido')
  }
  return row
}

async function closePreviousAssignment(
  tx: DbExecutor,
  ticketId: string,
  technicianId: string,
) {
  await tx.execute(sql`
    update public.ticket_assignments
    set ended_at = now()
    where ticket_id = ${ticketId}
      and stage = 'technician'
      and ended_at is null
  `)
  await tx.execute(sql`
    update public.ticket_participants
    set ended_at = now()
    where ticket_id = ${ticketId}
      and technician_id = ${technicianId}
      and ended_at is null
  `)
  await tx.execute(sql`
    update public.ticket_offers
    set status = 'withdrawn', resolved_at = now()
    where ticket_id = ${ticketId} and status = 'offered'
  `)
}

async function recordParticipation(
  tx: DbExecutor,
  actor: Actor,
  input: AssignTechnicianInput,
  ticket: { cycle: number; category_id: string },
) {
  const result = await tx.execute(sql`
    select exists (
      select 1 from public.technician_categories
      where technician_id = ${input.technicianId}
        and category_id = ${ticket.category_id}
    ) as designated
  `)
  const isDesignated = Boolean(
    (result.rows[0] as { designated: boolean } | undefined)?.designated,
  )
  const participationType = isDesignated ? 'leader' : 'auxiliary'
  await tx.execute(sql`
    insert into public.ticket_participants (
      ticket_id, cycle, technician_id, participation_type, category_id, recorded_by
    ) values (
      ${input.ticketId}, ${ticket.cycle}, ${input.technicianId},
      ${participationType}, ${ticket.category_id}, ${actor.id}
    )
  `)
  await writeEvent(tx, {
    ticketId: input.ticketId,
    type: 'assigned_technician',
    actorId: actor.id,
    clientRequestId: input.clientRequestId,
    reasonId: input.reasonId,
    subjectTechnicianId: input.technicianId,
    payload: { technicianId: input.technicianId, auxiliary: !isDesignated },
  })
}

async function assignInTransaction(
  tx: DbExecutor,
  actor: Actor,
  input: AssignTechnicianInput,
): Promise<ActionResult> {
  const before = validateHandled(
    await findHandledEvent(tx, input.clientRequestId),
    input.ticketId,
    'assigned_technician',
    'assign_technician',
  )
  if (before) return before

  const ticket = await lockTicket(tx, input.ticketId)
  const after = validateHandled(
    await findHandledEvent(tx, input.clientRequestId),
    input.ticketId,
    'assigned_technician',
    'assign_technician',
  )
  if (after) return after

  if (!['registered', 'with_supervisor', 'assigned'].includes(ticket.status)) {
    throw conflict('El tiquet no admite asignación de técnico')
  }
  await loadTechnician(tx, input.technicianId)
  await closePreviousAssignment(tx, input.ticketId, input.technicianId)
  await tx.execute(sql`
    update public.tickets set status = 'assigned' where id = ${input.ticketId}
  `)
  await tx.execute(sql`
    insert into public.ticket_assignments (
      ticket_id, cycle, stage, assignee_technician_id, assigned_by, reason_id
    ) values (
      ${input.ticketId}, ${ticket.cycle}, 'technician', ${input.technicianId},
      ${actor.id}, ${input.reasonId}
    )
  `)
  await recordParticipation(tx, actor, input, ticket)
  return {
    ticketId: input.ticketId,
    action: 'assign_technician',
    replayed: false,
  }
}

export async function assignTechnician(
  db: Database,
  actor: Actor,
  input: AssignTechnicianInput,
): Promise<ActionResult> {
  const access = await findVisibleTicket(db, actor, input.ticketId)
  if (!access) throw notFound()
  assertTicketAction(actor, 'ticket.assign_technician', access)
  return db.transaction((tx) => assignInTransaction(tx, actor, input))
}
