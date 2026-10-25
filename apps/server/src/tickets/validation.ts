import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import { can as hasPermission } from '../auth/authorization.js'
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
import { endOpenParticipants } from './flow-state.js'
import { assertTicketAction, findVisibleTicket } from './repository.js'

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
 * El solicitante sin cuenta no puede validar: quien tiene `validate_on_behalf`
 * llena primero el lado del solicitante y después el del supervisor.
 */
async function validationRole(
  tx: DbExecutor,
  actor: Actor,
  ticket: LockedValidationTicket,
  policy: string,
): Promise<'requester' | 'supervisor'> {
  const userId = await requesterUserId(tx, ticket.requester_id)
  if (userId !== null && userId === actor.id) return 'requester'
  if (hasPermission(actor, 'ticket.validate_on_behalf')) {
    if (policy === 'supervisor') return 'supervisor'
    if (!(await hasRoleValidation(tx, ticket.id, ticket.cycle, 'requester'))) {
      return 'requester'
    }
    return 'supervisor'
  }
  if (userId !== null) {
    throw new AppError(
      403,
      'forbidden',
      'No tienes permiso para validar a nombre del solicitante',
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

async function validateInTransaction(
  tx: DbExecutor,
  actor: Actor,
  ticketId: string,
  clientRequestId: string,
): Promise<ActionResult> {
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

  const policy = await validationPolicy(tx)
  const role = await validationRole(tx, actor, ticket, policy)
  await tx.execute(sql`
    insert into public.ticket_validations (
      ticket_id, cycle, validator_user_id, validator_role
    ) values (${ticketId}, ${ticket.cycle}, ${actor.id}, ${role})
    on conflict (ticket_id, cycle, validator_role) do nothing
  `)

  const close = await shouldClose(tx, ticketId, ticket.cycle, policy)
  if (close) {
    await tx.execute(sql`
      update public.tickets
      set status = 'closed', closed_at = now()
      where id = ${ticketId}
    `)
    await endOpenParticipants(tx, ticketId)
    await writeEvent(tx, {
      ticketId,
      type: 'validated',
      actorId: actor.id,
      clientRequestId,
    })
  } else {
    await writeEvent(tx, {
      ticketId,
      type: 'validated',
      actorId: actor.id,
      clientRequestId,
      payload: { partial: true, role },
    })
  }
  return { ticketId, action: 'validate', replayed: false }
}

export async function validateTicket(
  db: Database,
  actor: Actor,
  ticketId: string,
  clientRequestId: string,
): Promise<ActionResult> {
  const access = await findVisibleTicket(db, actor, ticketId)
  if (!access) throw notFound()
  assertTicketAction(actor, 'ticket.validate', access)
  return db.transaction((tx) =>
    validateInTransaction(tx, actor, ticketId, clientRequestId),
  )
}
