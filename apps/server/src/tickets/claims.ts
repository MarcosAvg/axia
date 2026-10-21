import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import {
  conflict,
  hasEvidence,
  lockTicket,
  notFound,
  requireReason,
  type ActionResult,
} from './action-shared.js'
import type { DbExecutor } from './db.js'
import { findHandledEvent, writeEvent } from './events.js'
import { copyDerivedTicket } from './claim-derived.js'
import { assertTicketAction, findVisibleTicket } from './repository.js'

type OpenClaimInput = {
  ticketId: string
  reasonId: string
  description: string
  clientRequestId: string
}

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

async function lockClaimTicket(
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

async function openClaimInTransaction(
  tx: DbExecutor,
  actor: Actor,
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
    update public.tickets set status = 'under_claim' where id = ${input.ticketId}
  `)
  await writeEvent(tx, {
    ticketId: input.ticketId,
    type: 'claim_opened',
    actorId: actor.id,
    clientRequestId: input.clientRequestId,
    reasonId: input.reasonId,
    payload: { description: input.description },
  })
  return { ticketId: input.ticketId, action: 'open_claim', replayed: false }
}

export async function openClaim(
  db: Database,
  actor: Actor,
  input: OpenClaimInput,
): Promise<ActionResult> {
  const access = await findVisibleTicket(db, actor, input.ticketId)
  if (!access) throw notFound()
  assertTicketAction(actor, 'ticket.open_claim', access)
  return db.transaction((tx) => openClaimInTransaction(tx, actor, input))
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
    set status = 'assigned', cycle = ${claim.cycle + 1}
    where id = ${input.ticketId}
  `)
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
  return db.transaction((tx) => resolveClaimInTransaction(tx, actor, input))
}
