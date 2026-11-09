import { randomUUID } from 'node:crypto'

import { sql } from 'drizzle-orm'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { cookieFrom, login } from './auth-helpers.js'
import {
  authHeaders,
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'
import { loadWriteRefs, type WriteRefs } from './tickets-write-helpers.js'

const PASSWORD = 'TicketPassword123!'

let context: TicketHttpContext
let refs: WriteRefs
let passwordHash: string

type AccountOptions = {
  username: string
  roles: Array<'requester' | 'supervisor' | 'technician' | 'administrator'>
  requester?: boolean
  technician?: boolean
  supervisorScope?: boolean
}

type Account = {
  userId: string
  requesterId?: string
  technicianId?: string
  cookie: string
}

async function createAccount(options: AccountOptions): Promise<Account> {
  const user = await context.db.execute(sql`
    insert into public.users (
      username, full_name, password_hash, must_change_password
    ) values (${options.username}, ${options.username}, ${passwordHash}, false)
    returning id
  `)
  const userId = (user.rows[0] as { id: string }).id

  for (const role of options.roles) {
    await context.db.execute(sql`
      insert into public.user_roles (user_id, role_id)
      select ${userId}, id from public.roles where name = ${role}
    `)
  }

  let requesterId: string | undefined
  if (options.requester) {
    const requester = await context.db.execute(sql`
      insert into public.requesters (full_name, user_id)
      values (${options.username}, ${userId})
      returning id
    `)
    requesterId = (requester.rows[0] as { id: string }).id
  }

  let technicianId: string | undefined
  if (options.technician) {
    const technician = await context.db.execute(sql`
      insert into public.technicians (full_name, user_id, team_id)
      values (${options.username}, ${userId}, ${context.catalog.teamA.id})
      returning id
    `)
    technicianId = (technician.rows[0] as { id: string }).id
    await context.db.execute(sql`
      insert into public.technician_categories (technician_id, category_id)
      values (${technicianId}, ${context.catalog.categoryA.id})
    `)
  }

  if (options.supervisorScope) {
    const scope = await context.db.execute(sql`
      insert into public.supervisor_scopes (user_id, team_id)
      values (${userId}, ${context.catalog.teamA.id})
      returning id
    `)
    const scopeId = (scope.rows[0] as { id: string }).id
    await context.db.execute(sql`
      insert into public.supervisor_scope_buildings (scope_id, building_id)
      values (${scopeId}, ${context.catalog.buildingA1.id})
    `)
  }

  const response = await login(context.app, options.username, PASSWORD)
  if (response.statusCode !== 200) {
    throw new Error(
      `Login failed for ${options.username}: ${response.statusCode}`,
    )
  }
  return {
    userId,
    requesterId,
    technicianId,
    cookie: cookieFrom(response),
  }
}

async function setPolicy(policy: 'requester' | 'supervisor' | 'both') {
  await context.db.execute(sql`
    update public.instance_settings set validation_policy = ${policy}
  `)
}

async function createTicket(cookie: string, requesterId: string) {
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
  expect(response.statusCode).toBe(201)
  return (response.json() as { ticket: { id: string } }).ticket.id
}

function action(
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

async function addEvidence(ticketId: string, type: 'before' | 'after') {
  await context.db.execute(sql`
    insert into public.evidence (
      ticket_id, cycle, type, captured_by_technician_id, processing_state
    ) values (${ticketId}, 1, ${type}, ${refs.technicianId}, 'ready')
  `)
}

async function attendedTicket(input: {
  creatorCookie: string
  requesterId: string
  supervisorCookie: string
  technicianId: string
  workerCookie: string
}): Promise<string> {
  const ticketId = await createTicket(input.creatorCookie, input.requesterId)
  const take = await action(input.supervisorCookie, ticketId, {
    action: 'take',
    clientRequestId: randomUUID(),
  })
  expect(take.statusCode).toBe(200)
  const assign = await action(input.supervisorCookie, ticketId, {
    action: 'assign_technician',
    technicianId: input.technicianId,
    clientRequestId: randomUUID(),
  })
  expect(assign.statusCode).toBe(200)
  await addEvidence(ticketId, 'before')
  const start = await action(input.workerCookie, ticketId, {
    action: 'start',
    clientRequestId: randomUUID(),
  })
  expect(start.statusCode).toBe(200)
  await addEvidence(ticketId, 'after')
  const attend = await action(input.workerCookie, ticketId, {
    action: 'attend',
    workDescription: 'Trabajo terminado',
    clientRequestId: randomUUID(),
  })
  expect(attend.statusCode).toBe(200)
  return ticketId
}

async function ticketStatus(ticketId: string): Promise<string> {
  const result = await context.db.execute(sql`
    select status from public.tickets where id = ${ticketId}
  `)
  return (result.rows[0] as { status: string }).status
}

async function ownAccount(): Promise<Account> {
  return createAccount({
    username: `multi-${randomUUID()}`,
    roles: ['requester', 'supervisor', 'technician'],
    requester: true,
    technician: true,
    supervisorScope: true,
  })
}

async function ownAttended(account: Account): Promise<string> {
  if (!account.requesterId || !account.technicianId) {
    throw new Error('The account needs requester and technician profiles')
  }
  return attendedTicket({
    creatorCookie: account.cookie,
    requesterId: account.requesterId,
    supervisorCookie: account.cookie,
    technicianId: account.technicianId,
    workerCookie: account.cookie,
  })
}

beforeAll(async () => {
  context = await buildTicketHttpApp()
  refs = await loadWriteRefs(context)
  const result = await context.db.execute(sql`
    select password_hash from public.users where username = 'requester-access'
  `)
  passwordHash = (result.rows[0] as { password_hash: string }).password_hash
})

afterEach(async () => {
  await setPolicy('both')
})

afterAll(async () => {
  await closeTicketHttpApp(context)
})

describe('validación por lado', () => {
  it('la misma cuenta valida los dos lados en política both y cierra', async () => {
    const account = await ownAccount()
    const ticketId = await ownAttended(account)

    const requester = await action(account.cookie, ticketId, {
      action: 'validate',
      role: 'requester',
      clientRequestId: randomUUID(),
    })
    const supervisor = await action(account.cookie, ticketId, {
      action: 'validate',
      role: 'supervisor',
      clientRequestId: randomUUID(),
    })

    expect(requester.statusCode).toBe(200)
    expect(supervisor.statusCode).toBe(200)
    expect(await ticketStatus(ticketId)).toBe('closed')
  })

  it('repetir un lado responde 409 y no cambia el estado', async () => {
    const account = await ownAccount()
    const ticketId = await ownAttended(account)

    const first = await action(account.cookie, ticketId, {
      action: 'validate',
      role: 'requester',
      clientRequestId: randomUUID(),
    })
    const second = await action(account.cookie, ticketId, {
      action: 'validate',
      role: 'requester',
      clientRequestId: randomUUID(),
    })

    expect(first.statusCode).toBe(200)
    expect(second.statusCode).toBe(409)
    expect(await ticketStatus(ticketId)).toBe('attended')
  })

  it('el lado del supervisor antes del solicitante responde 409', async () => {
    const account = await ownAccount()
    const ticketId = await ownAttended(account)

    const supervisor = await action(account.cookie, ticketId, {
      action: 'validate',
      role: 'supervisor',
      clientRequestId: randomUUID(),
    })

    expect(supervisor.statusCode).toBe(409)
    expect(await ticketStatus(ticketId)).toBe('attended')
  })

  it('la política supervisor registra solo el lado del supervisor', async () => {
    await setPolicy('supervisor')
    const account = await ownAccount()
    const ticketId = await ownAttended(account)

    const supervisor = await action(account.cookie, ticketId, {
      action: 'validate',
      role: 'supervisor',
      clientRequestId: randomUUID(),
    })
    const rows = await context.db.execute(sql`
      select validator_role from public.ticket_validations
      where ticket_id = ${ticketId}
    `)

    expect(supervisor.statusCode).toBe(200)
    expect(await ticketStatus(ticketId)).toBe('closed')
    expect(rows.rows).toEqual([{ validator_role: 'supervisor' }])
  })

  it('la política requester rechaza el lado del supervisor', async () => {
    await setPolicy('requester')
    const account = await ownAccount()
    const ticketId = await ownAttended(account)

    const rejected = await action(account.cookie, ticketId, {
      action: 'validate',
      role: 'supervisor',
      clientRequestId: randomUUID(),
    })
    const requester = await action(account.cookie, ticketId, {
      action: 'validate',
      role: 'requester',
      clientRequestId: randomUUID(),
    })

    expect(rejected.statusCode).toBe(403)
    expect(requester.statusCode).toBe(200)
    expect(await ticketStatus(ticketId)).toBe('closed')
  })

  it('una cuenta solo solicitante no puede validar el lado del supervisor', async () => {
    const requester = await createAccount({
      username: `requester-${randomUUID()}`,
      roles: ['requester'],
      requester: true,
    })
    if (!requester.requesterId) throw new Error('Missing requester')
    const ticketId = await attendedTicket({
      creatorCookie: requester.cookie,
      requesterId: requester.requesterId,
      supervisorCookie: context.cookies.supervisor,
      technicianId: refs.technicianId,
      workerCookie: context.cookies.technician,
    })

    const supervisor = await action(requester.cookie, ticketId, {
      action: 'validate',
      role: 'supervisor',
      clientRequestId: randomUUID(),
    })

    expect(supervisor.statusCode).toBe(403)
    expect(await ticketStatus(ticketId)).toBe('attended')
  })

  it('una cuenta solo supervisora valida el solicitante a nombre del solicitante', async () => {
    const ticketId = await attendedTicket({
      creatorCookie: context.cookies.requester,
      requesterId: refs.requesterId,
      supervisorCookie: context.cookies.supervisor,
      technicianId: refs.technicianId,
      workerCookie: context.cookies.technician,
    })

    const requester = await action(context.cookies.supervisor, ticketId, {
      action: 'validate',
      role: 'requester',
      subjectRequesterId: refs.requesterId,
      clientRequestId: randomUUID(),
    })
    const supervisor = await action(context.cookies.supervisor, ticketId, {
      action: 'validate',
      role: 'supervisor',
      clientRequestId: randomUUID(),
    })

    expect(requester.statusCode).toBe(200)
    expect(supervisor.statusCode).toBe(200)
    expect(await ticketStatus(ticketId)).toBe('closed')
  })

  it('la misma cuenta deja dos eventos y dos sujetos distintos', async () => {
    const account = await ownAccount()
    const ticketId = await ownAttended(account)

    await action(account.cookie, ticketId, {
      action: 'validate',
      role: 'requester',
      clientRequestId: randomUUID(),
    })
    await action(account.cookie, ticketId, {
      action: 'validate',
      role: 'supervisor',
      clientRequestId: randomUUID(),
    })

    const events = await context.db.execute(sql`
      select
        payload ->> 'role' as role,
        subject_requester_id,
        subject_user_id
      from public.ticket_events
      where ticket_id = ${ticketId} and type = 'validated'
      order by id
    `)

    expect(events.rows).toEqual([
      {
        role: 'requester',
        subject_requester_id: account.requesterId,
        subject_user_id: null,
      },
      {
        role: 'supervisor',
        subject_requester_id: null,
        subject_user_id: account.userId,
      },
    ])
  })

  it('repetir la misma petición es idempotente', async () => {
    const account = await ownAccount()
    const ticketId = await ownAttended(account)
    const clientRequestId = randomUUID()

    const first = await action(account.cookie, ticketId, {
      action: 'validate',
      role: 'requester',
      clientRequestId,
    })
    const replay = await action(account.cookie, ticketId, {
      action: 'validate',
      role: 'requester',
      clientRequestId,
    })
    const events = await context.db.execute(sql`
      select count(*)::int as total from public.ticket_events
      where ticket_id = ${ticketId} and client_request_id = ${clientRequestId}
    `)

    expect(first.statusCode).toBe(200)
    expect(replay.statusCode).toBe(200)
    expect((replay.json() as { replayed: boolean }).replayed).toBe(true)
    expect((events.rows[0] as { total: number }).total).toBe(1)
  })
})
