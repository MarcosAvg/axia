import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'

import { seedMetrics } from './metrics-fixture.js'

type MetricsResponse = {
  summary: { tickets: number }
  groups: Array<{ dimension: string; row: { id: string; tickets: number } }>
  volume: Array<{ month: string; tickets: number }>
  aging: Array<{ id: string }>
}

let context: TicketHttpContext
let baseUrl: string

function total(values: Array<{ tickets: number }>): number {
  return values.reduce((sum, item) => sum + item.tickets, 0)
}

async function itemsOf(response: Response) {
  const body = (await response.json()) as {
    items: Array<Record<string, unknown>>
  }
  return body.items
}

async function get(path: string, cookie: string) {
  return fetch(`${baseUrl}${path}`, { headers: { Cookie: cookie } })
}

beforeAll(async () => {
  context = await buildTicketHttpApp()
  await seedMetrics(context)
  baseUrl = await context.app.listen({ host: '127.0.0.1', port: 0 })
}, 60_000)

afterAll(async () => {
  await closeTicketHttpApp(context)
})

describe('GET /api/metrics/summary', () => {
  it('agrega los tiquets visibles en una sola respuesta', async () => {
    const response = await get('/api/metrics/summary', context.cookies.admin)
    expect(response.status).toBe(200)
    const body = (await response.json()) as MetricsResponse
    expect(body.summary.tickets).toBe(4)
    expect(
      total(
        body.groups
          .filter((group) => group.dimension === 'team')
          .map((group) => group.row),
      ),
    ).toBe(4)
    expect(total(body.volume)).toBe(4)
    expect(body.aging).toHaveLength(4)
  })

  it('filtra por equipo y respeta el alcance del técnico', async () => {
    const admin = await get('/api/metrics/summary', context.cookies.admin)
    const adminBody = (await admin.json()) as MetricsResponse
    const team = adminBody.groups.find(
      (group) => group.dimension === 'team' && group.row.tickets === 3,
    )
    expect(team).toBeTruthy()
    if (!team) return

    const filtered = await get(
      `/api/metrics/summary?teamId=${team.row.id}`,
      context.cookies.admin,
    )
    expect(((await filtered.json()) as MetricsResponse).summary.tickets).toBe(3)

    const technician = await get(
      '/api/metrics/summary',
      context.cookies.technician,
    )
    expect(((await technician.json()) as MetricsResponse).summary.tickets).toBe(
      2,
    )
  })

  it('omite grupos y antigüedad en modo compacto', async () => {
    const response = await get(
      '/api/metrics/summary?compact=1',
      context.cookies.admin,
    )
    expect(response.status).toBe(200)
    const body = (await response.json()) as MetricsResponse
    expect(body.summary.tickets).toBe(4)
    expect(body.groups).toEqual([])
    expect(body.aging).toEqual([])
    expect(total(body.volume)).toBe(4)
  })
})

describe('contrato de endpoints de métricas', () => {
  it.each([
    'pauses',
    'duplicate-tickets',
    'duplicate-alerts',
    'duplicates-by-dimension',
    'satisfaction',
    'sla',
    'sla-by-priority',
    'by-technician',
    'technician-times',
    'supervisors',
    'pause-substates',
    'reject-cancel',
    'routing',
  ])('conserva respuesta y permiso propio en %s', async (metric) => {
    const response = await get(`/api/metrics/${metric}`, context.cookies.admin)
    expect(response.status).toBe(200)
    expect(await itemsOf(response)).toBeInstanceOf(Array)
    const denied = await get(`/api/metrics/${metric}`, context.cookies.noAccess)
    expect(denied.status).toBe(403)
  })

  it('normaliza conteos y medias SQL en la frontera HTTP', async () => {
    const alerts = await get(
      '/api/metrics/duplicate-alerts',
      context.cookies.admin,
    )
    expect(await itemsOf(alerts)).toEqual([
      { decision: 'ignored', candidates: 2, tickets: 2 },
    ])
    const ratings = await get(
      '/api/metrics/satisfaction',
      context.cookies.admin,
    )
    expect(await itemsOf(ratings)).toEqual([{ average_score: 3, ratings: 3 }])
    const pauses = await get('/api/metrics/pauses', context.cookies.admin)
    const items = await itemsOf(pauses)
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ pauses: 2, pause_time: '03:00:00' })
  })
})
