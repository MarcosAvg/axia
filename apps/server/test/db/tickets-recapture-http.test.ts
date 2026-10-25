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

describe('recapture nullable fields', () => {
  it('clears a subcategory and problem with explicit nulls', async () => {
    const ticketId = await createTicket()
    const subcategory = await context.db.execute(sql`
      insert into public.subcategories (category_id, name)
      values (${refs.categoryId}, 'Subcategoría A') returning id
    `)
    const subcategoryId = (subcategory.rows[0] as { id: string }).id
    const problem = await context.db.execute(sql`
      insert into public.problems (subcategory_id, name)
      values (${subcategoryId}, 'Problema A') returning id
    `)
    const problemId = (problem.rows[0] as { id: string }).id
    await context.db.execute(sql`
      update public.tickets
      set subcategory_id = ${subcategoryId}, problem_id = ${problemId}
      where id = ${ticketId}
    `)

    const response = await action(context.cookies.supervisor, ticketId, {
      action: 'recapture',
      changes: { subcategoryId: null, problemId: null },
      reasonId: recaptureReason,
      clientRequestId: randomUUID(),
    })
    expect(response.statusCode).toBe(200)

    const ticket = await context.db.execute(sql`
      select subcategory_id, problem_id
      from public.tickets where id = ${ticketId}
    `)
    expect(ticket.rows[0]).toMatchObject({
      subcategory_id: null,
      problem_id: null,
    })
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
    const other = await context.db.execute(sql`
      select id from public.categories where name = 'Categoría B'
    `)
    const categoryB = (other.rows[0] as { id: string }).id
    const subcategory = await context.db.execute(sql`
      insert into public.subcategories (category_id, name)
      values (${categoryB}, 'Subcategoría B') returning id
    `)
    const subcategoryId = (subcategory.rows[0] as { id: string }).id

    const response = await action(context.cookies.supervisor, ticketId, {
      action: 'recapture',
      changes: {
        subcategoryId,
        description: 'Subcategoría cruzada',
      },
      reasonId: recaptureReason,
      clientRequestId: randomUUID(),
    })
    expect(response.statusCode).toBe(400)
  })
})
