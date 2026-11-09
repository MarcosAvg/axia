import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import { AppError } from '../http/errors.js'
import {
  conflict,
  notFound,
  validateHandled,
  type ActionResult,
} from './action-shared.js'
import type { DbExecutor } from './db.js'
import { findHandledEvent, writeEvent } from './events.js'
import { actionTimestamp, endOpenParticipants } from './flow-state.js'
import { assertRequesterProxy } from './proxy.js'
import { assertTicketAction, findVisibleTicket } from './repository.js'
import { can, getPermissionScope, type TicketAccess } from './access.js'

export type ValidationRole = 'requester' | 'supervisor'
export type ValidationPolicy = 'requester' | 'supervisor' | 'both'

type LockedValidationTicket = {
  id: string
  cycle: number
  requester_id: string
  status: string
}

async function lockValidationTicket(
  tx: DbExecutor,
  ticketId: string,
): Promise<LockedValidationTicket> {
  const result = await tx.execute(sql`
    select id, cycle, requester_id, status
    from public.tickets
    where id = ${ticketId}
    for update
  `)
  const row = result.rows[0] as LockedValidationTicket | undefined
  if (!row) throw notFound()
  return row
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

async function validationPolicy(tx: DbExecutor): Promise<ValidationPolicy> {
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
  role: 'requester' | 'supervisor',
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

/**
 * Decide qué lado valida la cuenta. Con `role` explícito se respeta; sin él se
 * conserva la derivación anterior para clientes y acciones offline antiguas.
 */
async function resolveValidationRole(input: {
  tx: DbExecutor
  actor: Actor
  access: TicketAccess
  ticket: LockedValidationTicket
  policy: ValidationPolicy
  onBehalf: boolean
  requested?: ValidationRole | null
}): Promise<ValidationRole> {
  const { tx, actor, access, ticket, policy, onBehalf, requested } = input
  const requesterIdentity = await isRequesterIdentity(tx, actor, ticket)
  const requesterValidated = await hasRoleValidation(
    tx,
    ticket.id,
    ticket.cycle,
    'requester',
  )

  if (requested === 'supervisor') {
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

  if (requested === 'requester' || onBehalf) {
    if (!onBehalf && !requesterIdentity) {
      throw forbidden('Solo el solicitante puede validar su lado')
    }
    if (policy === 'supervisor') {
      throw forbidden('Esta instancia valida solo por el supervisor')
    }
    return 'requester'
  }

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

async function shouldClose(
  tx: DbExecutor,
  ticketId: string,
  cycle: number,
  policy: ValidationPolicy,
): Promise<boolean> {
  const validations = await tx.execute(sql`
    select
      exists (
        select 1 from public.ticket_validations
        where ticket_id = ${ticketId} and cycle = ${cycle}
          and validator_role = 'requester'
      ) as requester,
      exists (
        select 1 from public.ticket_validations
        where ticket_id = ${ticketId} and cycle = ${cycle}
          and validator_role = 'supervisor'
      ) as supervisor
  `)
  const row = validations.rows[0] as
    { requester: boolean; supervisor: boolean } | undefined
  if (policy === 'requester') return Boolean(row?.requester)
  if (policy === 'supervisor') return Boolean(row?.supervisor)
  return Boolean(row?.requester && row.supervisor)
}

async function recordValidation(
  tx: DbExecutor,
  input: {
    ticketId: string
    cycle: number
    actorId: string
    role: 'requester' | 'supervisor'
  },
): Promise<void> {
  const inserted = await tx.execute(sql`
    insert into public.ticket_validations (
      ticket_id, cycle, validator_user_id, validator_role
    ) values (
      ${input.ticketId}, ${input.cycle}, ${input.actorId}, ${input.role}
    )
    on conflict (ticket_id, cycle, validator_role) do nothing
    returning id
  `)
  if (!inserted.rows[0]) {
    throw conflict('Ya registraste tu validación para este ciclo')
  }
}

type ValidateInput = {
  ticketId: string
  clientRequestId: string
  subjectRequesterId?: string | null
  role?: ValidationRole | null
}

async function closeIfDone(
  tx: DbExecutor,
  ticketId: string,
  cycle: number,
  policy: ValidationPolicy,
): Promise<boolean> {
  const close = await shouldClose(tx, ticketId, cycle, policy)
  if (!close) return false
  await tx.execute(sql`
    update public.tickets
    set status = 'closed', closed_at = ${actionTimestamp()}
    where id = ${ticketId}
  `)
  await endOpenParticipants(tx, ticketId)
  return true
}

async function validateInTransaction(
  tx: DbExecutor,
  actor: Actor,
  access: TicketAccess,
  input: ValidateInput,
): Promise<ActionResult> {
  const {
    ticketId,
    clientRequestId,
    subjectRequesterId,
    role: requested,
  } = input
  const before = validateHandled(
    await findHandledEvent(tx, clientRequestId),
    ticketId,
    'validated',
    'validate',
  )
  if (before) return before
  const ticket = await lockValidationTicket(tx, ticketId)
  const after = validateHandled(
    await findHandledEvent(tx, clientRequestId),
    ticketId,
    'validated',
    'validate',
  )
  if (after) return after
  if (ticket.status !== 'attended') {
    throw conflict('El tiquet no está pendiente de validación')
  }

  const onBehalf = assertRequesterProxy({
    actor,
    access,
    requesterId: ticket.requester_id,
    subjectRequesterId,
    permission: 'ticket.validate_on_behalf',
  })
  const policy = await validationPolicy(tx)
  const role = await resolveValidationRole({
    tx,
    actor,
    access,
    ticket,
    policy,
    onBehalf,
    requested,
  })
  await recordValidation(tx, {
    ticketId,
    cycle: ticket.cycle,
    actorId: actor.id,
    role,
  })

  const close = await closeIfDone(tx, ticketId, ticket.cycle, policy)
  await writeEvent(tx, {
    ticketId,
    type: 'validated',
    actorId: actor.id,
    clientRequestId,
    ...(role === 'requester'
      ? { subjectRequesterId: ticket.requester_id }
      : { subjectUserId: actor.id }),
    payload: { role, partial: !close },
  })
  return { ticketId, action: 'validate', replayed: false }
}

export async function validateTicket(
  db: Database,
  actor: Actor,
  input: ValidateInput,
): Promise<ActionResult> {
  const access = await findVisibleTicket(db, actor, input.ticketId)
  if (!access) throw notFound()
  assertTicketAction(actor, 'ticket.validate', access)
  return db.transaction((tx) => validateInTransaction(tx, actor, access, input))
}
