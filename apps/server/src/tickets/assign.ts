import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import { AppError } from '../http/errors.js'
import { closeOpenWorkPhase, isDesignatedForCategory } from './flow-state.js'
import {
  conflict,
  lockTicket,
  notFound,
  type ActionResult,
} from './action-shared.js'
import { assertTicketHolder } from './access.js'
import {
  closePreviousAssignment,
  currentLeader,
  endAuxiliaryParticipation,
  hasActiveParticipation,
  requireAssignReason,
  type Leader,
} from './assignment-state.js'
import type { DbExecutor } from './db.js'
import { findHandledEvent, writeEvent, type HandledEvent } from './events.js'
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

type RecordContext = {
  tx: DbExecutor
  actor: Actor
  input: AssignTechnicianInput
  ticket: { cycle: number; category_id: string }
  reasonId?: string
  reassignment?: boolean
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
    ![
      'assigned_technician',
      'reassigned_technician',
      'auxiliary_added',
    ].includes(handled.type)
  ) {
    throw conflict('La clave de idempotencia ya se usó para otra acción')
  }
  return { ticketId, action: 'assign_technician', replayed: true }
}

type AssignContext = {
  tx: DbExecutor
  actor: Actor
  input: AssignTechnicianInput
  ticket: { cycle: number; category_id: string; status: string }
  leader: Leader | null
}

async function recordLeader({
  tx,
  actor,
  input,
  ticket,
  reassignment = false,
}: RecordContext) {
  const reasonId = reassignment ? input.reasonId : null
  await tx.execute(sql`
    insert into public.ticket_assignments (
      ticket_id, cycle, stage, assignee_technician_id, assigned_by, reason_id
    ) values (
      ${input.ticketId}, ${ticket.cycle}, 'technician', ${input.technicianId},
      ${actor.id}, ${reasonId}
    )
  `)
  await tx.execute(sql`
    insert into public.ticket_participants (
      ticket_id, cycle, technician_id, participation_type, category_id, recorded_by
    ) values (
      ${input.ticketId}, ${ticket.cycle}, ${input.technicianId}, 'leader',
      ${ticket.category_id}, ${actor.id}
    )
  `)
  await writeEvent(tx, {
    ticketId: input.ticketId,
    type: reassignment ? 'reassigned_technician' : 'assigned_technician',
    actorId: actor.id,
    clientRequestId: input.clientRequestId,
    reasonId,
    subjectTechnicianId: input.technicianId,
    payload: { technicianId: input.technicianId, auxiliary: false },
  })
}

async function recordAuxiliary({
  tx,
  actor,
  input,
  ticket,
  reasonId,
}: RecordContext) {
  await tx.execute(sql`
    insert into public.ticket_participants (
      ticket_id, cycle, technician_id, participation_type, category_id,
      recorded_by, client_request_id
    ) values (
      ${input.ticketId}, ${ticket.cycle}, ${input.technicianId}, 'auxiliary',
      ${ticket.category_id}, ${actor.id}, ${input.clientRequestId}
    )
  `)
  await writeEvent(tx, {
    ticketId: input.ticketId,
    type: 'auxiliary_added',
    actorId: actor.id,
    clientRequestId: input.clientRequestId,
    reasonId: reasonId as string,
    subjectTechnicianId: input.technicianId,
    payload: { technicianId: input.technicianId, note: null },
  })
}

async function assignAuxiliary({
  tx,
  actor,
  input,
  ticket,
  leader,
}: AssignContext): Promise<ActionResult> {
  if (leader?.technicianId === input.technicianId) {
    throw conflict('Ese técnico ya es el líder del tiquet')
  }
  if (await hasActiveParticipation(tx, input.ticketId, input.technicianId)) {
    throw conflict('Ese técnico ya participa en el tiquet')
  }
  await requireAssignReason(tx, input.reasonId, 'auxiliary_support')
  await recordAuxiliary({
    tx,
    actor,
    input,
    ticket,
    reasonId: input.reasonId as string,
  })
  return {
    ticketId: input.ticketId,
    action: 'assign_technician',
    replayed: false,
  }
}

async function assignLeader({
  tx,
  actor,
  input,
  ticket,
  leader,
}: AssignContext): Promise<ActionResult> {
  if (leader?.technicianId === input.technicianId) {
    throw conflict('Ese técnico ya es el líder del tiquet')
  }
  const reassignment = leader !== null
  if (reassignment) {
    await requireAssignReason(tx, input.reasonId, 'technician_reassignment')
    if (ticket.status === 'in_progress' || ticket.status === 'paused') {
      await closeOpenWorkPhase(tx, input.ticketId)
    }
    await closePreviousAssignment(tx, input.ticketId)
  }
  await endAuxiliaryParticipation(tx, input.ticketId, input.technicianId)
  await tx.execute(sql`
    update public.tickets set status = 'assigned' where id = ${input.ticketId}
  `)
  await recordLeader({ tx, actor, input, ticket, reassignment })
  return {
    ticketId: input.ticketId,
    action: 'assign_technician',
    replayed: false,
  }
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
  if (
    ![
      'registered',
      'with_supervisor',
      'assigned',
      'in_progress',
      'paused',
    ].includes(ticket.status)
  ) {
    throw conflict('El tiquet no admite asignación de técnico')
  }
  await loadTechnician(tx, input.technicianId)
  const designated = await isDesignatedForCategory(
    tx,
    input.technicianId,
    ticket.category_id,
  )
  const leader = await currentLeader(tx, input.ticketId)
  const context = { tx, actor, input, ticket, leader }
  return designated ? assignLeader(context) : assignAuxiliary(context)
}

export async function assignTechnician(
  db: Database,
  actor: Actor,
  input: AssignTechnicianInput,
): Promise<ActionResult> {
  const access = await findVisibleTicket(db, actor, input.ticketId)
  if (!access) throw notFound()
  assertTicketAction(actor, 'ticket.assign_technician', access)
  assertTicketHolder(actor, access, 'ticket.assign_technician')
  return db.transaction((tx) => assignInTransaction(tx, actor, input))
}
