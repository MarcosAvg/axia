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

beforeAll(async () => {
  context = await buildTicketHttpApp()
}, 60_000)

afterAll(async () => {
  await closeTicketHttpApp(context)
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
