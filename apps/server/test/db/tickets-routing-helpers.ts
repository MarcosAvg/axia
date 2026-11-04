import { randomUUID } from 'node:crypto'

import { sql } from 'drizzle-orm'

import { authHeaders, type TicketHttpContext } from './tickets-http-helpers.js'
import type { WriteRefs } from './tickets-write-helpers.js'

export function routingTicketBody(refs: WriteRefs) {
  return {
    buildingId: refs.buildingId,
    locationId: refs.locationId,
    dependencyId: refs.dependencyId,
    categoryId: refs.categoryId,
    subcategoryId: refs.subcategoryId,
    problemId: refs.problemId,
    serviceTypeId: refs.serviceTypeId,
    priorityId: refs.priorityId,
    channelId: refs.channelId,
    description: `Tiquet de ruteo ${randomUUID()}`,
    requesterId: refs.requesterId,
    clientRequestId: randomUUID(),
  }
}

export async function createRoutingTicket(
  context: TicketHttpContext,
  refs: WriteRefs,
) {
  const response = await context.app.inject({
    method: 'POST',
    url: '/api/tickets',
    headers: authHeaders(context.cookies.requester),
    payload: routingTicketBody(refs),
  })
  if (response.statusCode !== 201) {
    throw new Error(`Ticket creation failed: ${response.statusCode}`)
  }
  return (response.json() as { ticket: { id: string } }).ticket.id
}

export function routingAction(
  context: TicketHttpContext,
  cookie: string,
  ticketId: string,
  payload: Record<string, unknown>,
) {
  return context.app.inject({
    method: 'POST',
    url: `/api/tickets/${ticketId}/actions`,
    headers: authHeaders(cookie),
    payload,
  })
}

export function reassignRoutingTicket(
  context: TicketHttpContext,
  input: {
    cookie: string
    ticketId: string
    reasonId: string
    destination: { teamId?: string; supervisorUserId?: string }
  },
) {
  return routingAction(context, input.cookie, input.ticketId, {
    action: 'assign_supervisor',
    reasonId: input.reasonId,
    clientRequestId: randomUUID(),
    ...input.destination,
  })
}

export async function idByUsername(
  context: TicketHttpContext,
  username: string,
): Promise<string> {
  const result = await context.db.execute(sql`
    select id from public.users where username = ${username}
  `)
  return (result.rows[0] as { id: string }).id
}

/** Supervisor con ámbito pero sin permisos para tomar o continuar tiquets. */
export async function addScopeOnlySupervisor(
  context: TicketHttpContext,
  refs: WriteRefs,
  username: string,
): Promise<string> {
  const user = await context.db.execute(sql`
    insert into public.users (username, full_name, password_hash)
    values (${username}, ${username}, 'x')
    returning id
  `)
  const userId = (user.rows[0] as { id: string }).id
  const scope = await context.db.execute(sql`
    insert into public.supervisor_scopes (user_id, team_id)
    values (${userId}, ${refs.teamId})
    returning id
  `)
  const scopeId = (scope.rows[0] as { id: string }).id
  await context.db.execute(sql`
    insert into public.supervisor_scope_buildings (scope_id, building_id)
    values (${scopeId}, ${refs.buildingId})
  `)
  return userId
}
