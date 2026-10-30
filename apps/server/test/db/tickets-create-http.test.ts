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

function ticketBody(overrides: Record<string, unknown> = {}) {
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
    description: 'Fuga de prueba en el baño',
    requesterId: refs.requesterId,
    requesterContact: 'Ext. 123',
    clientRequestId: randomUUID(),
    ...overrides,
  }
}

async function post(cookie: string, payload: Record<string, unknown>) {
  return context.app.inject({
    method: 'POST',
    url: '/api/tickets',
    headers: authHeaders(cookie),
    payload,
  })
}

beforeAll(async () => {
  context = await buildTicketHttpApp()
  refs = await loadWriteRefs(context)
}, 60_000)

afterAll(async () => {
  await closeTicketHttpApp(context)
})

describe('ticket creation', () => {
  it('creates a ticket as the linked requester and routes it', async () => {
    const response = await post(
      context.cookies.requester,
      ticketBody({ description: 'Fuga creada por el solicitante' }),
    )
    expect(response.statusCode).toBe(201)
    const body = response.json() as {
      ticket: { id: string; folio: string; possibleDuplicate: boolean }
      replayed: boolean
    }
    expect(body.replayed).toBe(false)
    expect(body.ticket.folio).toMatch(/^AX-/)

    const ticket = await context.db.execute(sql`
      select status, team_id, requester_id, possible_duplicate
      from public.tickets where id = ${body.ticket.id}
    `)
    expect(ticket.rows[0]).toMatchObject({
      status: 'registered',
      team_id: refs.teamId,
      requester_id: refs.requesterId,
    })

    const offers = await context.db.execute(sql`
      select supervisor_user_id, status
      from public.ticket_offers where ticket_id = ${body.ticket.id}
    `)
    expect(offers.rows.length).toBeGreaterThanOrEqual(1)
    expect(offers.rows).toEqual(
      expect.arrayContaining([expect.objectContaining({ status: 'offered' })]),
    )
  })

  it('allows an administrator to create on behalf of a requester', async () => {
    const response = await post(
      context.cookies.admin,
      ticketBody({ description: 'Alta a nombre de otro solicitante' }),
    )
    expect(response.statusCode).toBe(201)
  })

  it('rejects a technician creating on behalf without permission', async () => {
    const response = await post(context.cookies.technician, ticketBody())
    expect(response.statusCode).toBe(403)
  })

  it('validates the category and location', async () => {
    const invalidCategory = await post(
      context.cookies.requester,
      ticketBody({ categoryId: randomUUID() }),
    )
    expect(invalidCategory.statusCode).toBe(400)

    const invalidLocation = await post(
      context.cookies.requester,
      ticketBody({ locationId: randomUUID() }),
    )
    expect(invalidLocation.statusCode).toBe(400)
  })
})

describe('ticket duplicate detection', () => {
  it('marks a similar ticket as possible duplicate without blocking it', async () => {
    const description = 'Fuga idéntica en el mismo baño'
    const first = await post(
      context.cookies.requester,
      ticketBody({ description }),
    )
    expect(first.statusCode).toBe(201)
    const firstId = (first.json() as { ticket: { id: string } }).ticket.id

    const second = await post(
      context.cookies.requester,
      ticketBody({ description }),
    )
    expect(second.statusCode).toBe(201)
    const body = second.json() as {
      ticket: { id: string; possibleDuplicate: boolean }
    }
    expect(body.ticket.possibleDuplicate).toBe(true)

    const candidates = await context.db.execute(sql`
      select candidate_ticket_id, similarity
      from public.ticket_duplicate_candidates
      where ticket_id = ${body.ticket.id}
    `)
    expect(candidates.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ candidate_ticket_id: firstId }),
      ]),
    )
  })
})

describe('ticket creation idempotency', () => {
  it('returns the same ticket for a repeated key', async () => {
    const payload = ticketBody({ description: 'Alta idempotente' })
    const first = await post(context.cookies.requester, payload)
    const second = await post(context.cookies.requester, payload)
    expect(first.statusCode).toBe(201)
    expect(second.statusCode).toBe(200)
    const firstBody = first.json() as { ticket: { id: string } }
    const secondBody = second.json() as { ticket: { id: string } }
    expect(secondBody.ticket.id).toBe(firstBody.ticket.id)

    const events = await context.db.execute(sql`
      select count(*)::int as count from public.ticket_events
      where client_request_id = ${payload.clientRequestId}
    `)
    expect((events.rows[0] as { count: number }).count).toBe(1)
  })

  it('serializes concurrent requests with the same key', async () => {
    const payload = ticketBody({ description: 'Alta concurrente' })
    const [first, second] = await Promise.all([
      post(context.cookies.requester, payload),
      post(context.cookies.requester, payload),
    ])
    expect([first.statusCode, second.statusCode].sort()).toEqual([200, 201])
    const ids = [first, second].map(
      (response) => (response.json() as { ticket: { id: string } }).ticket.id,
    )
    expect(ids[0]).toBe(ids[1])

    const count = await context.db.execute(sql`
      select count(*)::int as count from public.tickets
      where description = 'Alta concurrente'
    `)
    expect((count.rows[0] as { count: number }).count).toBe(1)
  })
})
