import { randomUUID } from 'node:crypto'

import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  authHeaders,
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'
import {
  addSecondSupervisor,
  loadWriteRefs,
  type WriteRefs,
} from './tickets-write-helpers.js'

let context: TicketHttpContext
let refs: WriteRefs
let supervisorA2: string
let supervisorId: string

function ticketBody(clientRequestId = randomUUID()) {
  return {
    buildingId: refs.buildingId,
    locationId: refs.locationId,
    dependencyId: refs.dependencyId,
    categoryId: refs.categoryId,
    serviceTypeId: refs.serviceTypeId,
    priorityId: refs.priorityId,
    channelId: refs.channelId,
    description: `Tiquet de acciones ${clientRequestId}`,
    requesterId: refs.requesterId,
    clientRequestId,
  }
}

async function createTicket() {
  const response = await context.app.inject({
    method: 'POST',
    url: '/api/tickets',
    headers: authHeaders(context.cookies.requester),
    payload: ticketBody(),
  })
  expect(response.statusCode).toBe(201)
  return (response.json() as { ticket: { id: string } }).ticket.id
}

async function action(
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

async function take(
  ticketId: string,
  clientRequestId = randomUUID(),
  cookie = context.cookies.supervisor,
) {
  const response = await action(cookie, ticketId, {
    action: 'take',
    clientRequestId,
  })
  return { response, clientRequestId }
}

async function assign(
  ticketId: string,
  clientRequestId = randomUUID(),
  cookie = context.cookies.supervisor,
) {
  const response = await action(cookie, ticketId, {
    action: 'assign_technician',
    technicianId: refs.technicianId,
    clientRequestId,
  })
  return { response, clientRequestId }
}

beforeAll(async () => {
  context = await buildTicketHttpApp()
  refs = await loadWriteRefs(context)
  supervisorA2 = await addSecondSupervisor(context, refs)
  const supervisor = await context.db.execute(sql`
    select id from public.users where username = 'supervisor-access'
  `)
  supervisorId = (supervisor.rows[0] as { id: string }).id
}, 60_000)

afterAll(async () => {
  await closeTicketHttpApp(context)
})

describe('take ticket', () => {
  it('takes an offered ticket and withdraws the other offers', async () => {
    const ticketId = await createTicket()
    const { response } = await take(ticketId)
    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      ticketId,
      action: 'take',
      replayed: false,
    })

    const ticket = await context.db.execute(sql`
      select status from public.tickets where id = ${ticketId}
    `)
    expect((ticket.rows[0] as { status: string }).status).toBe(
      'with_supervisor',
    )
    const offers = await context.db.execute(sql`
      select supervisor_user_id, status
      from public.ticket_offers where ticket_id = ${ticketId}
    `)
    expect(offers.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          supervisor_user_id: supervisorId,
          status: 'taken',
        }),
        expect.objectContaining({ status: 'withdrawn' }),
      ]),
    )
  })
})

describe('take idempotency and concurrency', () => {
  it('replays a take with the same key', async () => {
    const ticketId = await createTicket()
    const first = await take(ticketId)
    expect(first.response.statusCode).toBe(200)
    const replay = await take(ticketId, first.clientRequestId)
    expect(replay.response.statusCode).toBe(200)
    expect(replay.response.json()).toMatchObject({ replayed: true })

    const assignments = await context.db.execute(sql`
      select count(*)::int as count from public.ticket_assignments
      where ticket_id = ${ticketId} and stage = 'supervisor' and ended_at is null
    `)
    expect((assignments.rows[0] as { count: number }).count).toBe(1)
  })

  it('rejects a second supervisor and an actor without take_offer', async () => {
    const ticketId = await createTicket()
    const first = await action(context.cookies.supervisor, ticketId, {
      action: 'take',
      clientRequestId: randomUUID(),
    })
    expect(first.statusCode).toBe(200)

    const second = await action(supervisorA2, ticketId, {
      action: 'take',
      clientRequestId: randomUUID(),
    })
    expect(second.statusCode).toBe(409)

    const technician = await action(context.cookies.technician, ticketId, {
      action: 'take',
      clientRequestId: randomUUID(),
    })
    expect(technician.statusCode).toBe(403)
  })

  it('lets only one of two concurrent supervisors take the ticket', async () => {
    const ticketId = await createTicket()
    const [first, second] = await Promise.all([
      action(context.cookies.supervisor, ticketId, {
        action: 'take',
        clientRequestId: randomUUID(),
      }),
      action(supervisorA2, ticketId, {
        action: 'take',
        clientRequestId: randomUUID(),
      }),
    ])
    expect([first.statusCode, second.statusCode].sort()).toEqual([200, 409])

    const assignments = await context.db.execute(sql`
      select count(*)::int as count from public.ticket_assignments
      where ticket_id = ${ticketId} and stage = 'supervisor' and ended_at is null
    `)
    expect((assignments.rows[0] as { count: number }).count).toBe(1)
  })
})

describe('assign technician', () => {
  it('assigns a technician after taking the ticket', async () => {
    const ticketId = await createTicket()
    await take(ticketId)
    const { response } = await assign(ticketId)
    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({
      action: 'assign_technician',
      replayed: false,
    })

    const ticket = await context.db.execute(sql`
      select status from public.tickets where id = ${ticketId}
    `)
    expect((ticket.rows[0] as { status: string }).status).toBe('assigned')

    const assignments = await context.db.execute(sql`
      select assignee_technician_id, ended_at
      from public.ticket_assignments
      where ticket_id = ${ticketId} and stage = 'technician'
    `)
    expect(assignments.rows).toEqual([
      expect.objectContaining({
        assignee_technician_id: refs.technicianId,
        ended_at: null,
      }),
    ])

    const participants = await context.db.execute(sql`
      select participation_type, ended_at
      from public.ticket_participants
      where ticket_id = ${ticketId} and technician_id = ${refs.technicianId}
    `)
    expect(participants.rows).toEqual([
      expect.objectContaining({
        participation_type: 'auxiliary',
        ended_at: null,
      }),
    ])
  })
})

describe('assign technician idempotency', () => {
  it('replays an assignment with the same key', async () => {
    const ticketId = await createTicket()
    await take(ticketId)
    const first = await assign(ticketId)
    expect(first.response.statusCode).toBe(200)
    const replay = await assign(ticketId, first.clientRequestId)
    expect(replay.response.statusCode).toBe(200)
    expect(replay.response.json()).toMatchObject({ replayed: true })
  })
})

describe('assign technician validation', () => {
  it('rejects an actor without assign_technician', async () => {
    const response = await action(
      context.cookies.technician,
      context.ids.ticketA1,
      {
        action: 'assign_technician',
        technicianId: refs.technicianId,
        clientRequestId: randomUUID(),
      },
    )
    expect(response.statusCode).toBe(403)
  })

  it('rejects reusing a key from another action', async () => {
    const clientRequestId = randomUUID()
    const createResponse = await context.app.inject({
      method: 'POST',
      url: '/api/tickets',
      headers: authHeaders(context.cookies.requester),
      payload: ticketBody(clientRequestId),
    })
    const ticketId = (createResponse.json() as { ticket: { id: string } })
      .ticket.id
    const response = await action(context.cookies.supervisor, ticketId, {
      action: 'take',
      clientRequestId,
    })
    expect(response.statusCode).toBe(409)
  })
})
