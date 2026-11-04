import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import { can as hasPermission } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import { AppError } from '../http/errors.js'
import {
  loadRequester,
  resolveCreateDefaults,
  validateCreateInputs,
  type ResolvedCreateInput,
  type RequesterRow,
} from './create-validation.js'
import type {
  CreateTicketInput,
  CreateTicketResult,
  TicketSummaryRow,
} from './create-types.js'
import { assertCreateTime } from './action-time.js'
import type { DbExecutor } from './db.js'
import { detectAndStoreDuplicates } from './duplicates.js'
import { withOccurredAt } from './event-context.js'
import { findHandledEvent, isUniqueViolation, writeEvent } from './events.js'

type RequesterContext = {
  requester: RequesterRow
  onBehalf: boolean
}

function conflict(message: string): AppError {
  return new AppError(409, 'conflict', message)
}

async function authorizeRequester(
  tx: DbExecutor,
  actor: Actor,
  input: CreateTicketInput,
): Promise<RequesterContext> {
  const requester = await loadRequester(tx, input.requesterId)
  const onBehalf = requester.user_id !== actor.id
  const permission = onBehalf ? 'ticket.create_on_behalf' : 'ticket.create'
  if (!hasPermission(actor, permission)) {
    throw new AppError(
      403,
      'forbidden',
      'No tienes permiso para registrar este tiquet',
    )
  }
  return { requester, onBehalf }
}

export type RouteInput = {
  tx: DbExecutor
  ticketId: string
  cycle: number
  teamId: string
  buildingId: string
  actorId?: string | null
}

export async function routeTicket({
  tx,
  ticketId,
  cycle,
  teamId,
  buildingId,
  actorId = null,
}: RouteInput) {
  const inserted = await tx.execute(sql`
    insert into public.ticket_offers (ticket_id, cycle, supervisor_user_id)
    select ${ticketId}, ${cycle}, ss.user_id
    from public.supervisor_scopes ss
    join public.supervisor_scope_buildings ssb on ssb.scope_id = ss.id
    join public.users u on u.id = ss.user_id and u.active
    where ss.team_id = ${teamId}
      and ssb.building_id = ${buildingId}
      and ss.active
    on conflict do nothing
    returning id
  `)
  if (inserted.rows[0]) {
    await writeEvent(tx, {
      ticketId,
      type: 'offered',
      actorId,
    })
  }
}

async function replayedCreate(
  tx: DbExecutor,
  handled: { type: string; ticketId: string },
): Promise<CreateTicketResult> {
  if (handled.type !== 'created') {
    throw conflict('La clave de idempotencia ya se usó para otra acción')
  }
  const ticket = await ticketSummary(tx, handled.ticketId)
  return {
    ticketId: ticket.id,
    folio: ticket.folio,
    possibleDuplicate: ticket.possible_duplicate,
    replayed: true,
  }
}

async function ticketSummary(
  executor: DbExecutor,
  ticketId: string,
): Promise<TicketSummaryRow> {
  const result = await executor.execute(sql`
    select id, folio, possible_duplicate
    from public.tickets
    where id = ${ticketId}
    limit 1
  `)
  const row = result.rows[0] as TicketSummaryRow | undefined
  if (!row) throw new Error('The ticket could not be loaded')
  return row
}

type InsertTicketInput = {
  tx: DbExecutor
  actor: Actor
  input: ResolvedCreateInput
  requester: RequesterRow
  teamId: string
  occurredAt: string
}

