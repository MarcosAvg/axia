import type { InjectOptions } from 'fastify'
import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  authHeaders,
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'

let context: TicketHttpContext

function call(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  url: string,
  cookie: string,
  payload?: Record<string, unknown>,
) {
  const options: InjectOptions = {
    method,
    url,
    headers: authHeaders(cookie),
    ...(payload === undefined ? {} : { payload }),
  }
  return context.app.inject(options)
}

async function ticketReportedAt(id: string): Promise<string> {
  const detail = await call('GET', `/api/tickets/${id}`, context.cookies.admin)
  return (detail.json() as { ticket: { reportedAt: string } }).ticket.reportedAt
}

beforeAll(async () => {
  context = await buildTicketHttpApp()
}, 60_000)

afterAll(async () => {
  await closeTicketHttpApp(context)
})

describe('time span context and corrections', () => {
  it('detects the open span and replaces it without double counting', async () => {
    const id = context.ids.ticketA1
    const reportedAt = await ticketReportedAt(id)
    const inserted = await context.db.execute(sql`
      insert into public.time_spans (
        ticket_id, cycle, kind, started_at, origin
      ) values (${id}, 1, 'active_work', ${reportedAt}, 'system')
      returning id
    `)
    const originalId = (inserted.rows[0] as { id: string }).id

    const before = await call(
      'GET',
      `/api/tickets/${id}/manual-time`,
      context.cookies.admin,
    )
    const contextBefore = before.json() as {
      context: { current: { id: string } | null }
    }
    expect(contextBefore.context.current?.id).toBe(originalId)

    const corrected = await call(
      'POST',
      `/api/tickets/${id}/manual-time`,
      context.cookies.admin,
      {
        kind: 'active_work',
        clockClass: 'counted',
        startedAt: reportedAt,
        endedAt: new Date().toISOString(),
        replacesSpanId: originalId,
        clientRequestId: crypto.randomUUID(),
      },
    )
    expect(corrected.statusCode).toBe(204)

    const after = await call(
      'GET',
      `/api/tickets/${id}/manual-time`,
      context.cookies.admin,
    )
    const body = after.json() as {
      items: Array<{ replacesSpanId: string | null }>
      context: { current: unknown }
    }
    expect(body.context.current).toBeNull()
    expect(body.items[0]?.replacesSpanId).toBe(originalId)

    const original = await context.db.execute(sql`
      select voided_at from public.time_spans where id = ${originalId}
    `)
    expect(
      (original.rows[0] as { voided_at: Date | string | null }).voided_at,
    ).not.toBeNull()
  })
})

describe('manual time validation', () => {
  it('rejects future and overlapping manual spans', async () => {
    const id = context.ids.ticketA1
    const reportedAt = await ticketReportedAt(id)
    const startedAt = reportedAt
    const endedAt = new Date().toISOString()
    const future = await call(
      'POST',
      `/api/tickets/${id}/manual-time`,
      context.cookies.admin,
      {
        kind: 'pause',
        clockClass: 'counted',
        startedAt: new Date(Date.now() + 3_600_000).toISOString(),
        endedAt: new Date(Date.now() + 7_200_000).toISOString(),
        clientRequestId: crypto.randomUUID(),
      },
    )
    expect(future.statusCode).toBe(400)

    const first = await call(
      'POST',
      `/api/tickets/${id}/manual-time`,
      context.cookies.admin,
      {
        kind: 'pause',
        clockClass: 'counted',
        startedAt,
        endedAt,
        clientRequestId: crypto.randomUUID(),
      },
    )
    expect(first.statusCode).toBe(204)

    const overlap = await call(
      'POST',
      `/api/tickets/${id}/manual-time`,
      context.cookies.admin,
      {
        kind: 'pause',
        clockClass: 'counted',
        startedAt,
        endedAt,
        clientRequestId: crypto.randomUUID(),
      },
    )
    expect(overlap.statusCode).toBe(409)
  })
})
