import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'

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

async function get(path: string, cookie: string) {
  return fetch(`${baseUrl}${path}`, { headers: { Cookie: cookie } })
}

beforeAll(async () => {
  context = await buildTicketHttpApp()
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
