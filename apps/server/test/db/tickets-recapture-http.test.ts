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
let recaptureReason: string

function ticketBody() {
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
    description: `Tiquet de recaptura ${randomUUID()}`,
    requesterId: refs.requesterId,
    clientRequestId: randomUUID(),
  }
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

beforeAll(async () => {
  context = await buildTicketHttpApp()
  refs = await loadWriteRefs(context)
  const reason = await context.db.execute(sql`
    insert into public.reasons (use, name)
    values ('recapture', 'Recaptura de prueba') returning id
  `)
  recaptureReason = (reason.rows[0] as { id: string }).id
}, 60_000)

afterAll(async () => {
  await closeTicketHttpApp(context)
})

describe('recapture classification', () => {
  it('rejects clearing the problem', async () => {
    const ticketId = await createTicket()

    const response = await action(context.cookies.supervisor, ticketId, {
      action: 'recapture',
      changes: { subcategoryId: null, problemId: null },
      reasonId: recaptureReason,
      clientRequestId: randomUUID(),
    })
    expect(response.statusCode).toBe(400)
  })
})

describe('recapture catalog integrity', () => {
  it('rejects a location from another building', async () => {
    const ticketId = await createTicket()
    const other = await context.db.execute(sql`
      select id from public.buildings where name = 'Edificio B1'
    `)
    const buildingB1 = (other.rows[0] as { id: string }).id

    const response = await action(context.cookies.supervisor, ticketId, {
      action: 'recapture',
      changes: {
        buildingId: buildingB1,
        locationId: refs.locationId,
        description: 'Ubicación cruzada',
      },
      reasonId: recaptureReason,
      clientRequestId: randomUUID(),
    })
    expect(response.statusCode).toBe(400)
  })

  it('rejects a subcategory from another category', async () => {
    const ticketId = await createTicket()

    const response = await action(context.cookies.supervisor, ticketId, {
      action: 'recapture',
      changes: {
        subcategoryId: refs.subcategoryIdB,
        description: 'Subcategoría cruzada',
      },
      reasonId: recaptureReason,
      clientRequestId: randomUUID(),
    })
    expect(response.statusCode).toBe(400)
  })
})
