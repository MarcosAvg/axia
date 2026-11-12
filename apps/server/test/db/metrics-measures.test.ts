import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, expect, it } from 'vitest'

import {
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'

let context: TicketHttpContext

const FROM = '2026-01-01'
const TO = '2026-01-31'

type SummaryBody = {
  summary: Record<string, number>
  groups: Array<{ dimension: string; row: Record<string, number> }>
}

async function summary(query: string): Promise<SummaryBody> {
  const response = await context.app.inject({
    method: 'GET',
    url: `/api/metrics/summary?from=${FROM}&to=${TO}&${query}`,
    headers: { Cookie: context.cookies.admin },
  })
  expect(response.statusCode).toBe(200)
  return response.json() as SummaryBody
}

async function profile(query: string) {
  const response = await context.app.inject({
    method: 'GET',
    url: `/api/metrics/distribution-profile?from=${FROM}&to=${TO}&${query}`,
    headers: { Cookie: context.cookies.admin },
  })
  expect(response.statusCode).toBe(200)
  return response.json() as {
    items: Array<{
      phase: string
      n: number
      coverage: number
      mean: number
      median: number
      p25: number
      p75: number
      p90: number
      p95: number
      max: number
      upperFence: number
      outliers: number
      outlierRate: number
    }>
  }
}

/** Cuatro tiquets cerrados con duraciones conocidas: 120, 180, 240 y 600 min. */
beforeAll(async () => {
  context = await buildTicketHttpApp()
  await context.db.execute(sql`
    update public.tickets t
    set status = 'closed',
      reported_at = '2026-01-15T12:00:00Z'::timestamptz,
      closed_at = '2026-01-15T12:00:00Z'::timestamptz
        + (v.minutes || ' minutes')::interval
    from (values
      (${context.ids.ticketA1}::uuid, 120),
      (${context.ids.ticketA2}::uuid, 180),
      (${context.ids.ticketAux}::uuid, 240),
      (${context.ids.ticketB1}::uuid, 600)
    ) as v(id, minutes)
    where t.id = v.id
  `)
  await context.db.execute(sql`
    insert into public.work_calendars (name, timezone)
    values ('Sin intervalos', 'UTC')
  `)
  await context.db.execute(sql`
    update public.instance_settings
    set default_calendar_id = (
      select id from public.work_calendars where name = 'Sin intervalos'
    )
  `)
}, 60_000)

afterAll(async () => {
  await closeTicketHttpApp(context)
})

it('calcula la mediana y la muestra sobre el universo de desempeño', async () => {
  const body = await summary('stat=median')

  expect(body.summary.avgTotal).toBeCloseTo(285, 0)
  expect(body.summary.statTotal).toBeCloseTo(210, 0)
  expect(body.summary.nTotal).toBe(4)

  const category = body.groups.find(
    (group) => group.dimension === 'category' && group.row.tickets === 3,
  )
  expect(category?.row.statTotal).toBeCloseTo(180, 0)
  expect(category?.row.nTotal).toBe(3)
})

it('calcula P90 y el máximo sin inflar el esquema', async () => {
  const p90 = await summary('stat=p90')
  expect(p90.summary.statTotal).toBeCloseTo(492, 0)

  const max = await summary('stat=max')
  expect(max.summary.statTotal).toBeCloseTo(600, 0)
})

it('aplica el reloj elegido a las medidas robustas', async () => {
  const extra = await summary('stat=median&timeMode=extra')
  expect(extra.summary.statTotal).toBeCloseTo(210, 0)
  expect(extra.summary.nTotal).toBe(4)

  const labor = await summary('stat=median&timeMode=laboral')
  expect(labor.summary.statTotal).toBe(0)
  expect(labor.summary.nTotal).toBe(0)
})

it('describe la distribución con cobertura, vallas y atípicos', async () => {
  const body = await profile('timeMode=calendar')
  const total = body.items.find((item) => item.phase === 'total')

  expect(total).toMatchObject({
    phase: 'total',
    n: 4,
    total: 4,
    coverage: 1,
    outliers: 1,
  })
  expect(total?.mean).toBeCloseTo(285, 0)
  expect(total?.median).toBeCloseTo(210, 0)
  expect(total?.p25).toBeCloseTo(165, 0)
  expect(total?.p75).toBeCloseTo(330, 0)
  expect(total?.p90).toBeCloseTo(492, 0)
  expect(total?.p95).toBeCloseTo(546, 0)
  expect(total?.max).toBeCloseTo(600, 0)
  expect(total?.upperFence).toBeCloseTo(577.5, 1)
  expect(total?.outlierRate).toBeCloseTo(0.25, 2)
})

it('exige metrics.view en el perfil de distribución', async () => {
  const denied = await context.app.inject({
    method: 'GET',
    url: `/api/metrics/distribution-profile?from=${FROM}&to=${TO}`,
    headers: { Cookie: context.cookies.noAccess },
  })
  expect(denied.statusCode).toBe(403)
})
