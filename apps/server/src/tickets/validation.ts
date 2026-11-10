import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import {
  conflict,
  notFound,
  validateHandled,
  type ActionResult,
} from './action-shared.js'
import type { DbExecutor } from './db.js'
import { findHandledEvent, writeEvent } from './events.js'
import {
  actionTimestamp,
  endOpenParticipants,
  endTechnicianAssignments,
} from './flow-state.js'
import { assertRequesterProxy } from './proxy.js'
import { assertTicketAction, findVisibleTicket } from './repository.js'
import { assertTimeVerified } from './time-alerts.js'
import type { TicketAccess } from './access.js'
import {
  resolveValidationRole,
  validationPolicy,
  type LockedValidationTicket,
  type ValidationPolicy,
  type ValidationRole,
} from './validation-role.js'

export { validationCapabilities } from './validation-role.js'

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

async function replayValidation(
  tx: DbExecutor,
  ticketId: string,
  clientRequestId: string,
): Promise<ActionResult | null> {
  return validateHandled(
    await findHandledEvent(tx, clientRequestId),
    ticketId,
    'validated',
    'validate',
  )
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
    role: ValidationRole
  },
): Promise<void> {
  const inserted = await tx.execute(sql`
    insert into public.ticket_validations (
      ticket_id, cycle, validator_user_id, validator_role, validated_at
    ) values (
      ${input.ticketId}, ${input.cycle}, ${input.actorId}, ${input.role},
      ${actionTimestamp()}
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
  await endTechnicianAssignments(tx, ticketId)
  return true
}

async function writeValidationEvent(
  tx: DbExecutor,
  input: {
    ticketId: string
    actorId: string
    clientRequestId: string
    role: ValidationRole
    close: boolean
    requesterId: string
  },
): Promise<void> {
  await writeEvent(tx, {
    ticketId: input.ticketId,
    type: 'validated',
    actorId: input.actorId,
    clientRequestId: input.clientRequestId,
    ...(input.role === 'requester'
      ? { subjectRequesterId: input.requesterId }
      : { subjectUserId: input.actorId }),
    payload: { role: input.role, partial: !input.close },
  })
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
  const before = await replayValidation(tx, ticketId, clientRequestId)
  if (before) return before
  const ticket = await lockValidationTicket(tx, ticketId)
  const after = await replayValidation(tx, ticketId, clientRequestId)
  if (after) return after
  if (ticket.status !== 'attended') {
    throw conflict('El tiquet no está pendiente de validación')
  }
  await assertTimeVerified(tx, ticketId)

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
  await writeValidationEvent(tx, {
    ticketId,
    actorId: actor.id,
    clientRequestId,
    role,
    close,
    requesterId: ticket.requester_id,
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
