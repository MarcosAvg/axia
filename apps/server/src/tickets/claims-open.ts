import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import type { TicketAccess } from './access.js'
import {
  assertRequesterCanOpenClaim,
  conflict,
  hasEvidence,
  notFound,
  requireReason,
  type ActionResult,
} from './action-shared.js'
import { lockClaimTicket, type TicketForClaim } from './claims.js'
import type { DbExecutor } from './db.js'
import { findHandledEvent, writeEvent } from './events.js'
import { closeOpenWorkPhase, endOpenParticipants } from './flow-state.js'
import { assertRequesterProxy } from './proxy.js'
import { assertTicketAction, findVisibleTicket } from './repository.js'

type OpenClaimInput = {
  ticketId: string
  reasonId: string
  description: string
  clientRequestId: string
  subjectRequesterId?: string | null
}

type OpenContext = {
  actor: Actor
  access: TicketAccess
  ticket: TicketForClaim
  input: OpenClaimInput
}

async function assertOpenable(
  tx: DbExecutor,
  context: OpenContext,
): Promise<boolean> {
  const { actor, access, ticket, input } = context
  const onBehalf = assertRequesterProxy({
    actor,
    access,
    requesterId: ticket.requester_id,
    subjectRequesterId: input.subjectRequesterId,
    permission: 'ticket.open_claim_on_behalf',
  })
  await assertRequesterCanOpenClaim(tx, actor, ticket)
  if (!ticket.claim_window_ok) {
    throw conflict('El tiquet no admite una reclamación en su estado')
  }
  await requireReason(tx, input.reasonId, 'claim', 'Motivo')
  if (!(await hasEvidence(tx, input.ticketId, ticket.cycle, 'claim'))) {
    throw conflict('Falta la evidencia de la reclamación')
  }
  const open = await tx.execute(sql`
    select 1 from public.ticket_claims
    where ticket_id = ${input.ticketId} and status = 'open'
    limit 1
  `)
  if (open.rows[0]) throw conflict('El tiquet ya tiene una reclamación abierta')
  return onBehalf
}

async function recordOpened(
  tx: DbExecutor,
  context: OpenContext & { onBehalf: boolean },
): Promise<void> {
  const { actor, access, ticket, input, onBehalf } = context
  await closeOpenWorkPhase(tx, input.ticketId)
  await endOpenParticipants(tx, input.ticketId)
  await tx.execute(sql`
    insert into public.ticket_claims (
      ticket_id, cycle, opened_by, reason_id, description, prior_status,
      client_request_id
    ) values (
      ${input.ticketId}, ${ticket.cycle}, ${actor.id}, ${input.reasonId},
      ${input.description}, ${ticket.status}, ${input.clientRequestId}
    )
  `)
  await tx.execute(sql`
    update public.tickets
    set status = 'under_claim', closed_at = null
    where id = ${input.ticketId}
  `)
  await writeEvent(tx, {
    ticketId: input.ticketId,
    type: 'claim_opened',
    actorId: actor.id,
    clientRequestId: input.clientRequestId,
    reasonId: input.reasonId,
    ...(onBehalf || access.requesterUserId === actor.id
      ? { subjectRequesterId: ticket.requester_id }
      : { subjectUserId: actor.id }),
    payload: { description: input.description },
  })
}

async function openClaimInTransaction(
  tx: DbExecutor,
  actor: Actor,
  access: TicketAccess,
  input: OpenClaimInput,
): Promise<ActionResult> {
  const existing = await findHandledEvent(tx, input.clientRequestId)
  if (existing) {
    if (
      existing.type !== 'claim_opened' ||
      existing.ticketId !== input.ticketId
    ) {
      throw conflict('La clave de idempotencia ya se usó para otra acción')
    }
    return { ticketId: input.ticketId, action: 'open_claim', replayed: true }
  }
  const ticket = await lockClaimTicket(tx, input.ticketId)
  const context = { actor, access, ticket, input }
  const onBehalf = await assertOpenable(tx, context)
  await recordOpened(tx, { ...context, onBehalf })
  return { ticketId: input.ticketId, action: 'open_claim', replayed: false }
}

export async function openClaim(
  db: Database,
  actor: Actor,
  input: OpenClaimInput,
): Promise<ActionResult> {
  const access = await findVisibleTicket(db, actor, input.ticketId)
  if (!access) throw notFound()
  assertTicketAction(
    actor,
    input.subjectRequesterId
      ? 'ticket.open_claim_on_behalf'
      : 'ticket.open_claim',
    access,
  )
  return db.transaction((tx) =>
    openClaimInTransaction(tx, actor, access, input),
  )
}
