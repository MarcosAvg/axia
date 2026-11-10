import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { Client } from 'pg'
import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, expect, it } from 'vitest'

import { closedTicket } from './tickets-lifecycle-helpers.js'
import {
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'
import { ownerConnectionString } from './helpers.js'
import { loadWriteRefs, type WriteRefs } from './tickets-write-helpers.js'

let context: TicketHttpContext
let refs: WriteRefs

const migration = readFileSync(
  fileURLToPath(
    new URL('../../db/migrations/0050_time_backfill.sql', import.meta.url),
  ),
  'utf8',
)

beforeAll(async () => {
  context = await buildTicketHttpApp()
  refs = await loadWriteRefs(context)
}, 60_000)

afterAll(async () => {
  await closeTicketHttpApp(context)
})

async function runBackfill() {
  const client = new Client({ connectionString: ownerConnectionString() })
  await client.connect()
  try {
    await client.query(migration)
  } finally {
    await client.end()
  }
}

async function seedStaleData(): Promise<{
  ticketId: string
  terminalAt: string
}> {
  const calendar = await context.db.execute(sql`
    insert into public.work_calendars (name, timezone)
    values ('Calendario backfill', 'America/Mexico_City')
    returning id
  `)
  const calendarId = (calendar.rows[0] as { id: string }).id
  await context.db.execute(sql`
    update public.teams set work_calendar_id = ${calendarId}
    where id = ${refs.teamId}
  `)

  const ticketId = await closedTicket(context, refs)
  const terminal = await context.db.execute(sql`
    select occurred_at from public.ticket_events
    where ticket_id = ${ticketId}
      and type = 'validated'
      and coalesce(payload->>'partial', 'false') = 'false'
    order by occurred_at desc, id desc
    limit 1
  `)
  const terminalAt = new Date(
    (terminal.rows[0] as { occurred_at: Date | string }).occurred_at,
  ).toISOString()
  await context.db.execute(sql`
    update public.tickets
    set closed_at = ${terminalAt}::timestamptz + interval '1 hour'
    where id = ${ticketId}
  `)
  await context.db.execute(sql`
    update public.time_spans set work_calendar_id = null
    where ticket_id = ${ticketId}
  `)
  await context.db.execute(sql`
    insert into public.ticket_events (
      ticket_id, cycle, type, actor_id, occurred_at
    ) values (
      ${ticketId}, 1, 'comment', ${context.people.adminId}, now()
    )
  `)
  await context.db.execute(sql`
    update public.ticket_events set time_confidence = 'unverified'
    where ticket_id = ${ticketId} and type = 'comment'
  `)
  return { ticketId, terminalAt }
}

async function expectBackfilled(ticketId: string, terminalAt: string) {
  const ticket = await context.db.execute(sql`
    select closed_at from public.tickets where id = ${ticketId}
  `)
  expect(
    new Date(
      (ticket.rows[0] as { closed_at: Date | string }).closed_at,
    ).toISOString(),
  ).toBe(terminalAt)

  const coverage = await context.db.execute(sql`
    select delta from public.v_ticket_phase_coverage where id = ${ticketId}
  `)
  expect((coverage.rows[0] as { delta: string }).delta).toBe('00:00:00')

  const spans = await context.db.execute(sql`
    select count(*)::int as count from public.time_spans
    where ticket_id = ${ticketId} and work_calendar_id is null
  `)
  expect((spans.rows[0] as { count: number }).count).toBe(0)

  const unverified = await context.db.execute(sql`
    select time_confidence from public.ticket_events
    where ticket_id = ${ticketId} and type = 'comment'
  `)
  expect(
    (unverified.rows[0] as { time_confidence: string }).time_confidence,
  ).toBe('unverified')
}

it('repara el cierre, reconstruye tramos y completa el calendario inferido', async () => {
  const { ticketId, terminalAt } = await seedStaleData()
  await runBackfill()
  await expectBackfilled(ticketId, terminalAt)
})
