import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, expect, it } from 'vitest'

import {
  atMinutesAgo,
  createTicketAt,
  offline,
} from './business-times-helpers.js'
import {
  authHeaders,
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'
import { loadWriteRefs, type WriteRefs } from './tickets-write-helpers.js'

let context: TicketHttpContext
let refs: WriteRefs

beforeAll(async () => {
  context = await buildTicketHttpApp()
  refs = await loadWriteRefs(context)
}, 60_000)

afterAll(async () => {
  await closeTicketHttpApp(context)
})

async function childReason(
  name: string,
  clockClass: 'counted' | 'not_counted',
  kind: 'progress' | 'exit' = 'progress',
): Promise<string> {
  const result = await context.db.execute(sql`
    insert into public.reasons (
      use, name, clock_class, parent_id, pause_step_kind
    )
    values (
      'pause'::public.reason_use, ${name}, ${clockClass}::public.clock_class,
      ${refs.pauseReasonId}, ${kind}::public.pause_step_kind
    )
    returning id
  `)
  return (result.rows[0] as { id: string }).id
}

async function evidenceAt(ticketId: string, occurredAt: string) {
  await context.db.execute(sql`
    insert into public.evidence (
      ticket_id, cycle, type, captured_by_technician_id, processing_state,
      occurred_at
    ) values (
      ${ticketId}, 1, 'before', ${refs.technicianId}, 'ready', ${occurredAt}
    )
  `)
}

type SpanRow = {
  name: string
  minutes: string
  clock_class: string
}

async function pauseSpans(ticketId: string): Promise<SpanRow[]> {
  const result = await context.db.execute(sql`
    select r.name, ts.clock_class,
      extract(epoch from (ts.ended_at - ts.started_at)) / 60 as minutes
    from public.time_spans ts
    join public.reasons r on r.id = ts.ref_id
    where ts.ticket_id = ${ticketId} and ts.kind = 'pause'
    order by ts.started_at
  `)
  return result.rows as SpanRow[]
}

async function pauseSteps(ticketId: string): Promise<SpanRow[]> {
  const result = await context.db.execute(sql`
    select r.name,
      extract(epoch from (s.exited_at - s.entered_at)) / 60 as minutes
    from public.ticket_pause_steps s
    join public.ticket_pauses p on p.id = s.pause_id
    join public.reasons r on r.id = s.reason_id
    where p.ticket_id = ${ticketId}
    order by s.entered_at
  `)
  return result.rows as SpanRow[]
}

async function runPauseSequence(): Promise<{
  ticketId: string
  childName: string
  exitName: string
}> {
  const ticketId = await createTicketAt(context, refs, 240)
  await offline(context, {
    cookie: context.cookies.supervisor,
    ticketId,
    type: 'take',
    reportedAt: atMinutesAgo(180),
  })
  await offline(context, {
    cookie: context.cookies.supervisor,
    ticketId,
    type: 'assign_technician',
    args: { technicianId: refs.technicianId },
    reportedAt: atMinutesAgo(170),
  })
  await evidenceAt(ticketId, atMinutesAgo(165))
  await offline(context, {
    cookie: context.cookies.technician,
    ticketId,
    type: 'start',
    reportedAt: atMinutesAgo(160),
  })

  const childName = 'Subestado en pausa'
  const exitName = 'Subestado de salida'
  const pausedChild = await childReason(childName, 'counted')
  const exitReason = await childReason(exitName, 'not_counted', 'exit')
  await context.db.execute(sql`
    insert into public.pause_transitions (from_reason_id, to_reason_id)
    values
      (${refs.pauseReasonId}, ${pausedChild}),
      (${pausedChild}, ${exitReason})
  `)
  await offline(context, {
    cookie: context.cookies.technician,
    ticketId,
    type: 'pause',
    args: { reasonId: refs.pauseReasonId },
    reportedAt: atMinutesAgo(120),
  })
  await offline(context, {
    cookie: context.cookies.technician,
    ticketId,
    type: 'advance_pause',
    args: { reasonId: pausedChild },
    reportedAt: atMinutesAgo(90),
  })
  await offline(context, {
    cookie: context.cookies.technician,
    ticketId,
    type: 'resume',
    args: { reasonId: exitReason },
    reportedAt: atMinutesAgo(60),
  })
  return { ticketId, childName, exitName }
}

async function expectIntervals(ticketId: string) {
  const spans = await pauseSpans(ticketId)
  expect(spans.map((row) => row.name)).toEqual([
    'Falta de material',
    'Subestado en pausa',
  ])
  for (const row of spans) {
    expect(Number(row.minutes)).toBeCloseTo(30, 0)
  }
  expect(spans.every((row) => row.clock_class === 'counted')).toBe(true)

  const steps = await pauseSteps(ticketId)
  expect(steps.map((row) => row.name)).toEqual([
    'Falta de material',
    'Subestado en pausa',
  ])
  for (const row of steps) {
    expect(Number(row.minutes)).toBeCloseTo(30, 0)
  }

  const sums = await context.db.execute(sql`
    select
      extract(epoch from public.ticket_time_by_kind(
        ${ticketId}, 'pause'::public.time_span_kind
      )) / 60 as span_minutes,
      (
        select sum(extract(epoch from (s.exited_at - s.entered_at)) / 60)
        from public.ticket_pause_steps s
        join public.ticket_pauses p on p.id = s.pause_id
        where p.ticket_id = ${ticketId}
      ) as step_minutes
  `)
  const totals = sums.rows[0] as {
    span_minutes: string
    step_minutes: string
  }
  expect(Number(totals.span_minutes)).toBeCloseTo(60, 0)
  expect(Number(totals.step_minutes)).toBeCloseTo(60, 0)
}

async function expectApi(
  ticketId: string,
  exitName: string,
  childName: string,
) {
  const history = await context.app.inject({
    method: 'GET',
    url: `/api/tickets/${ticketId}/pause-steps`,
    headers: authHeaders(context.cookies.admin),
  })
  const items = (
    history.json() as {
      items: Array<{ closedReasonName: string | null }>
    }
  ).items
  expect(items[0]?.closedReasonName).toBe(exitName)

  const metrics = await context.app.inject({
    method: 'GET',
    url: '/api/metrics/pause-substates',
    headers: authHeaders(context.cookies.admin),
  })
  const row = (
    metrics.json() as {
      items: Array<{ substate_name: string; pause_minutes: number | string }>
    }
  ).items.find((item) => item.substate_name === childName)
  expect(Number(row?.pause_minutes)).toBeCloseTo(30, 0)
}

it('conserva el motivo de cada intervalo y cierra con el subestado de salida', async () => {
  const { ticketId, childName, exitName } = await runPauseSequence()

  const pause = await context.db.execute(sql`
    select id, closed_reason_id from public.ticket_pauses
    where ticket_id = ${ticketId}
    order by opened_at desc limit 1
  `)
  const pauseRow = pause.rows[0] as {
    id: string
    closed_reason_id: string
  }
  const exit = await context.db.execute(sql`
    select id from public.reasons where name = ${exitName}
  `)
  expect(pauseRow.closed_reason_id).toBe((exit.rows[0] as { id: string }).id)

  await expectIntervals(ticketId)
  await expectApi(ticketId, exitName, childName)
})
