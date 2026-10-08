import { can } from '@/features/auth'
import type { Identity } from '@/features/auth'
import type { TicketStatus } from './types'

export type ActionKey =
  | 'assign_technician'
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

export interface ActionContext {
  identity: Identity | null
  status: TicketStatus
}

const ASSIGNABLE: TicketStatus[] = ['registered', 'with_supervisor', 'assigned']
const RECAPTURABLE: TicketStatus[] = [
  'registered',
  'with_supervisor',
  'assigned',
  'in_progress',
  'paused',
]
const ADVANCEABLE: TicketStatus[] = [
  'registered',
  'with_supervisor',
  'assigned',
  'in_progress',
  'paused',
  'attended',
  'under_claim',
]
const CLAIMABLE: TicketStatus[] = ['attended', 'closed']
const DISCARDED: TicketStatus[] = ['rejected', 'cancelled', 'duplicate']

const has = (context: ActionContext, permission: string) =>
  can(context.identity, permission)

const checks: Record<ActionKey, (context: ActionContext) => boolean> = {
  assign_technician: (c) =>
    ASSIGNABLE.includes(c.status) && has(c, 'ticket.assign_technician'),
  start: (c) => c.status === 'assigned' && has(c, 'ticket.start'),
  pause: (c) => c.status === 'in_progress' && has(c, 'ticket.pause'),
  resume: (c) => c.status === 'paused' && has(c, 'ticket.resume'),
  attend: (c) => c.status === 'in_progress' && has(c, 'ticket.attend'),
  validate: (c) => c.status === 'attended' && has(c, 'ticket.validate'),
  reject: (c) => ADVANCEABLE.includes(c.status) && has(c, 'ticket.reject'),
  cancel: (c) => ADVANCEABLE.includes(c.status) && has(c, 'ticket.cancel'),
  change_priority: (c) =>
    ADVANCEABLE.includes(c.status) && has(c, 'ticket.prioritize'),
  comment: (c) => has(c, 'ticket.view'),
  recapture: (c) =>
    RECAPTURABLE.includes(c.status) && has(c, 'ticket.recapture'),
  open_claim: (c) =>
    CLAIMABLE.includes(c.status) && has(c, 'ticket.open_claim'),
  resolve_claim: (c) =>
    c.status === 'under_claim' && has(c, 'ticket.resolve_claim'),
  mark_duplicate: (c) =>
    ADVANCEABLE.includes(c.status) && has(c, 'ticket.mark_duplicate'),
  reactivate: (c) =>
    DISCARDED.includes(c.status) && has(c, 'ticket.reactivate'),
}

/** Acciones que el usuario puede ejecutar sobre el tiquet en su estado actual. */
export function allowedActions(context: ActionContext): ActionKey[] {
  return (Object.keys(checks) as ActionKey[]).filter((key) =>
    checks[key](context),
  )
}
