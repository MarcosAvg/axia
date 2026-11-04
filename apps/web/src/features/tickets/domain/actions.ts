import { can } from '@/features/auth'
import type { Identity } from '@/features/auth'
import type { TicketStatus } from './types'

export type ActionKey =
  | 'assign_technician'
  | 'assign_supervisor'
  | 'add_auxiliary'
  | 'start'
  | 'pause'
  | 'advance_pause'
  | 'resume'
  | 'record_progress'
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

/** Sujeto de una acción ejecutada a nombre de otra persona. */
export type ProxySubject =
  | { kind: 'requester'; requesterId: string }
  | { kind: 'technician'; technicianId: string }
  | null

/** Permisos que habilitan actuar a nombre del solicitante. */
const REQUESTER_PROXY_PERMISSIONS = [
  'ticket.validate_on_behalf',
  'ticket.rate_on_behalf',
  'ticket.open_claim_on_behalf',
  'ticket.cancel_on_behalf',
] as const

/** Acciones del solicitante que se pueden ejecutar por proxy. */
const REQUESTER_PROXY_ACTIONS: ActionKey[] = [
  'validate',
  'open_claim',
  'cancel',
]

/** Indica si la acción admite un sujeto solicitante. */
export function isRequesterProxyAction(action: ActionKey): boolean {
  return REQUESTER_PROXY_ACTIONS.includes(action)
}

/** Sujeto técnico a partir de un id opcional. */
export function technicianSubject(
  technicianId: string | undefined,
): ProxySubject {
  return technicianId ? { kind: 'technician', technicianId } : null
}

/** Verdadero para un supervisor que no es administrador. */
export function isSupervisorIdentity(identity: Identity | null): boolean {
  return Boolean(
    identity?.roles.includes('supervisor') &&
    !identity.roles.includes('administrator'),
  )
}

/** Verdadero para una identidad con el rol de administrador. */
function isAdministratorIdentity(identity: Identity | null): boolean {
  return Boolean(identity?.roles.includes('administrator'))
}

/** Verdadero si puede actuar a nombre del solicitante en alguna acción. */
export function canRequesterProxy(identity: Identity | null): boolean {
  return REQUESTER_PROXY_PERMISSIONS.some((permission) =>
    can(identity, permission),
  )
}

export interface ActionContext {
  identity: Identity | null
  status: TicketStatus
  /** El actor es el solicitante del tiquet. */
  isRequester: boolean
  /** El lado del solicitante ya validó en el ciclo actual. */
  requesterValidated: boolean
  /** El actor tiene rol de supervisor y no es administrador. */
  isSupervisorRole: boolean
  /** El actor ya tiene una asignación abierta como supervisor del tiquet. */
  hasTaken: boolean
}

const ASSIGNABLE: TicketStatus[] = [
  'registered',
  'with_supervisor',
  'assigned',
  'in_progress',
  'paused',
]
// La recaptura corrige la captura antes de iniciar el trabajo (RN-10).
const RECAPTURABLE: TicketStatus[] = [
  'registered',
  'with_supervisor',
  'assigned',
]
const AUXILIARY_STATUSES: TicketStatus[] = ['assigned', 'in_progress', 'paused']
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
const REASSIGNABLE: TicketStatus[] = [
  'with_supervisor',
  'assigned',
  'in_progress',
  'paused',
]

const has = (context: ActionContext, permission: string) =>
  can(context.identity, permission)

// Acciones del técnico que también se pueden ejecutar por proxy (act_on_behalf).
const PROXY_ACTIONS: ActionKey[] = [
  'start',
  'attend',
  'pause',
  'advance_pause',
  'resume',
  'recapture',
  'record_progress',
]

/** Indica si la acción admite un técnico sujeto (proxy). */
export function isProxyAction(action: ActionKey): boolean {
  return PROXY_ACTIONS.includes(action)
}
const DIRECT_PERMISSION: Partial<Record<ActionKey, string>> = {
  start: 'ticket.start',
  attend: 'ticket.attend',
  pause: 'ticket.pause',
  advance_pause: 'ticket.pause',
  resume: 'ticket.resume',
  recapture: 'ticket.recapture',
}

const hasProxy = (context: ActionContext) =>
  can(context.identity, 'act_on_behalf')
const technicianAction = (context: ActionContext, permission: string) =>
  has(context, permission) || hasProxy(context)

/**
 * Acciones que exigen elegir un técnico sujeto: el usuario puede hacerlas por proxy pero no
 * tiene el permiso directo y todavía no eligió a nombre de quién.
 */
