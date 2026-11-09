import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import { AppError } from '../http/errors.js'
import { conflict } from './action-shared.js'
import type { DbExecutor } from './db.js'
import { can, getPermissionScope, type TicketAccess } from './access.js'

export type ValidationRole = 'requester' | 'supervisor'
export type ValidationPolicy = 'requester' | 'supervisor' | 'both'

export type LockedValidationTicket = {
  id: string
  cycle: number
  requester_id: string
  status: string
}

type RoleInput = {
  tx: DbExecutor
  actor: Actor
  access: TicketAccess
  ticket: LockedValidationTicket
  policy: ValidationPolicy
  onBehalf: boolean
  requested?: ValidationRole | null
}

async function requesterUserId(
  tx: DbExecutor,
  requesterId: string,
): Promise<string | null> {
  const result = await tx.execute(sql`
    select user_id from public.requesters where id = ${requesterId} limit 1
  `)
  return (
    (result.rows[0] as { user_id: string | null } | undefined)?.user_id ?? null
  )
}

function normalizePolicy(value: string | undefined): ValidationPolicy {
  return value === 'requester' || value === 'supervisor' || value === 'both'
    ? value
    : 'both'
}

export async function validationPolicy(
  tx: DbExecutor,
): Promise<ValidationPolicy> {
  const settings = await tx.execute(sql`
    select validation_policy from public.instance_settings limit 1
  `)
  return normalizePolicy(
    (settings.rows[0] as { validation_policy: string } | undefined)
      ?.validation_policy,
  )
}

async function hasRoleValidation(
  tx: DbExecutor,
  ticketId: string,
  cycle: number,
  role: ValidationRole,
): Promise<boolean> {
  const result = await tx.execute(sql`
    select exists (
      select 1 from public.ticket_validations
      where ticket_id = ${ticketId} and cycle = ${cycle}
        and validator_role = ${role}
    ) as found
  `)
  return Boolean((result.rows[0] as { found: boolean } | undefined)?.found)
}

async function isRequesterIdentity(
  tx: DbExecutor,
  actor: Actor,
  ticket: LockedValidationTicket,
): Promise<boolean> {
  return (await requesterUserId(tx, ticket.requester_id)) === actor.id
}

/**
 * El lado del supervisor exige capacidad de supervisión sobre el tiquet, no
 * solo el permiso `own` que da la relación de solicitante.
 */
function isSupervisorSide(actor: Actor, access: TicketAccess): boolean {
  if (access.isSupervisor) return true
  const scope = getPermissionScope(actor, 'ticket.validate')
  return scope !== null && scope !== 'own'
}

function forbidden(message: string): AppError {
  return new AppError(403, 'forbidden', message)
}

async function resolveSupervisorRole(
  input: RoleInput,
  requesterValidated: boolean,
): Promise<ValidationRole> {
  const { actor, access, policy, onBehalf } = input
  if (onBehalf) {
    throw new AppError(
      400,
      'validation',
      'Un sujeto solicitante no puede validar el lado del supervisor',
    )
  }
  if (policy === 'requester') {
    throw forbidden('Esta instancia valida solo por el solicitante')
  }
  if (!isSupervisorSide(actor, access)) {
    throw forbidden('Solo un supervisor puede validar este lado')
  }
  if (policy === 'both' && !requesterValidated) {
    throw conflict('Falta la validación del solicitante')
  }
  return 'supervisor'
}

async function resolveRequesterRole(
  input: RoleInput,
  requesterIdentity: boolean,
): Promise<ValidationRole> {
  const { policy, onBehalf } = input
  if (!onBehalf && !requesterIdentity) {
    throw forbidden('Solo el solicitante puede validar su lado')
  }
  if (policy === 'supervisor') {
    throw forbidden('Esta instancia valida solo por el supervisor')
  }
  return 'requester'
}

async function resolveDefaultRole(
  input: RoleInput,
  requesterIdentity: boolean,
  requesterValidated: boolean,
): Promise<ValidationRole> {
  const { actor, access, policy } = input
  if (policy === 'requester') {
    if (!requesterIdentity) {
      throw forbidden('Solo el solicitante puede validar su lado')
    }
    return 'requester'
  }
  if (policy === 'supervisor') {
    if (!isSupervisorSide(actor, access)) {
      throw forbidden('Solo un supervisor puede validar este lado')
    }
    return 'supervisor'
  }
  if (requesterIdentity) {
    if (!requesterValidated) return 'requester'
    // Sin capacidad de supervisión, el segundo intento es el mismo lado y
    // debe responder 409 por duplicado, no 403 por un lado que no le toca.
    if (!isSupervisorSide(actor, access)) return 'requester'
  }
  if (!isSupervisorSide(actor, access)) {
    throw forbidden('Solo un supervisor puede validar este lado')
  }
  if (!requesterValidated) {
    throw conflict('Falta la validación del solicitante')
  }
  return 'supervisor'
}

/**
 * Decide qué lado valida la cuenta. Con `role` explícito se respeta; sin él se
 * conserva la derivación anterior para clientes y acciones offline antiguas.
 */
export async function resolveValidationRole(
  input: RoleInput,
): Promise<ValidationRole> {
  const requesterIdentity = await isRequesterIdentity(
    input.tx,
    input.actor,
    input.ticket,
  )
  const requesterValidated = await hasRoleValidation(
    input.tx,
    input.ticket.id,
    input.ticket.cycle,
    'requester',
  )
  if (input.requested === 'supervisor') {
    return resolveSupervisorRole(input, requesterValidated)
  }
  if (input.requested === 'requester' || input.onBehalf) {
    return resolveRequesterRole(input, requesterIdentity)
  }
  return resolveDefaultRole(input, requesterIdentity, requesterValidated)
}

/** Capacidades de validación por lado para el detalle, sin mirar el estado. */
export function validationCapabilities(
  actor: Actor,
  access: TicketAccess,
  policy: string,
): { canValidateRequester: boolean; canValidateSupervisor: boolean } {
  const normalized = normalizePolicy(policy)
  return {
    canValidateRequester:
      normalized !== 'supervisor' &&
      can(actor, 'ticket.validate', access) &&
      (access.requesterUserId === actor.id ||
        can(actor, 'ticket.validate_on_behalf', access)),
    canValidateSupervisor:
      normalized !== 'requester' &&
      can(actor, 'ticket.validate', access) &&
      isSupervisorSide(actor, access),
  }
}
