import { randomUUID } from 'node:crypto'

import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, expect, it } from 'vitest'

import {
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'
import {
  action,
  addEvidence,
  createTicket,
  takeAndAssign,
} from './tickets-lifecycle-helpers.js'
import { loadWriteRefs, type WriteRefs } from './tickets-write-helpers.js'

let context: TicketHttpContext
let refs: WriteRefs
let timeZone: string

beforeAll(async () => {
  context = await buildTicketHttpApp()
  refs = await loadWriteRefs(context)
  const settings = await context.db.execute(sql`
    select timezone from public.instance_settings limit 1
  `)
  timeZone = (settings.rows[0] as { timezone: string }).timezone
}, 60_000)

afterAll(async () => {
  await closeTicketHttpApp(context)
})

function wallClockAt(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => {
      acc[part.type] = part.value
      return acc
    }, {})
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

/** Siguiente minuto de pared de la instancia, dentro de la tolerancia. */
function nextMinute(): { wallClock: string; instant: Date } {
  const instant = new Date(Math.ceil((Date.now() + 1) / 60_000) * 60_000)
  return { wallClock: wallClockAt(instant), instant }
}

function timestamp(value: Date | string): string {
  return new Date(value).toISOString()
}

async function startWork(): Promise<string> {
  const ticketId = await createTicket(context, refs)
  await takeAndAssign(context, refs, ticketId)
  await addEvidence(context, refs, ticketId, 'before')
  await action(context, context.cookies.technician, ticketId, {
    action: 'start',
    clientRequestId: randomUUID(),
  })
  return ticketId
}

async function manualAction(
  ticketId: string,
  payload: Record<string, unknown>,
  wallClock: string,
) {
  return action(context, context.cookies.admin, ticketId, {
    ...payload,
    subjectTechnicianId: refs.technicianId,
    occurredLocal: wallClock,
    clientRequestId: randomUUID(),
  })
}

async function openPauseRow(ticketId: string): Promise<{
  id: string
  openedAt: string
}> {
  const result = await context.db.execute(sql`
    select id, opened_at from public.ticket_pauses
    where ticket_id = ${ticketId}
    order by opened_at desc
    limit 1
  `)
  const row = result.rows[0] as { id: string; opened_at: Date | string }
  return { id: row.id, openedAt: timestamp(row.opened_at) }
}

async function eventTime(ticketId: string, type: string): Promise<string> {
  const result = await context.db.execute(sql`
    select occurred_at from public.ticket_events
    where ticket_id = ${ticketId} and type = ${type}
    order by occurred_at desc, id desc
    limit 1
  `)
  return timestamp(
    (result.rows[0] as { occurred_at: Date | string }).occurred_at,
  )
}

async function pauseDescendant(): Promise<string> {
  const result = await context.db.execute(sql`
    select id from public.reasons
    where use = 'pause' and parent_id = ${refs.pauseReasonId}
    order by name
    limit 1
  `)
  return (result.rows[0] as { id: string }).id
}

async function expectStepTimes(pauseId: string, expected: string) {
  const result = await context.db.execute(sql`
    select entered_at, exited_at from public.ticket_pause_steps
    where pause_id = ${pauseId}
    order by entered_at, reason_id
  `)
  const steps = result.rows as Array<{
    entered_at: Date | string
    exited_at: Date | string | null
  }>
  expect(steps.length).toBeGreaterThan(0)
  for (const step of steps) {
    expect(timestamp(step.entered_at)).toBe(expected)
    if (step.exited_at) expect(timestamp(step.exited_at)).toBe(expected)
  }
}

it('escribe la pausa y sus pasos con la hora manual de la acción', async () => {
  const ticketId = await startWork()
  const { wallClock, instant } = nextMinute()
  const expected = instant.toISOString()

  const paused = await manualAction(
    ticketId,
    { action: 'pause', reasonId: refs.pauseReasonId },
    wallClock,
  )
  expect(paused.statusCode).toBe(200)
  const pause = await openPauseRow(ticketId)
  expect(pause.openedAt).toBe(expected)
  await expectStepTimes(pause.id, expected)
  expect(await eventTime(ticketId, 'paused')).toBe(expected)

  const descendantId = await pauseDescendant()
  const advanced = await manualAction(
    ticketId,
    { action: 'advance_pause', reasonId: descendantId },
    wallClock,
  )
  expect(advanced.statusCode).toBe(200)
  await expectStepTimes(pause.id, expected)

  const resumed = await manualAction(
    ticketId,
    { action: 'resume', reasonId: descendantId },
    wallClock,
  )
  expect(resumed.statusCode).toBe(200)
  await expectStepTimes(pause.id, expected)

  const closed = await context.db.execute(sql`
    select closed_at from public.ticket_pauses where id = ${pause.id}
  `)
  expect(
    timestamp((closed.rows[0] as { closed_at: Date | string }).closed_at),
  ).toBe(expected)
  expect(await eventTime(ticketId, 'resumed')).toBe(expected)
})