export function actionsRequiringSubject(
  identity: Identity | null,
  actions: ActionKey[],
  hasSubject: boolean,
): ActionKey[] {
  if (hasSubject || !can(identity, 'act_on_behalf')) return []
  return actions.filter(
    (action) =>
      PROXY_ACTIONS.includes(action) &&
      !can(identity, DIRECT_PERMISSION[action] ?? ''),
  )
}

const checks: Record<ActionKey, (context: ActionContext) => boolean> = {
  assign_technician: (c) =>
    ASSIGNABLE.includes(c.status) && has(c, 'ticket.assign_technician'),
  assign_supervisor: (c) =>
    (REASSIGNABLE.includes(c.status) ||
      (c.status === 'registered' && isAdministratorIdentity(c.identity))) &&
    has(c, 'ticket.assign_supervisor'),
  add_auxiliary: (c) =>
    AUXILIARY_STATUSES.includes(c.status) && has(c, 'ticket.add_auxiliary'),
  start: (c) => c.status === 'assigned' && technicianAction(c, 'ticket.start'),
  record_progress: (c) =>
    (c.status === 'in_progress' || c.status === 'paused') &&
    has(c, 'ticket.record_progress'),
  pause: (c) =>
    c.status === 'in_progress' && technicianAction(c, 'ticket.pause'),
  advance_pause: (c) =>
    c.status === 'paused' && technicianAction(c, 'ticket.pause'),
  resume: (c) => c.status === 'paused' && technicianAction(c, 'ticket.resume'),
  attend: (c) =>
    c.status === 'in_progress' && technicianAction(c, 'ticket.attend'),
  validate: (c) => c.status === 'attended' && has(c, 'ticket.validate'),
  reject: (c) => ADVANCEABLE.includes(c.status) && has(c, 'ticket.reject'),
  cancel: (c) => ADVANCEABLE.includes(c.status) && has(c, 'ticket.cancel'),
  change_priority: (c) =>
    ADVANCEABLE.includes(c.status) && has(c, 'ticket.prioritize'),
  comment: (c) => has(c, 'ticket.view'),
  recapture: (c) =>
    RECAPTURABLE.includes(c.status) && technicianAction(c, 'ticket.recapture'),
  open_claim: (c) =>
    CLAIMABLE.includes(c.status) && has(c, 'ticket.open_claim'),
  resolve_claim: (c) =>
    c.status === 'under_claim' && has(c, 'ticket.resolve_claim'),
  mark_duplicate: (c) =>
    ADVANCEABLE.includes(c.status) && has(c, 'ticket.mark_duplicate'),
  reactivate: (c) =>
    DISCARDED.includes(c.status) && has(c, 'ticket.reactivate'),
}

const SUPERVISOR_TAKE_REQUIRED: ActionKey[] = [
  'assign_technician',
  'assign_supervisor',
  'add_auxiliary',
  'recapture',
  'reject',
  'cancel',
  'change_priority',
  'mark_duplicate',
]

/** Acciones que el usuario puede ejecutar sobre el tiquet en su estado actual. */
export function allowedActions(context: ActionContext): ActionKey[] {
  const actions = (Object.keys(checks) as ActionKey[]).filter((key) =>
    checks[key](context),
  )
  if (context.isRequester && context.requesterValidated) {
    if (context.status === 'attended' || context.status === 'under_claim') {
      return []
    }
    return actions.filter((action) => action !== 'open_claim')
  }
  if (context.isSupervisorRole && !context.hasTaken && !context.isRequester) {
    return actions.filter(
      (action) => !SUPERVISOR_TAKE_REQUIRED.includes(action),
    )
  }
  return actions
}

/** Orden de preferencia del "siguiente paso" que se destaca en el detalle. */
const PRIMARY_ORDER: ActionKey[] = [
  'validate',
  'resolve_claim',
  'start',
  'resume',
  'attend',
  'assign_technician',
  'assign_supervisor',
  'add_auxiliary',
  'open_claim',
  'reactivate',
  'mark_duplicate',
  'recapture',
  'change_priority',
  'pause',
  'comment',
  'reject',
  'cancel',
]

/** Acción primaria a destacar, o `null` si no hay acciones. */
export function pickPrimaryAction(actions: ActionKey[]): ActionKey | null {
  for (const candidate of PRIMARY_ORDER) {
    if (actions.includes(candidate)) return candidate
  }
  return actions[0] ?? null
}