async function insertTicket({
  tx,
  actor,
  input,
  requester,
  teamId,
  occurredAt,
}: InsertTicketInput): Promise<{ id: string; cycle: number }> {
  const inserted = await tx.execute(sql`
    insert into public.tickets (
      building_id, location_id, dependency_id, category_id, subcategory_id,
      problem_id, service_type_id, priority_id, channel_id, description,
      requester_id, requester_name, requester_contact, registered_by, team_id,
      reported_at
    ) values (
      ${input.buildingId}, ${input.locationId}, ${input.dependencyId},
      ${input.categoryId}, ${input.subcategoryId ?? null},
      ${input.problemId ?? null}, ${input.serviceTypeId}, ${input.priorityId},
      ${input.channelId}, ${input.description}, ${requester.id},
      ${input.requesterName ?? requester.full_name},
      ${input.requesterContact ?? requester.contact},
      ${actor.id}, ${teamId}, ${occurredAt}
    )
    returning id, cycle
  `)
  const ticket = inserted.rows[0] as { id: string; cycle: number } | undefined
  if (!ticket) throw new Error('The ticket could not be created')
  return ticket
}

type FinalizeCreate = {
  tx: DbExecutor
  actor: Actor
  input: CreateTicketInput
  ticket: { id: string; cycle: number }
  teamId: string
  occurredAt: string
  onBehalf: boolean
}

async function finalizeCreate({
  tx,
  actor,
  input,
  ticket,
  teamId,
  occurredAt,
  onBehalf,
}: FinalizeCreate): Promise<CreateTicketResult> {
  await writeEvent(tx, {
    ticketId: ticket.id,
    type: 'created',
    actorId: actor.id,
    clientRequestId: input.clientRequestId,
    subjectRequesterId: input.requesterId,
    payload: { onBehalf },
  })
  await routeTicket({
    tx,
    ticketId: ticket.id,
    cycle: ticket.cycle,
    teamId,
    buildingId: input.buildingId,
    actorId: actor.id,
  })
  await detectAndStoreDuplicates(tx, {
    ticketId: ticket.id,
    actorId: actor.id,
    shownCandidateIds: input.shownCandidateIds,
    input: {
      buildingId: input.buildingId,
      locationId: input.locationId,
      categoryId: input.categoryId,
      subcategoryId: input.subcategoryId,
      problemId: input.problemId,
      dependencyId: input.dependencyId,
      description: input.description,
      reportedAt: occurredAt,
      excludeTicketId: ticket.id,
    },
  })
  const summary = await ticketSummary(tx, ticket.id)
  return {
    ticketId: summary.id,
    folio: summary.folio,
    possibleDuplicate: summary.possible_duplicate,
    replayed: false,
  }
}

async function createInTransaction(
  tx: DbExecutor,
  actor: Actor,
  input: CreateTicketInput,
  occurredAt: string,
): Promise<CreateTicketResult> {
  const handled = await findHandledEvent(tx, input.clientRequestId)
  if (handled) return replayedCreate(tx, handled)

  const resolved = await resolveCreateDefaults(tx, input)
  const { requester, onBehalf } = await authorizeRequester(tx, actor, resolved)
  if (input.occurredAt && !onBehalf) {
    throw new AppError(
      400,
      'validation',
      'La hora real de registro solo se puede fijar al registrar a nombre de otra persona',
    )
  }
  const { teamId } = await validateCreateInputs(
    tx,
    resolved,
    requester.dependency_id,
  )
  const ticket = await insertTicket({
    tx,
    actor,
    input: resolved,
    requester,
    teamId,
    occurredAt,
  })
  return finalizeCreate({
    tx,
    actor,
    input,
    ticket,
    teamId,
    occurredAt,
    onBehalf,
  })
}

export async function createTicket(
  db: Database,
  actor: Actor,
  input: CreateTicketInput,
): Promise<CreateTicketResult> {
  assertCreateTime(actor, input.occurredAt)
  const occurredAt = input.occurredAt ?? new Date().toISOString()
  try {
    return await withOccurredAt(occurredAt, () =>
      db.transaction((tx) => createInTransaction(tx, actor, input, occurredAt)),
    )
  } catch (error) {
    if (!isUniqueViolation(error)) throw error
    const handled = await findHandledEvent(db, input.clientRequestId)
    if (handled?.type !== 'created') throw error
    const ticket = await ticketSummary(db, handled.ticketId)
    return {
      ticketId: ticket.id,
      folio: ticket.folio,
      possibleDuplicate: ticket.possible_duplicate,
      replayed: true,
    }
  }
}
