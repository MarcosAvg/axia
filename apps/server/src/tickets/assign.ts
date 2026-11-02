import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import { AppError } from '../http/errors.js'
import {
  conflict,
  lockTicket,
  notFound,
  type ActionResult,
} from './action-shared.js'
import type { DbExecutor } from './db.js'
import { findHandledEvent, writeEvent, type HandledEvent } from './events.js'
import { endTechnicianAssignments } from './flow-state.js'
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

function validateAssignmentHandled(
  handled: HandledEvent | null,
  ticketId: string,
): ActionResult | null {
  if (!handled) return null
  if (
    handled.ticketId !== ticketId ||
    !['assigned_technician', 'reassigned_technician'].includes(handled.type)
  ) {
    throw conflict('La clave de idempotencia ya se usó para otra acción')
  }
  return { ticketId, action: 'assign_technician', replayed: true }
}

async function hasOpenTechnicianAssignment(
  tx: DbExecutor,
  ticketId: string,
): Promise<boolean> {
  const result = await tx.execute(sql`
    select 1
    from public.ticket_assignments
    where ticket_id = ${ticketId}
      and stage = 'technician'
      and ended_at is null
    limit 1
  `)
  return Boolean(result.rows[0])
}

async function closePreviousAssignment(tx: DbExecutor, ticketId: string) {
  await endTechnicianAssignments(tx, ticketId)
  await tx.execute(sql`
    update public.ticket_offers
    set status = 'withdrawn', resolved_at = now()
    where ticket_id = ${ticketId} and status = 'offered'
  `)
}

type ParticipationInput = {
  actor: Actor
  input: AssignTechnicianInput
  ticket: { cycle: number; category_id: string }
  isReassignment: boolean
}

async function recordParticipation(
  tx: DbExecutor,
  context: ParticipationInput,
) {
  const { actor, input, ticket, isReassignment } = context
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
    type: isReassignment ? 'reassigned_technician' : 'assigned_technician',
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
  const before = validateAssignmentHandled(
    await findHandledEvent(tx, input.clientRequestId),
    input.ticketId,
  )
  if (before) return before

  const ticket = await lockTicket(tx, input.ticketId)
  const after = validateAssignmentHandled(
    await findHandledEvent(tx, input.clientRequestId),
    input.ticketId,
  )
  if (after) return after

  if (!['registered', 'with_supervisor', 'assigned'].includes(ticket.status)) {
    throw conflict('El tiquet no admite asignación de técnico')
  }
  const isReassignment = await hasOpenTechnicianAssignment(tx, input.ticketId)
  await loadTechnician(tx, input.technicianId)
  await closePreviousAssignment(tx, input.ticketId)
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
  await recordParticipation(tx, {
    actor,
    input,
    ticket,
    isReassignment,
  })
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
