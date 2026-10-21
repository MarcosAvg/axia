import { randomUUID } from 'node:crypto'

import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  authHeaders,
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'

let context: TicketHttpContext

function item(overrides: Record<string, unknown> = {}) {
  return {
    clientRequestId: randomUUID(),
    ticketId: context.ids.ticketA1,
    type: 'comment',
    args: { text: 'Comentario offline' },
    occurredAt: new Date().toISOString(),
    ...overrides,
  }
}

async function sync(cookie: string, items: Array<Record<string, unknown>>) {
  return context.app.inject({
    method: 'POST',
    url: '/api/sync/actions',
    headers: authHeaders(cookie),
    payload: { items },
  })
}

beforeAll(async () => {
  context = await buildTicketHttpApp()
}, 60_000)

afterAll(async () => {
  await closeTicketHttpApp(context)
})

describe('offline sync', () => {
  it('applies an action and records the client occurrence time', async () => {
    const occurredAt = new Date().toISOString()
    const payload = item({ occurredAt })
    const response = await sync(context.cookies.requester, [payload])
    expect(response.statusCode).toBe(200)
    const body = response.json() as {
      results: Array<{
        status: string
        eventId?: number
        currentState?: string
      }>
    }
    expect(body.results[0]).toMatchObject({
      status: 'applied',
      currentState: 'registered',
    })
    expect(body.results[0]?.eventId).toBeTruthy()

    const event = await context.db.execute(sql`
      select occurred_at from public.ticket_events
      where client_request_id = ${payload.clientRequestId}
    `)
    expect(
      new Date(
        (event.rows[0] as { occurred_at: Date | string }).occurred_at,
      ).toISOString(),
    ).toBe(occurredAt)
  })

  it('reports a repeated key as duplicate', async () => {
    const payload = item()
    await sync(context.cookies.requester, [payload])
    const response = await sync(context.cookies.requester, [payload])
    expect(
      (response.json() as { results: Array<{ status: string }> }).results[0]
        ?.status,
    ).toBe('duplicate')
  })
})

describe('offline sync validation', () => {
  it('blocks dependent actions after a conflict', async () => {
    const failed = item({
      type: 'start',
      args: {},
      clientRequestId: randomUUID(),
      ticketId: context.ids.ticketA1,
    })
    const dependent = item({ clientRequestId: randomUUID() })
    const response = await sync(context.cookies.technician, [failed, dependent])
    const results = (
      response.json() as {
        results: Array<{ status: string; blockedBy?: string }>
      }
    ).results
    expect(results[0]?.status).toBe('conflict')
    expect(results[1]?.status).toBe('blocked')
    expect(results[1]?.blockedBy).toBe(failed.clientRequestId)
  })

  it('rejects future and stale occurrence times', async () => {
    const future = await sync(context.cookies.requester, [
      item({
        ticketId: context.ids.ticketA2,
        occurredAt: new Date(Date.now() + 10 * 60_000).toISOString(),
      }),
    ])
    expect(
      (future.json() as { results: Array<{ status: string; code: string }> })
        .results[0],
    ).toMatchObject({ status: 'rejected', code: 'invalid_occurred_at' })

    const stale = await sync(context.cookies.requester, [
      item({
        ticketId: context.ids.ticketA2,
        occurredAt: new Date(Date.now() - 40 * 24 * 60 * 60_000).toISOString(),
      }),
    ])
    expect(
      (stale.json() as { results: Array<{ status: string; code: string }> })
        .results[0],
    ).toMatchObject({ status: 'rejected', code: 'invalid_occurred_at' })
  })

  it('rejects an action outside the actor scope', async () => {
    const response = await sync(context.cookies.outsider, [item()])
    expect(
      (response.json() as { results: Array<{ status: string }> }).results[0]
        ?.status,
    ).toBe('rejected')
  })
})
