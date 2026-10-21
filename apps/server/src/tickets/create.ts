import { sql } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import { can as hasPermission } from '../auth/authorization.js'
import type { Database } from '../db/client.js'
import { AppError } from '../http/errors.js'
import {
  loadRequester,
  validateCreateInputs,
  type CategoryRow,
  type RequesterRow,
} from './create-validation.js'
import type {
  CreateTicketInput,
  CreateTicketResult,
  TicketSummaryRow,
} from './create-types.js'
import type { DbExecutor } from './db.js'
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

type RouteInput = {
  tx: DbExecutor
  ticketId: string
  cycle: number
  teamId: string
  buildingId: string
}

async function routeTicket({
  tx,
  ticketId,
  cycle,
  teamId,
  buildingId,
}: RouteInput) {
  await tx.execute(sql`
    insert into public.ticket_offers (ticket_id, cycle, supervisor_user_id)
    select ${ticketId}, ${cycle}, ss.user_id
    from public.supervisor_scopes ss
    join public.supervisor_scope_buildings ssb on ssb.scope_id = ss.id
    join public.users u on u.id = ss.user_id and u.active
    where ss.team_id = ${teamId}
      and ssb.building_id = ${buildingId}
      and ss.active
    on conflict do nothing
  `)
}

async function detectDuplicates(
  tx: DbExecutor,
  ticketId: string,
  input: CreateTicketInput,
): Promise<TicketSummaryRow> {
  await tx.execute(sql`
    insert into public.ticket_duplicate_candidates (
      ticket_id, candidate_ticket_id, similarity
    )
    select
      ${ticketId},
      t.id,
      extensions.similarity(t.description, ${input.description})
    from public.tickets t
    where t.id <> ${ticketId}
      and t.status not in ('closed', 'rejected', 'cancelled', 'duplicate')
      and t.building_id = ${input.buildingId}
      and (
        t.problem_id is not distinct from ${input.problemId ?? null}
        or t.category_id = ${input.categoryId}
      )
      and t.reported_at > now() - (
        select duplicate_window from public.instance_settings limit 1
      )
      and extensions.similarity(t.description, ${input.description}) >= (
        select duplicate_similarity from public.instance_settings limit 1
      )
    on conflict do nothing
  `)

  const updated = await tx.execute(sql`
    update public.tickets
    set possible_duplicate = exists (
      select 1 from public.ticket_duplicate_candidates c
      where c.ticket_id = ${ticketId}
    )
    where id = ${ticketId}
    returning id, folio, possible_duplicate
  `)
  return updated.rows[0] as TicketSummaryRow
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
  input: CreateTicketInput
  requester: RequesterRow
  category: CategoryRow
}

async function insertTicket({
  tx,
  actor,
  input,
  requester,
  category,
}: InsertTicketInput): Promise<{ id: string; cycle: number }> {
  const inserted = await tx.execute(sql`
    insert into public.tickets (
      building_id, location_id, dependency_id, category_id, subcategory_id,
      problem_id, service_type_id, priority_id, channel_id, description,
      requester_id, requester_name, requester_contact, registered_by, team_id
    ) values (
      ${input.buildingId}, ${input.locationId}, ${input.dependencyId},
      ${input.categoryId}, ${input.subcategoryId ?? null},
      ${input.problemId ?? null}, ${input.serviceTypeId}, ${input.priorityId},
      ${input.channelId}, ${input.description}, ${requester.id},
      ${input.requesterName ?? requester.full_name},
      ${input.requesterContact ?? requester.contact},
      ${actor.id}, ${category.team_id}
    )
    returning id, cycle
  `)
  const ticket = inserted.rows[0] as { id: string; cycle: number } | undefined
  if (!ticket) throw new Error('The ticket could not be created')
  return ticket
}

async function createInTransaction(
  tx: DbExecutor,
  actor: Actor,
  input: CreateTicketInput,
): Promise<CreateTicketResult> {
  const handled = await findHandledEvent(tx, input.clientRequestId)
  if (handled) {
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

  const { requester, onBehalf } = await authorizeRequester(tx, actor, input)
  const category = await validateCreateInputs(tx, input)
  const ticket = await insertTicket({
    tx,
    actor,
    input,
    requester,
    category,
  })
  await writeEvent(tx, {
    ticketId: ticket.id,
    type: 'created',
    actorId: actor.id,
    clientRequestId: input.clientRequestId,
    payload: { onBehalf },
  })
  await routeTicket({
    tx,
    ticketId: ticket.id,
    cycle: ticket.cycle,
    teamId: category.team_id,
    buildingId: input.buildingId,
  })
  const summary = await detectDuplicates(tx, ticket.id, input)
  return {
    ticketId: summary.id,
    folio: summary.folio,
    possibleDuplicate: summary.possible_duplicate,
    replayed: false,
  }
}

export async function createTicket(
  db: Database,
  actor: Actor,
  input: CreateTicketInput,
): Promise<CreateTicketResult> {
  try {
    return await db.transaction((tx) => createInTransaction(tx, actor, input))
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
