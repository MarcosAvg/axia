// Registro de operaciones del tiquet: las usan tanto el envío en línea como el reenvío
// desde la cola offline, con el mismo `client_request_id` (idempotencia).

import { CLAIM_RESOLUTIONS } from '../domain/types'
import type { ClaimResolution } from '../domain/types'
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
  pauseTicket,
  reactivateTicket,
  recaptureTicket,
  rejectTicket,
  resolveClaim,
  resumeTicket,
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
  start: (t, _a, id) => startTicket(t, id),
  pause: (t, a, id) => pauseTicket(t, str(a.reasonId), opt(a.note), id),
  resume: (t, _a, id) => resumeTicket(t, id),
  attend: (t, a, id) => attendTicket(t, str(a.workDescription), id),
  validate: (t, _a, id) => validateTicket(t, id),
  reject: (t, a, id) => rejectTicket(t, str(a.reasonId), opt(a.note), id),
  cancel: (t, a, id) => cancelTicket(t, str(a.reasonId), opt(a.note), id),
  change_priority: (t, a, id) => changePriority(t, str(a.priorityId), id),
  comment: (t, a, id) => commentTicket(t, str(a.text), id),
  recapture: (t, a, id) =>
    recaptureTicket(t, asChanges(a.changes), opt(a.reasonId), id),
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
