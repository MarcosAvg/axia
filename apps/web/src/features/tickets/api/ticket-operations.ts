// Registro de operaciones del tiquet: las usan tanto el envío en línea como el reenvío
// desde la cola offline, con el mismo `client_request_id` (idempotencia).

import { CLAIM_RESOLUTIONS } from '../domain/types'
import type { ClaimResolution } from '../domain/types'
import { advancePause, pauseTicket, resumeTicket } from './pause-api'
import {
  addAuxiliary,
  assignSupervisor,
  assignTechnician,
  attendTicket,
  cancelTicket,
  changePriority,
  commentTicket,
  markDuplicate,
  openClaim,
  reactivateTicket,
  recaptureTicket,
  rejectTicket,
  resolveClaim,
  startTicket,
  takeTicket,
  validateTicket,
} from './transitions-api'

export type TicketOperation =
  | 'take'
  | 'assign_technician'
  | 'assign_supervisor'
  | 'add_auxiliary'
  | 'start'
  | 'pause'
  | 'advance_pause'
  | 'resume'
  | 'attend'
  | 'validate'
  | 'reject'
  | 'cancel'
  | 'change_priority'
  | 'comment'
  | 'recapture'
  | 'open_claim'
  | 'resolve_claim'
  | 'mark_duplicate'
  | 'reactivate'

type Args = Record<string, unknown>
type Operation = (
  ticketId: string,
  args: Args,
  clientRequestId: string,
) => Promise<unknown>

const str = (value: unknown): string => String(value ?? '')
const opt = (value: unknown): string | null => (value ? String(value) : null)

function asChanges(value: unknown): Record<string, string | null> {
  if (typeof value !== 'object' || value === null) return {}
  const changes: Record<string, string | null> = {}
  for (const [key, item] of Object.entries(value)) {
    changes[key] = item === null || item === undefined ? null : String(item)
  }
  return changes
}

function asResolution(value: unknown): ClaimResolution {
  const found = CLAIM_RESOLUTIONS.find((candidate) => candidate === value)
  if (!found) throw new Error('Resultado de reclamación inválido')
  return found
}

export const TICKET_OPERATIONS: Record<TicketOperation, Operation> = {
  take: (t, _a, id) => takeTicket(t, id),
  assign_technician: (t, a, id) => assignTechnician(t, str(a.technicianId), id),
  assign_supervisor: (t, a, id) =>
    assignSupervisor(
      t,
      {
        reasonId: str(a.reasonId),
        supervisorUserId: opt(a.supervisorUserId),
        teamId: opt(a.teamId),
        note: opt(a.note),
      },
      id,
    ),
  add_auxiliary: (t, a, id) =>
    addAuxiliary(
      t,
      {
        technicianId: str(a.technicianId),
        reasonId: str(a.reasonId),
        note: opt(a.note),
      },
      id,
    ),
  start: (t, a, id) => startTicket(t, id, opt(a.subjectTechnicianId)),
  pause: (t, a, id) =>
    pauseTicket(
      t,
      {
        reasonId: str(a.reasonId),
        note: opt(a.note),
        subjectTechnicianId: opt(a.subjectTechnicianId),
      },
      id,
    ),
  advance_pause: (t, a, id) =>
    advancePause(
      t,
      {
        reasonId: str(a.reasonId),
        note: opt(a.note),
        subjectTechnicianId: opt(a.subjectTechnicianId),
      },
      id,
    ),
  resume: (t, a, id) =>
    resumeTicket(t, str(a.reasonId), id, opt(a.subjectTechnicianId)),
  attend: (t, a, id) =>
    attendTicket(t, id, {
      workDescription: str(a.workDescription),
      subjectTechnicianId: opt(a.subjectTechnicianId),
      serviceTypeId: opt(a.serviceTypeId),
    }),
  validate: (t, _a, id) => validateTicket(t, id),
  reject: (t, a, id) => rejectTicket(t, str(a.reasonId), opt(a.note), id),
  cancel: (t, a, id) => cancelTicket(t, str(a.reasonId), opt(a.note), id),
  change_priority: (t, a, id) => changePriority(t, str(a.priorityId), id),
  comment: (t, a, id) => commentTicket(t, str(a.text), id),
  recapture: (t, a, id) =>
    recaptureTicket(
      t,
      {
        changes: asChanges(a.changes),
        reasonId: opt(a.reasonId),
        note: opt(a.note),
        subjectTechnicianId: opt(a.subjectTechnicianId),
      },
      id,
    ),
  open_claim: (t, a, id) =>
    openClaim(t, str(a.reasonId), str(a.description), id),
  resolve_claim: (t, a, id) =>
    resolveClaim(
      t,
      {
        resolution: asResolution(a.resolution),
        resultId: opt(a.resultId),
        note: opt(a.note),
      },
      id,
    ),
  mark_duplicate: (t, a, id) => markDuplicate(t, str(a.originalId), id),
  reactivate: (t, a, id) => reactivateTicket(t, str(a.reasonId), id),
}
