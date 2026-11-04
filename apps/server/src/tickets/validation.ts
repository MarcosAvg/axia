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
import type { TicketAccess } from './access.js'

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

async function validationPolicy(tx: DbExecutor): Promise<string> {
  const settings = await tx.execute(sql`
    select validation_policy from public.instance_settings limit 1
  `)
  return (
    (settings.rows[0] as { validation_policy: string } | undefined)
      ?.validation_policy ?? 'both'
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

/**
 * Decide qué lado valida el actor. Actuar a nombre del solicitante es explícito;
 * sin proxy, el supervisor valida su propio lado y respeta el orden de la
 * política `both`.
 */
async function validationRole(
  tx: DbExecutor,
  actor: Actor,
  ticket: LockedValidationTicket,
  options: { policy: string; onBehalf: boolean },
): Promise<'requester' | 'supervisor'> {
  if (options.onBehalf) return 'requester'
  const userId = await requesterUserId(tx, ticket.requester_id)
  if (userId !== null && userId === actor.id) return 'requester'
  if (options.policy === 'requester') {
    throw new AppError(
      403,
      'forbidden',
      'Esta instancia valida solo por el solicitante',
    )
  }
  if (
    options.policy === 'both' &&
    !(await hasRoleValidation(tx, ticket.id, ticket.cycle, 'requester'))
  ) {
    throw conflict(
      'Falta la validación del solicitante; actúa a su nombre para registrarla',
    )
  }
  return 'supervisor'
}

async function shouldClose(
  tx: DbExecutor,
  ticketId: string,
  cycle: number,
  policy: string,
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
}

async function closeIfDone(
  tx: DbExecutor,
  ticketId: string,
  cycle: number,
  policy: string,
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
  const { ticketId, clientRequestId, subjectRequesterId } = input
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
  const role = await validationRole(tx, actor, ticket, { policy, onBehalf })
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
