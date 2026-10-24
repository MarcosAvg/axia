import type { Actor } from '../auth/authorization.js'
import { withActionTime } from './action-time.js'
import type { Database } from '../db/client.js'
import type { ActionResult } from './action-shared.js'
import { assignTechnician } from './assign.js'
import { addAuxiliary } from './auxiliary.js'
import { changePriority, commentTicket } from './annotation.js'
import { openClaim, resolveClaim } from './claims.js'
import {
  cancelTicket,
  markDuplicate,
  reactivateTicket,
  rejectTicket,
} from './disposition.js'
import { advancePause, pauseTicket, resumeTicket } from './pause.js'
import { rateTicket } from './rating.js'
import { recaptureTicket } from './recapture.js'
import { reassignSupervisor } from './reassign-supervisor.js'
import type { TicketActionInput } from './schemas.js'
import { takeTicket } from './take.js'
import { validateTicket } from './validation.js'
import { attendTicket, startTicket } from './work.js'

function subjectOf(input: TicketActionInput): string | null {
  return 'subjectTechnicianId' in input
    ? (input.subjectTechnicianId ?? null)
    : null
}

async function runDispositionAction(
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
      throw new Error(`Unsupported disposition action: ${input.action}`)
  }
}

async function runAnnotationAction(
  db: Database,
  actor: Actor,
  ticketId: string,
  input: TicketActionInput,
): Promise<ActionResult> {
  switch (input.action) {
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
    default:
      throw new Error(`Unsupported annotation action: ${input.action}`)
  }
}

async function runPauseAction(
  db: Database,
  actor: Actor,
  ticketId: string,
  input: TicketActionInput,
): Promise<ActionResult> {
  const subjectTechnicianId = subjectOf(input)
  switch (input.action) {
    case 'pause':
      return pauseTicket(db, actor, {
        ticketId,
        reasonId: input.reasonId,
        note: input.note ?? null,
        estimatedDate: input.estimatedDate ?? null,
        clientRequestId: input.clientRequestId,
        subjectTechnicianId,
      })
    case 'advance_pause':
      return advancePause(db, actor, {
        ticketId,
        reasonId: input.reasonId,
        note: input.note ?? null,
        clientRequestId: input.clientRequestId,
        subjectTechnicianId,
      })
    case 'resume':
      return resumeTicket(db, actor, {
        ticketId,
        reasonId: input.reasonId,
        clientRequestId: input.clientRequestId,
        subjectTechnicianId,
      })
    default:
      throw new Error(`Unsupported pause action: ${input.action}`)
  }
}

async function runClaimAction(
  db: Database,
  actor: Actor,
  ticketId: string,
  input: TicketActionInput,
): Promise<ActionResult> {
  switch (input.action) {
    case 'recapture':
      return recaptureTicket(db, actor, {
        ticketId,
        changes: input.changes,
        reasonId: input.reasonId ?? null,
        clientRequestId: input.clientRequestId,
        subjectTechnicianId: subjectOf(input),
      })
    case 'open_claim':
      return openClaim(db, actor, {
        ticketId,
        reasonId: input.reasonId,
        description: input.description,
        clientRequestId: input.clientRequestId,
      })
    case 'resolve_claim':
      return resolveClaim(db, actor, {
        ticketId,
        resolution: input.resolution,
        resultId: input.resultId ?? null,
        note: input.note ?? null,
        clientRequestId: input.clientRequestId,
      })
    default:
      throw new Error(`Unsupported claim action: ${input.action}`)
  }
}

async function runSupportAction(
  db: Database,
  actor: Actor,
  ticketId: string,
  input: TicketActionInput,
): Promise<ActionResult> {
  switch (input.action) {
    case 'assign_supervisor':
      return reassignSupervisor(db, actor, {
        ticketId,
        reasonId: input.reasonId,
        supervisorUserId: input.supervisorUserId ?? null,
        teamId: input.teamId ?? null,
        note: input.note ?? null,
        clientRequestId: input.clientRequestId,
      })
    case 'add_auxiliary':
      return addAuxiliary(db, actor, {
        ticketId,
        technicianId: input.technicianId,
        reasonId: input.reasonId,
        note: input.note ?? null,
        clientRequestId: input.clientRequestId,
      })
    default:
      throw new Error(`Unsupported support action: ${input.action}`)
  }
}

async function runRemainingAction(
  db: Database,
  actor: Actor,
  ticketId: string,
  input: TicketActionInput,
): Promise<ActionResult> {
  if (
    ['reject', 'cancel', 'mark_duplicate', 'reactivate'].includes(input.action)
  ) {
    return runDispositionAction(db, actor, ticketId, input)
  }
  if (['change_priority', 'comment'].includes(input.action)) {
    return runAnnotationAction(db, actor, ticketId, input)
  }
  if (['pause', 'advance_pause', 'resume'].includes(input.action)) {
    return runPauseAction(db, actor, ticketId, input)
  }
  if (['assign_supervisor', 'add_auxiliary'].includes(input.action)) {
    return runSupportAction(db, actor, ticketId, input)
  }
  if (input.action === 'rate') {
    return rateTicket(db, actor, {
      ticketId,
      score: input.score,
      comment: input.comment ?? null,
      clientRequestId: input.clientRequestId,
    })
  }
  return runClaimAction(db, actor, ticketId, input)
}

async function runTicketActionNow(
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
    return startTicket(db, actor, {
      ticketId,
      clientRequestId: input.clientRequestId,
      subjectTechnicianId: subjectOf(input),
    })
  }
  if (input.action === 'attend') {
    return attendTicket(db, actor, {
      ticketId,
      workDescription: input.workDescription,
      serviceTypeId: input.serviceTypeId,
      clientRequestId: input.clientRequestId,
      subjectTechnicianId: subjectOf(input),
    })
  }
  if (input.action === 'validate') {
    return validateTicket(db, actor, ticketId, input.clientRequestId)
  }
  return runRemainingAction(db, actor, ticketId, input)
}

export async function runTicketAction(
  db: Database,
  actor: Actor,
  ticketId: string,
  input: TicketActionInput,
): Promise<ActionResult> {
  return withActionTime(
    {
      db,
      actor,
      ticketId,
      occurredAt: input.occurredAt ?? '',
      subjectTechnicianId: subjectOf(input),
    },
    () => runTicketActionNow(db, actor, ticketId, input),
  )
}
