import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import {
  conflict,
  lockTicket,
  notFound,
  requireReason,
  type ActionResult,
} from './action-shared.js'
import type { DbExecutor } from './db.js'
import { findHandledEvent, writeEvent } from './events.js'
import { copyDerivedTicket } from './claim-derived.js'
import {
  endOpenParticipants,
  endTechnicianAssignments,
  reopenLeaderParticipation,
} from './flow-state.js'
import { assertTicketHolder } from './access.js'
import { assertTicketAction, findVisibleTicket } from './repository.js'

type ResolveClaimInput = {
  ticketId: string
  resolution: 'upheld' | 'dismissed' | 'new_ticket'
  resultId: string | null
  note: string | null
  clientRequestId: string
}

export type TicketForClaim = {
  id: string
  status: string
  cycle: number
  requester_id: string
  building_id: string
  location_id: string
  dependency_id: string
  category_id: string
  subcategory_id: string | null
  problem_id: string | null
  service_type_id: string | null
  priority_id: string
  channel_id: string
  description: string
  requester_name: string
  requester_contact: string | null
  team_id: string
  closed_at: Date | string | null
  claim_window_ok: boolean
}

type ClaimRow = {
  id: string
  cycle: number
  prior_status: string
}

export async function lockClaimTicket(
  tx: DbExecutor,
  ticketId: string,
): Promise<TicketForClaim> {
  const result = await tx.execute(sql`
    select
      t.*,
      (
        t.status = 'attended'
        or (
          t.status = 'closed'
          and t.closed_at is not null
          and now() - t.closed_at <= (
            select claim_window from public.instance_settings limit 1
          )
        )
      ) as claim_window_ok
    from public.tickets t
    where t.id = ${ticketId}
    for update
  `)
  const row = result.rows[0] as TicketForClaim | undefined
  if (!row) throw notFound()
  return row
}

async function openClaimRow(
  tx: DbExecutor,
  ticketId: string,
): Promise<ClaimRow> {
  const result = await tx.execute(sql`
    select id, cycle, prior_status
    from public.ticket_claims
    where ticket_id = ${ticketId} and status = 'open'
    order by opened_at desc
    limit 1
    for update
  `)
  const row = result.rows[0] as ClaimRow | undefined
  if (!row) throw conflict('El tiquet no tiene una reclamación abierta')
  return row
}

async function resolveUpheld(
  tx: DbExecutor,
  actor: Actor,
  input: ResolveClaimInput,
  claim: ClaimRow,
): Promise<ActionResult> {
  await tx.execute(sql`
    update public.tickets
    set status = 'assigned', cycle = ${claim.cycle + 1}, closed_at = null
    where id = ${input.ticketId}
  `)
  await reopenLeaderParticipation(tx, input.ticketId, actor.id)
  await writeEvent(tx, {
    ticketId: input.ticketId,
    type: 'reopened',
    actorId: actor.id,
    clientRequestId: input.clientRequestId,
  })
  return {
    ticketId: input.ticketId,
    action: 'resolve_claim',
    replayed: false,
  }
}

async function resolveDismissed(
  tx: DbExecutor,
  actor: Actor,
  input: ResolveClaimInput,
): Promise<ActionResult> {
  await tx.execute(sql`
    update public.tickets set status = 'closed', closed_at = now()
    where id = ${input.ticketId}
  `)
  await endOpenParticipants(tx, input.ticketId)
  await endTechnicianAssignments(tx, input.ticketId)
  await writeEvent(tx, {
    ticketId: input.ticketId,
    type: 'claim_resolved',
    actorId: actor.id,
    clientRequestId: input.clientRequestId,
    payload: { resolution: input.resolution },
  })
  return {
    ticketId: input.ticketId,
    action: 'resolve_claim',
    replayed: false,
  }
}

async function resolveWithNewTicket(
  tx: DbExecutor,
  actor: Actor,
  input: ResolveClaimInput,
  claim: ClaimRow,
): Promise<ActionResult & { derivedTicketId: string }> {
  const ticket = await lockClaimTicket(tx, input.ticketId)
  await tx.execute(sql`
    update public.tickets set status = ${claim.prior_status}
    where id = ${input.ticketId}
  `)
  const derivedTicketId = await copyDerivedTicket(tx, actor, ticket)
  await writeEvent(tx, {
    ticketId: input.ticketId,
    type: 'claim_resolved',
    actorId: actor.id,
    clientRequestId: input.clientRequestId,
    payload: { resolution: input.resolution, derivedTicketId },
  })
  return {
    ticketId: input.ticketId,
    action: 'resolve_claim',
    replayed: false,
    derivedTicketId,
  }
}

async function resolveClaimInTransaction(
  tx: DbExecutor,
  actor: Actor,
  input: ResolveClaimInput,
): Promise<ActionResult & { derivedTicketId?: string }> {
  const existing = await findHandledEvent(tx, input.clientRequestId)
  if (existing) {
    if (
      existing.ticketId !== input.ticketId ||
      !['claim_resolved', 'reopened'].includes(existing.type)
    ) {
      throw conflict('La clave de idempotencia ya se usó para otra acción')
    }
    return {
      ticketId: input.ticketId,
      action: 'resolve_claim',
      replayed: true,
    }
  }
  const ticket = await lockTicket(tx, input.ticketId)
  if (ticket.status !== 'under_claim') {
    throw conflict('El tiquet no está en reclamación')
  }
  const claim = await openClaimRow(tx, input.ticketId)
  if (input.resultId) {
    await requireReason(tx, input.resultId, 'claim_outcome', 'Resultado')
  }
  await tx.execute(sql`
    update public.ticket_claims set
      status = 'resolved',
      resolution = ${input.resolution},
      result_id = ${input.resultId},
      resolved_by = ${actor.id},
      resolved_at = now(),
      resolution_note = ${input.note}
    where id = ${claim.id}
  `)
  if (input.resolution === 'upheld') {
    return resolveUpheld(tx, actor, input, claim)
  }
  if (input.resolution === 'dismissed') {
    return resolveDismissed(tx, actor, input)
  }
  return resolveWithNewTicket(tx, actor, input, claim)
}

export async function resolveClaim(
  db: Database,
  actor: Actor,
  input: ResolveClaimInput,
): Promise<ActionResult & { derivedTicketId?: string }> {
  const access = await findVisibleTicket(db, actor, input.ticketId)
  if (!access) throw notFound()
  assertTicketAction(actor, 'ticket.resolve_claim', access)
  assertTicketHolder(actor, access, 'ticket.resolve_claim')
  return db.transaction((tx) => resolveClaimInTransaction(tx, actor, input))
}
