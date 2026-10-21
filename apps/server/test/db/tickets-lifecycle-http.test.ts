import { randomUUID } from 'node:crypto'

import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  authHeaders,
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'
import { loadWriteRefs, type WriteRefs } from './tickets-write-helpers.js'

let context: TicketHttpContext
let refs: WriteRefs

function ticketBody() {
  return {
    buildingId: refs.buildingId,
    locationId: refs.locationId,
    dependencyId: refs.dependencyId,
    categoryId: refs.categoryId,
    serviceTypeId: refs.serviceTypeId,
    priorityId: refs.priorityId,
    channelId: refs.channelId,
    description: 'Tiquet para probar el ciclo de vida',
    requesterId: refs.requesterId,
    clientRequestId: randomUUID(),
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

async function takeAndAssign(ticketId: string) {
  const take = await action(context.cookies.supervisor, ticketId, {
    action: 'take',
    clientRequestId: randomUUID(),
  })
  expect(take.statusCode).toBe(200)
  const assign = await action(context.cookies.supervisor, ticketId, {
    action: 'assign_technician',
    technicianId: refs.technicianId,
    clientRequestId: randomUUID(),
  })
  expect(assign.statusCode).toBe(200)
}

async function addEvidence(ticketId: string, type: 'before' | 'after') {
  await context.db.execute(sql`
    insert into public.evidence (
      ticket_id, cycle, type, captured_by_technician_id, processing_state
    ) values (${ticketId}, 1, ${type}, ${refs.technicianId}, 'ready')
  `)
}

beforeAll(async () => {
  context = await buildTicketHttpApp()
  refs = await loadWriteRefs(context)
}, 60_000)

afterAll(async () => {
  await closeTicketHttpApp(context)
})

describe('start and attend', () => {
  it('requires evidence for start and attend', async () => {
    const ticketId = await createTicket()
    await takeAndAssign(ticketId)

    const start = await action(context.cookies.technician, ticketId, {
      action: 'start',
      clientRequestId: randomUUID(),
    })
    expect(start.statusCode).toBe(409)

    await addEvidence(ticketId, 'before')
    const started = await action(context.cookies.technician, ticketId, {
      action: 'start',
      clientRequestId: randomUUID(),
    })
    expect(started.statusCode).toBe(200)

    const attend = await action(context.cookies.technician, ticketId, {
      action: 'attend',
      workDescription: 'Se reparó la fuga',
      clientRequestId: randomUUID(),
    })
    expect(attend.statusCode).toBe(409)

    await addEvidence(ticketId, 'after')
    const attended = await action(context.cookies.technician, ticketId, {
      action: 'attend',
      workDescription: 'Se reparó la fuga',
      clientRequestId: randomUUID(),
    })
    expect(attended.statusCode).toBe(200)

    const ticket = await context.db.execute(sql`
      select status from public.tickets where id = ${ticketId}
    `)
    expect((ticket.rows[0] as { status: string }).status).toBe('attended')
  })

  it('rejects start on a ticket that is not assigned', async () => {
    const ticketId = await createTicket()
    const response = await action(context.cookies.technician, ticketId, {
      action: 'start',
      clientRequestId: randomUUID(),
    })
    expect(response.statusCode).toBe(404)
  })
})

describe('validation policy', () => {
  it('closes only after both requester and supervisor validate', async () => {
    const ticketId = await createTicket()
    await takeAndAssign(ticketId)
    await addEvidence(ticketId, 'before')
    await action(context.cookies.technician, ticketId, {
      action: 'start',
      clientRequestId: randomUUID(),
    })
    await addEvidence(ticketId, 'after')
    await action(context.cookies.technician, ticketId, {
      action: 'attend',
      workDescription: 'Trabajo terminado',
      clientRequestId: randomUUID(),
    })

    const requester = await action(context.cookies.requester, ticketId, {
      action: 'validate',
      clientRequestId: randomUUID(),
    })
    expect(requester.statusCode).toBe(200)
    const partial = await context.db.execute(sql`
      select status from public.tickets where id = ${ticketId}
    `)
    expect((partial.rows[0] as { status: string }).status).toBe('attended')

    const supervisor = await action(context.cookies.supervisor, ticketId, {
      action: 'validate',
      clientRequestId: randomUUID(),
    })
    expect(supervisor.statusCode).toBe(200)
    const closed = await context.db.execute(sql`
      select status, closed_at from public.tickets where id = ${ticketId}
    `)
    expect(closed.rows[0]).toMatchObject({ status: 'closed' })
    expect(
      (closed.rows[0] as { closed_at: Date | null }).closed_at,
    ).not.toBeNull()
  })
})
