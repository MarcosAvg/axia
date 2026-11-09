import { randomUUID } from 'node:crypto'

import { sql } from 'drizzle-orm'

import { cookieFrom, login } from './auth-helpers.js'
import {
  authHeaders,
  buildTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'
import { loadWriteRefs, type WriteRefs } from './tickets-write-helpers.js'

export const PASSWORD = 'TicketPassword123!'

export type AccountOptions = {
  username: string
  roles: Array<'requester' | 'supervisor' | 'technician' | 'administrator'>
  requester?: boolean
  technician?: boolean
  supervisorScope?: boolean
}

export type Account = {
  userId: string
  requesterId?: string
  technicianId?: string
  cookie: string
}

export async function setupValidationContext() {
  const context = await buildTicketHttpApp()
  const refs = await loadWriteRefs(context)
  const result = await context.db.execute(sql`
    select password_hash from public.users where username = 'requester-access'
  `)
  const passwordHash = (result.rows[0] as { password_hash: string })
    .password_hash
  return { context, refs, passwordHash }
}

async function createUser(
  context: TicketHttpContext,
  passwordHash: string,
  username: string,
): Promise<string> {
  const user = await context.db.execute(sql`
    insert into public.users (
      username, full_name, password_hash, must_change_password
    ) values (${username}, ${username}, ${passwordHash}, false)
    returning id
  `)
  return (user.rows[0] as { id: string }).id
}

async function addRoles(
  context: TicketHttpContext,
  userId: string,
  roles: AccountOptions['roles'],
) {
  for (const role of roles) {
    await context.db.execute(sql`
      insert into public.user_roles (user_id, role_id)
      select ${userId}, id from public.roles where name = ${role}
    `)
  }
}

async function addRequesterProfile(
  context: TicketHttpContext,
  username: string,
  userId: string,
): Promise<string> {
  const result = await context.db.execute(sql`
    insert into public.requesters (full_name, user_id)
    values (${username}, ${userId})
    returning id
  `)
  return (result.rows[0] as { id: string }).id
}

async function addTechnicianProfile(
  context: TicketHttpContext,
  username: string,
  userId: string,
): Promise<string> {
  const result = await context.db.execute(sql`
    insert into public.technicians (full_name, user_id, team_id)
    values (${username}, ${userId}, ${context.catalog.teamA.id})
    returning id
  `)
  const technicianId = (result.rows[0] as { id: string }).id
  await context.db.execute(sql`
    insert into public.technician_categories (technician_id, category_id)
    values (${technicianId}, ${context.catalog.categoryA.id})
  `)
  return technicianId
}

async function addSupervisorScope(
  context: TicketHttpContext,
  userId: string,
  teamId: string,
  buildingId: string,
) {
  const scope = await context.db.execute(sql`
    insert into public.supervisor_scopes (user_id, team_id)
    values (${userId}, ${teamId})
    returning id
  `)
  const scopeId = (scope.rows[0] as { id: string }).id
  await context.db.execute(sql`
    insert into public.supervisor_scope_buildings (scope_id, building_id)
    values (${scopeId}, ${buildingId})
  `)
}

export async function createAccount(
  context: TicketHttpContext,
  passwordHash: string,
  options: AccountOptions,
): Promise<Account> {
  const userId = await createUser(context, passwordHash, options.username)
  await addRoles(context, userId, options.roles)
  const requesterId = options.requester
    ? await addRequesterProfile(context, options.username, userId)
    : undefined
  const technicianId = options.technician
    ? await addTechnicianProfile(context, options.username, userId)
    : undefined
  if (options.supervisorScope) {
    await addSupervisorScope(
      context,
      userId,
      context.catalog.teamA.id,
      context.catalog.buildingA1.id,
    )
  }
  const response = await login(context.app, options.username, PASSWORD)
  if (response.statusCode !== 200) {
    throw new Error(
      `Login failed for ${options.username}: ${response.statusCode}`,
    )
  }
  return { userId, requesterId, technicianId, cookie: cookieFrom(response) }
}

export async function setPolicy(
  context: TicketHttpContext,
  policy: 'requester' | 'supervisor' | 'both',
) {
  await context.db.execute(sql`
    update public.instance_settings set validation_policy = ${policy}
  `)
}

export async function createTicket(
  context: TicketHttpContext,
  refs: WriteRefs,
  cookie: string,
  requesterId: string,
) {
  const response = await context.app.inject({
    method: 'POST',
    url: '/api/tickets',
    headers: authHeaders(cookie),
    payload: {
      buildingId: refs.buildingId,
      locationId: refs.locationId,
      dependencyId: refs.dependencyId,
      categoryId: refs.categoryId,
      subcategoryId: refs.subcategoryId,
      problemId: refs.problemId,
      serviceTypeId: refs.serviceTypeId,
      priorityId: refs.priorityId,
      channelId: refs.channelId,
      description: `Tiquet ${randomUUID()}`,
      requesterId,
      clientRequestId: randomUUID(),
    },
  })
  if (response.statusCode !== 201) {
    throw new Error(`Ticket creation failed: ${response.statusCode}`)
  }
  return (response.json() as { ticket: { id: string } }).ticket.id
}

export function action(
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

export async function addEvidence(
  context: TicketHttpContext,
  refs: WriteRefs,
  ticketId: string,
  type: 'before' | 'after',
) {
  await context.db.execute(sql`
    insert into public.evidence (
      ticket_id, cycle, type, captured_by_technician_id, processing_state
    ) values (${ticketId}, 1, ${type}, ${refs.technicianId}, 'ready')
  `)
}

export async function attendedTicket(
  context: TicketHttpContext,
  refs: WriteRefs,
  input: {
    creatorCookie: string
    requesterId: string
    supervisorCookie: string
    technicianId: string
    workerCookie: string
  },
): Promise<string> {
  const ticketId = await createTicket(
    context,
    refs,
    input.creatorCookie,
    input.requesterId,
  )
  const take = await action(context, input.supervisorCookie, ticketId, {
    action: 'take',
    clientRequestId: randomUUID(),
  })
  if (take.statusCode !== 200) throw new Error('Take failed')
  const assign = await action(context, input.supervisorCookie, ticketId, {
    action: 'assign_technician',
    technicianId: input.technicianId,
    clientRequestId: randomUUID(),
  })
  if (assign.statusCode !== 200) throw new Error('Assign failed')
  await addEvidence(context, refs, ticketId, 'before')
  const start = await action(context, input.workerCookie, ticketId, {
    action: 'start',
    clientRequestId: randomUUID(),
  })
  if (start.statusCode !== 200) throw new Error('Start failed')
  await addEvidence(context, refs, ticketId, 'after')
  const attend = await action(context, input.workerCookie, ticketId, {
    action: 'attend',
    workDescription: 'Trabajo terminado',
    clientRequestId: randomUUID(),
  })
  if (attend.statusCode !== 200) throw new Error('Attend failed')
  return ticketId
}

export async function ownAccount(
  context: TicketHttpContext,
  passwordHash: string,
): Promise<Account> {
  return createAccount(context, passwordHash, {
    username: `multi-${randomUUID()}`,
    roles: ['requester', 'supervisor', 'technician'],
    requester: true,
    technician: true,
    supervisorScope: true,
  })
}

export async function ownAttended(
  context: TicketHttpContext,
  refs: WriteRefs,
  account: Account,
): Promise<string> {
  if (!account.requesterId || !account.technicianId) {
    throw new Error('The account needs requester and technician profiles')
  }
  return attendedTicket(context, refs, {
    creatorCookie: account.cookie,
    requesterId: account.requesterId,
    supervisorCookie: account.cookie,
    technicianId: account.technicianId,
    workerCookie: account.cookie,
  })
}

export async function ticketDetail(
  context: TicketHttpContext,
  cookie: string,
  ticketId: string,
): Promise<Record<string, unknown>> {
  const response = await context.app.inject({
    method: 'GET',
    url: `/api/tickets/${ticketId}`,
    headers: authHeaders(cookie),
  })
  if (response.statusCode !== 200) throw new Error('Detail failed')
  return (response.json() as { ticket: Record<string, unknown> }).ticket
}

export async function ticketStatus(
  context: TicketHttpContext,
  ticketId: string,
): Promise<string> {
  const result = await context.db.execute(sql`
    select status from public.tickets where id = ${ticketId}
  `)
  return (result.rows[0] as { status: string }).status
}
