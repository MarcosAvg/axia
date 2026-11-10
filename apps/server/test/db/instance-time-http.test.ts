import { randomUUID } from 'node:crypto'

import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, expect, it } from 'vitest'

import { parseInstanceWallClock } from '../../src/tickets/instance-time.js'
import {
  action,
  addEvidence,
  createTicket,
  takeAndAssign,
  ticketBody,
} from './tickets-lifecycle-helpers.js'
import {
  authHeaders,
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'
import { loadWriteRefs, type WriteRefs } from './tickets-write-helpers.js'

let context: TicketHttpContext
let refs: WriteRefs

const TIMEZONE = 'America/Mexico_City'

function wallClock(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso))
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''
  return `${value('year')}-${value('month')}-${value('day')}T${value('hour')}:${value('minute')}`
}

async function setTimezone(timezone: string) {
  await context.db.execute(sql`
    update public.instance_settings set timezone = ${timezone}
  `)
}

beforeAll(async () => {
  context = await buildTicketHttpApp()
  refs = await loadWriteRefs(context)
  await setTimezone(TIMEZONE)
}, 60_000)

afterAll(async () => {
  await closeTicketHttpApp(context)
})

it('interpreta la hora de pared en la zona de la instancia', async () => {
  const date = await parseInstanceWallClock(context.db, '2026-11-10T14:30')
  expect(date.toISOString()).toBe('2026-11-10T20:30:00.000Z')
})

it('rechaza una hora inexistente en el cambio de horario', async () => {
  await setTimezone('America/New_York')
  await expect(
    parseInstanceWallClock(context.db, '2026-03-08T02:30'),
  ).rejects.toMatchObject({ statusCode: 400 })
  await setTimezone(TIMEZONE)
})

it('registra el alta a nombre de otra persona con hora de pared', async () => {
  const requester = await context.db.execute(sql`
    select id from public.requesters
    where full_name = 'Solicitante sin cuenta'
    limit 1
  `)
  const requesterId = (requester.rows[0] as { id: string }).id
  const target = new Date(Date.now() - 2 * 60 * 60 * 1000)
  target.setSeconds(0, 0)
  const occurredLocal = wallClock(target.toISOString())

  const response = await context.app.inject({
    method: 'POST',
    url: '/api/tickets',
    headers: authHeaders(context.cookies.admin),
    payload: {
      ...ticketBody(refs),
      requesterId,
      occurredLocal,
      clientRequestId: randomUUID(),
    },
  })
  expect(response.statusCode).toBe(201)
  const ticketId = (response.json() as { ticket: { id: string } }).ticket.id

  const row = await context.db.execute(sql`
    select reported_at from public.tickets where id = ${ticketId}
  `)
  expect(
    new Date(
      (row.rows[0] as { reported_at: Date | string }).reported_at,
    ).toISOString(),
  ).toBe(target.toISOString())
})

it('aplica la hora de pared a una acción de proxy', async () => {
  const ticketId = await createTicket(context, refs)
  await takeAndAssign(context, refs, ticketId)
  await addEvidence(context, refs, ticketId, 'before')

  const past = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
  await context.db.execute(sql`
    update public.tickets set reported_at = ${past} where id = ${ticketId}
  `)
  await context.db.execute(sql`
    update public.ticket_events set occurred_at = ${past}
    where ticket_id = ${ticketId}
  `)

  const target = new Date(Date.now() - 60 * 60 * 1000)
  target.setSeconds(0, 0)
  const response = await action(context, context.cookies.admin, ticketId, {
    action: 'start',
    subjectTechnicianId: refs.technicianId,
    occurredLocal: wallClock(target.toISOString()),
    clientRequestId: randomUUID(),
  })
  expect(response.statusCode).toBe(200)

  const event = await context.db.execute(sql`
    select occurred_at from public.ticket_events
    where ticket_id = ${ticketId} and type = 'started'
  `)
  expect(
    new Date(
      (event.rows[0] as { occurred_at: Date | string }).occurred_at,
    ).toISOString(),
  ).toBe(target.toISOString())
})
