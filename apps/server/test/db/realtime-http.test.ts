import { randomUUID } from 'node:crypto'

import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { loadActor } from '../../src/auth/authorization.js'
import { createEventBridge } from '../../src/realtime/bridge.js'
import { createEventHub } from '../../src/realtime/hub.js'
import { ownerConnectionString } from './helpers.js'
import {
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'

let context: TicketHttpContext
let baseUrl: string

type ReadResult = Awaited<
  ReturnType<ReadableStreamDefaultReader<Uint8Array>['read']>
>

async function readWithTimeout(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  timeoutMs = 2_000,
) {
  return Promise.race([
    reader.read(),
    new Promise<ReadResult>((_, reject) => {
      setTimeout(() => reject(new Error('SSE read timeout')), timeoutMs)
    }),
  ])
}

async function get(path: string, cookie: string) {
  return fetch(`${baseUrl}${path}`, {
    headers: { Cookie: cookie },
  })
}

async function expectTicketStreamEvent(
  cookie: string,
  type: string,
  eventId: number,
) {
  const controller = new AbortController()
  const response = await fetch(`${baseUrl}/api/events`, {
    headers: { Cookie: cookie },
    signal: controller.signal,
  })
  expect(response.status).toBe(200)
  const reader = response.body?.getReader()
  expect(reader).toBeDefined()
  if (!reader) return

  const decoder = new TextDecoder()
  const first = await readWithTimeout(reader)
  expect(decoder.decode(first.value)).toContain('retry:')

  await context.events.publish({
    eventId,
    ticketId: context.ids.ticketA1,
    type,
    occurredAt: new Date().toISOString(),
  })

  let received = ''
  for (
    let index = 0;
    index < 5 && !received.includes('event: ticket');
    index += 1
  ) {
    const chunk = await readWithTimeout(reader)
    received += decoder.decode(chunk.value)
  }
  expect(received).toContain('event: ticket')
  expect(received).toContain(context.ids.ticketA1)

  controller.abort()
  await reader.cancel().catch(() => {})
}

beforeAll(async () => {
  context = await buildTicketHttpApp()
  baseUrl = await context.app.listen({ host: '127.0.0.1', port: 0 })
}, 60_000)

afterAll(async () => {
  await closeTicketHttpApp(context)
})

describe('SSE', () => {
  it('sends a visible ticket event', async () => {
    await expectTicketStreamEvent(
      context.cookies.technician,
      'created',
      999_999,
    )
  })

  it('sends requester-visible events to the requester', async () => {
    await expectTicketStreamEvent(context.cookies.requester, 'taken', 999_998)
  })

  it('returns only the events visible to the requester', async () => {
    const response = await get(
      '/api/events/changes?since=0',
      context.cookies.requester,
    )
    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      items: Array<{ type: string }>
    }
    expect(body.items.map((item) => item.type)).toEqual(['created'])

    const admin = await get(
      '/api/events/changes?since=0',
      context.cookies.admin,
    )
    const adminBody = (await admin.json()) as {
      items: Array<{ type: string }>
    }
    expect(adminBody.items.map((item) => item.type)).toEqual([
      'created',
      'comment',
    ])
  })

  it('keeps internal events for requesters without an account', async () => {
    await context.db.execute(sql`
      insert into public.ticket_events (
        ticket_id, cycle, type, actor_id, payload, client_request_id
      ) values (
        ${context.ids.ticketAux}, 1, 'comment', null,
        '{"text":"nota interna"}'::jsonb, ${randomUUID()}
      )
    `)

    const response = await get(
      '/api/events/changes?since=0',
      context.cookies.admin,
    )
    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      items: Array<{ ticketId: string; type: string }>
    }
    expect(
      body.items.some(
        (item) =>
          item.ticketId === context.ids.ticketAux && item.type === 'comment',
      ),
    ).toBe(true)
  })
})

