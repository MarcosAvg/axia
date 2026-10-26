import type { Actor } from '../auth/authorization.js'

export type PermissionScope = 'own' | 'team' | 'buildings' | 'all'

export type TicketAccess = {
  id: string
  teamId: string
  buildingId: string
  requesterUserId: string | null
  registeredBy: string | null
  isTechnician: boolean
  isParticipant: boolean
  isSupervisor: boolean
}

const REQUESTER_OWN = new Set([
  'ticket.validate',
  'ticket.open_claim',
  'ticket.rate',
])

const TECHNICIAN_OWN = new Set([
  'ticket.start',
  'ticket.attend',
  'ticket.pause',
  'ticket.resume',
  'ticket.recapture',
  'ticket.record_progress',
])

const FLOW_OWN = new Set([
  'ticket.cancel',
  'ticket.reject',
  'ticket.mark_duplicate',
])

export type OwnKind = 'view' | 'requester' | 'technician' | 'flow' | 'none'

export function ownKind(permission: string): OwnKind {
  if (permission === 'ticket.view') return 'view'
  if (REQUESTER_OWN.has(permission)) return 'requester'
  if (TECHNICIAN_OWN.has(permission)) return 'technician'
  if (FLOW_OWN.has(permission)) return 'flow'
  return 'none'
}

const SCOPE_RANK: Record<PermissionScope, number> = {
  own: 1,
  team: 2,
  buildings: 3,
  all: 4,
}

function isRequester(actor: Actor, ticket: TicketAccess): boolean {
  return Boolean(
    actor.requesterUserId &&
    ticket.requesterUserId &&
    actor.requesterUserId === ticket.requesterUserId,
  )
}

function ownAllows(
  actor: Actor,
  permission: string,
  ticket: TicketAccess,
): boolean {
  const requester = isRequester(actor, ticket)
  const technician = ticket.isTechnician || ticket.isParticipant
  const flow = [requester, ticket.isTechnician, ticket.isParticipant].some(
    Boolean,
  )
  const allowed: Record<OwnKind, boolean> = {
    view: [requester, technician, ticket.isSupervisor].some(Boolean),
    requester,
    technician,
    flow,
    none: false,
  }
  return allowed[ownKind(permission)]
}

export function getPermissionScope(
  actor: Actor,
  permission: string,
): PermissionScope | null {
  let selected: PermissionScope | null = null
  for (const grant of actor.permissions) {
    if (grant.id !== permission) continue
    const scope = grant.scope as PermissionScope
    if (!(scope in SCOPE_RANK)) continue
    if (!selected || SCOPE_RANK[scope] > SCOPE_RANK[selected]) {
      selected = scope
    }
  }
  return selected
}

export function can(
  actor: Actor,
  permission: string,
  ticket?: TicketAccess,
): boolean {
  const scope = getPermissionScope(actor, permission)
  if (!scope) return false

  if (permission === 'ticket.create' && !ticket) return true
  if (!ticket) return false

  if (scope === 'all') return true
  if (scope === 'team') return actor.teamIds.includes(ticket.teamId)
  if (scope === 'buildings') {
    return actor.supervisorScopes.some(
      (scopeItem) =>
        scopeItem.teamId === ticket.teamId &&
        scopeItem.buildingIds.includes(ticket.buildingId),
    )
  }

  return ownAllows(actor, permission, ticket)
}

/**
 * Una acción exige primero ver el tiquet: si no es visible, el llamador debe
 * responder 404 antes de comprobar el permiso concreto.
 */
export function canAct(
  actor: Actor,
  permission: string,
  ticket: TicketAccess,
): boolean {
  if (!can(actor, 'ticket.view', ticket)) return false
  return can(actor, permission, ticket)
}
