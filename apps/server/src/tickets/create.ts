import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import { can as hasPermission } from '../auth/authorization.js'
import {
  writeAttachmentEvent,
  type LinkedAttachment,
} from '../attachments/link.js'
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
import { linkRequiredAttachment } from './create-attachment.js'
import type { DbExecutor } from './db.js'
import { detectAndStoreDuplicates } from './duplicates.js'
import { withActionContext } from './event-context.js'
import { findHandledEvent, isUniqueViolation, writeEvent } from './events.js'
import { routeTicket } from './routing.js'

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
  occurredAt: string | null
}

async function insertTicket({
  tx,
  actor,
  input,
  requester,
  teamId,
  occurredAt,
}: InsertTicketInput): Promise<{
  id: string
  cycle: number
  reportedAt: string
}> {
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
      ${actor.id}, ${teamId}, coalesce(${occurredAt}::timestamptz, now())
    )
    returning id, cycle, reported_at
  `)
  const ticket = inserted.rows[0] as
    { id: string; cycle: number; reported_at: Date | string } | undefined
  if (!ticket) throw new Error('The ticket could not be created')
  return {
    id: ticket.id,
    cycle: ticket.cycle,
    reportedAt: new Date(ticket.reported_at).toISOString(),
  }
}

type FinalizeCreate = {
  tx: DbExecutor
  actor: Actor
  input: CreateTicketInput
  ticket: { id: string; cycle: number; reportedAt: string }
  teamId: string
  onBehalf: boolean
  linkedAttachment: LinkedAttachment | null
}

async function finalizeCreate({
  tx,
  actor,
  input,
  ticket,
  teamId,
  onBehalf,
  linkedAttachment,
}: FinalizeCreate): Promise<CreateTicketResult> {
  await writeEvent(tx, {
    ticketId: ticket.id,
    type: 'created',
    actorId: actor.id,
    clientRequestId: input.clientRequestId,
    subjectRequesterId: input.requesterId,
    occurredAt: ticket.reportedAt,
    payload: { onBehalf },
  })
  if (linkedAttachment) {
    await writeAttachmentEvent(tx, actor, ticket.id, linkedAttachment)
  }
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
      reportedAt: ticket.reportedAt,
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
  occurredAt: string | null,
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
  const linkedAttachment = await linkRequiredAttachment({
    tx,
    actor,
    ticketId: ticket.id,
    problemId: resolved.problemId,
    attachmentId: input.attachmentId,
  })
  return finalizeCreate({
    tx,
    actor,
    input,
    ticket,
    teamId,
    onBehalf,
    linkedAttachment,
  })
}

export async function createTicket(
  db: Database,
  actor: Actor,
  input: CreateTicketInput,
): Promise<CreateTicketResult> {
  assertCreateTime(actor, input.occurredAt)
  const occurredAt = input.occurredAt ?? null
  try {
    return await withActionContext(
      {
        occurredAt,
        clientReportedAt: null,
        timeConfidence: occurredAt ? 'corrected' : 'trusted',
        clientClockSkewMs: null,
        timeAlertKind: null,
        suggestedOccurredAt: null,
      },
      () =>
        db.transaction((tx) =>
          createInTransaction(tx, actor, input, occurredAt),
        ),
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