describe('notifications', () => {
  it('lists, counts and marks in-app notifications', async () => {
    await context.db.execute(sql`
      insert into public.ticket_events (
        ticket_id, cycle, type, actor_id, payload, client_request_id
      ) values (
        ${context.ids.ticketA1}, 1, 'assigned_technician', null, '{}'::jsonb,
        ${randomUUID()}
      )
    `)

    const list = await get('/api/notifications', context.cookies.technician)
    expect(list.status).toBe(200)
    const body = (await list.json()) as {
      items: Array<{ id: string; type: string; ticketFolio: string | null }>
      unread: number
    }
    expect(body.items.some((item) => item.type === 'assigned_technician')).toBe(
      true,
    )
    expect(
      body.items.find((item) => item.type === 'assigned_technician')
        ?.ticketFolio,
    ).toBeTruthy()
    expect(body.unread).toBeGreaterThanOrEqual(1)
    const notificationId = body.items.find(
      (item) => item.type === 'assigned_technician',
    )?.id
    expect(notificationId).toBeTruthy()

    const read = await fetch(
      `${baseUrl}/api/notifications/${notificationId}/read`,
      {
        method: 'POST',
        headers: { Cookie: context.cookies.technician, Origin: baseUrl },
      },
    )
    expect(read.status).toBe(204)

    const count = await get(
      '/api/notifications/unread-count',
      context.cookies.technician,
    )
    expect((await count.json()) as { count: number }).toMatchObject({
      count: 0,
    })
  })

  it('does not show notifications to another actor', async () => {
    const response = await get('/api/notifications', context.cookies.noAccess)
    expect(response.status).toBe(403)
  })
})

describe('SSE session lifecycle', () => {
  it('closes the stream when a role changes', async () => {
    const controller = new AbortController()
    const response = await fetch(`${baseUrl}/api/events`, {
      headers: { Cookie: context.cookies.technician },
      signal: controller.signal,
    })
    const reader = response.body?.getReader()
    expect(reader).toBeDefined()
    if (!reader) return
    await readWithTimeout(reader)

    const target = await context.db.execute(sql`
      select u.id, r.id as role_id
      from public.users u
      cross join public.roles r
      where u.username = 'technician-access' and r.name = 'technician'
    `)
    const { id, role_id: roleId } = target.rows[0] as {
      id: string
      role_id: string
    }
    const updated = await fetch(`${baseUrl}/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: {
        Cookie: context.cookies.admin,
        Origin: baseUrl,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ roleIds: [roleId] }),
    })
    expect(updated.status).toBe(200)

    let closed = false
    for (let index = 0; index < 5 && !closed; index += 1) {
      const chunk = await readWithTimeout(reader)
      closed = chunk.done === true
    }
    expect(closed).toBe(true)
    controller.abort()
  })
})

describe('SSE session revocation', () => {
  it('closes the stream when the session is revoked', async () => {
    const controller = new AbortController()
    const response = await fetch(`${baseUrl}/api/events`, {
      headers: { Cookie: context.cookies.technician },
      signal: controller.signal,
    })
    expect(response.status).toBe(200)
    const reader = response.body?.getReader()
    expect(reader).toBeDefined()
    if (!reader) return

    await readWithTimeout(reader)

    const logout = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: context.cookies.technician, Origin: baseUrl },
    })
    expect(logout.status).toBe(204)

    let closed = false
    for (let index = 0; index < 5 && !closed; index += 1) {
      const chunk = await readWithTimeout(reader)
      closed = chunk.done === true
    }
    expect(closed).toBe(true)
    controller.abort()
  })
})

describe('LISTEN bridge', () => {
  it('receives ticket events through a dedicated connection', async () => {
    const technician = await context.db.execute(sql`
      select id from public.users where username = 'technician-access'
    `)
    const actor = await loadActor(
      context.db,
      (technician.rows[0] as { id: string }).id,
    )
    expect(actor).not.toBeNull()
    if (!actor) return

    const hub = createEventHub(context.db)
    const received: string[] = []
    hub.subscribe(
      actor,
      'test-session',
      (chunk) => received.push(chunk),
      () => {},
    )
    const bridge = createEventBridge(ownerConnectionString(), hub)
    await bridge.start()
    try {
      await context.db.execute(sql`
        insert into public.ticket_events (
          ticket_id, cycle, type, payload, client_request_id
        ) values (
          ${context.ids.ticketA1}, 1, 'created', '{}'::jsonb,
          ${randomUUID()}
        )
      `)
      for (
        let attempt = 0;
        attempt < 20 && received.length === 0;
        attempt += 1
      ) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
      expect(received.join('')).toContain(context.ids.ticketA1)
    } finally {
      await bridge.stop()
    }
  })
})
