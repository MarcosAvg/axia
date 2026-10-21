import type { Actor } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import type { ActionResult } from './action-shared.js'
import { assignTechnician } from './assign.js'
import { changePriority, commentTicket } from './annotation.js'
import {
  cancelTicket,
  markDuplicate,
  reactivateTicket,
  rejectTicket,
} from './disposition.js'
import type { TicketActionInput } from './schemas.js'
import { takeTicket } from './take.js'
import { validateTicket } from './validation.js'
import { attendTicket, startTicket } from './work.js'

async function runRemainingAction(
  db: Database,
  actor: Actor,
  ticketId: string,
  input: TicketActionInput,
): Promise<ActionResult> {
  switch (input.action) {
    case 'reject':
      return rejectTicket(db, actor, {
        ticketId,
        reasonId: input.reasonId,
        note: input.note ?? null,
        clientRequestId: input.clientRequestId,
      })
    case 'cancel':
      return cancelTicket(db, actor, {
        ticketId,
        reasonId: input.reasonId,
        note: input.note ?? null,
        clientRequestId: input.clientRequestId,
      })
    case 'change_priority':
      return changePriority(db, actor, {
        ticketId,
        priorityId: input.priorityId,
        clientRequestId: input.clientRequestId,
      })
    case 'comment':
      return commentTicket(db, actor, {
        ticketId,
        text: input.text,
        isInternal: input.isInternal,
        clientRequestId: input.clientRequestId,
      })
    case 'mark_duplicate':
      return markDuplicate(db, actor, {
        ticketId,
        originalId: input.originalId,
        clientRequestId: input.clientRequestId,
      })
    case 'reactivate':
      return reactivateTicket(db, actor, {
        ticketId,
        reasonId: input.reasonId,
        clientRequestId: input.clientRequestId,
      })
    default:
      throw new Error(`Unsupported ticket action: ${input.action}`)
  }
}

export async function runTicketAction(
  db: Database,
  actor: Actor,
  ticketId: string,
  input: TicketActionInput,
): Promise<ActionResult> {
  if (input.action === 'take') {
    return takeTicket(db, actor, ticketId, input.clientRequestId)
  }
  if (input.action === 'assign_technician') {
    return assignTechnician(db, actor, {
      ticketId,
      technicianId: input.technicianId,
      reasonId: input.reasonId ?? null,
      clientRequestId: input.clientRequestId,
    })
  }
  if (input.action === 'start') {
    return startTicket(db, actor, ticketId, input.clientRequestId)
  }
  if (input.action === 'attend') {
    return attendTicket(db, actor, {
      ticketId,
      workDescription: input.workDescription,
      serviceTypeId: input.serviceTypeId,
      clientRequestId: input.clientRequestId,
    })
  }
  if (input.action === 'validate') {
    return validateTicket(db, actor, ticketId, input.clientRequestId)
  }
  return runRemainingAction(db, actor, ticketId, input)
}
