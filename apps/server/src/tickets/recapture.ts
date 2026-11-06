import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import { AppError } from '../http/errors.js'
import {
  findSatisfyingAttachment,
  linkAttachment,
  writeAttachmentEvent,
  type LinkedAttachment,
} from '../attachments/link.js'
import { problemAttachmentTypes } from '../attachments/requirements.js'
import {
  conflict,
  notFound,
  requireReason,
  validateHandled,
  type ActionResult,
} from './action-shared.js'
import type { DbExecutor } from './db.js'
import { findHandledEvent, writeEvent } from './events.js'
import { assertTicketHolder } from './access.js'
import { assertTechnicianAction } from './proxy.js'
import {
  applyChanges,
  type RecaptureChanges,
  type RecaptureTicket,
} from './recapture-changes.js'
import { refreshDuplicates } from './recapture-duplicates.js'
import { findVisibleTicket } from './repository.js'

export type RecaptureInput = {
  ticketId: string
  changes: RecaptureChanges
  reasonId: string | null
  note: string | null
  clientRequestId: string
  subjectTechnicianId?: string | null
  attachmentId?: string | null
}

// La recaptura corrige la captura antes de iniciar el trabajo (RN-10).
const RECAPTURABLE = ['registered', 'with_supervisor', 'assigned']

async function lockRecaptureTicket(
  tx: DbExecutor,
  ticketId: string,
): Promise<RecaptureTicket> {
  const result = await tx.execute(sql`
    select t.*, r.dependency_id as requester_dependency_id
    from public.tickets t
    left join public.requesters r on r.id = t.requester_id
    where t.id = ${ticketId}
    for update of t
  `)
  const row = result.rows[0] as RecaptureTicket | undefined
  if (!row) throw notFound()
  return row
}

async function ensureRecaptureAttachment(
  tx: DbExecutor,
  actor: Actor,
  ticket: RecaptureTicket,
  input: RecaptureInput,
): Promise<LinkedAttachment | null> {
  const problemChanged =
    input.changes.problemId !== undefined &&
    input.changes.problemId !== ticket.problem_id
  if (!problemChanged) {
    if (input.attachmentId) {
      throw new AppError(
        422,
        'attachment_not_required',
        'El adjunto no aplica si el problema no cambia',
      )
    }
    return null
  }
  const required = await problemAttachmentTypes(
    tx,
    input.changes.problemId ?? null,
  )
  if (required.length === 0) {
    if (input.attachmentId) {
      throw new AppError(
        422,
        'attachment_not_required',
        'El problema destino no exige adjunto',
      )
    }
    return null
  }
  if (await findSatisfyingAttachment(tx, ticket.id, required)) {
    if (input.attachmentId) {
      throw new AppError(
        422,
        'attachment_not_required',
        'El tiquet ya tiene un adjunto compatible',
      )
    }
    return null
  }
  if (!input.attachmentId) {
    throw new AppError(
      422,
      'attachment_required',
      'El problema destino exige adjuntar un archivo',
    )
  }
  return linkAttachment({
    tx,
    actor,
    ticketId: ticket.id,
    attachmentId: input.attachmentId,
    allowed: required,
  })
}

async function recaptureInTransaction(
  tx: DbExecutor,
  actor: Actor,
  input: RecaptureInput,
): Promise<ActionResult> {
  const before = validateHandled(
    await findHandledEvent(tx, input.clientRequestId),
    input.ticketId,
    'capture_recaptured',
    'recapture',
  )
  if (before) return before
  const ticket = await lockRecaptureTicket(tx, input.ticketId)
  const after = validateHandled(
    await findHandledEvent(tx, input.clientRequestId),
    input.ticketId,
    'capture_recaptured',
    'recapture',
  )
  if (after) return after
  if (!RECAPTURABLE.includes(ticket.status)) {
    throw conflict('El tiquet no admite recaptura en su estado')
  }
  if (Object.keys(input.changes).length === 0) {
    throw new AppError(400, 'validation_error', 'Indica al menos un cambio')
  }
  if (input.reasonId) {
    await requireReason(tx, input.reasonId, 'recapture', 'Motivo')
  }
  const linkedAttachment = await ensureRecaptureAttachment(
    tx,
    actor,
    ticket,
    input,
  )
  await tx.execute(sql`
    insert into public.ticket_captures (
      ticket_id, cycle, changed_by, reason_id, changes
    ) values (
      ${input.ticketId}, ${ticket.cycle}, ${actor.id}, ${input.reasonId},
      ${JSON.stringify(input.changes)}::jsonb
    )
  `)
  await applyChanges(tx, actor, ticket, input.changes)
  await refreshDuplicates(tx, input.ticketId)
  await writeEvent(tx, {
    ticketId: input.ticketId,
    type: 'capture_recaptured',
    actorId: actor.id,
    clientRequestId: input.clientRequestId,
    reasonId: input.reasonId,
    subjectTechnicianId: input.subjectTechnicianId ?? null,
    payload: { ...input.changes, note: input.note ?? null },
  })
  if (linkedAttachment) {
    await writeAttachmentEvent(tx, actor, input.ticketId, linkedAttachment)
  }
  return { ticketId: input.ticketId, action: 'recapture', replayed: false }
}

export async function recaptureTicket(
  db: Database,
  actor: Actor,
  input: RecaptureInput,
): Promise<ActionResult> {
  const access = await findVisibleTicket(db, actor, input.ticketId)
  if (!access) throw notFound()
  await assertTechnicianAction({
    db,
    actor,
    access,
    permission: 'ticket.recapture',
    subjectTechnicianId: input.subjectTechnicianId,
    requireParticipant: false,
  })
  assertTicketHolder(actor, access, 'ticket.recapture')
  return db.transaction((tx) => recaptureInTransaction(tx, actor, input))
}
