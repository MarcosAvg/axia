import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { authHeaders } from './tickets-http-helpers.js'
import type { TicketHttpContext } from './tickets-http-helpers.js'
import {
  buildDrillDownApp,
  closeDrillDownApp,
  type DrillIds,
} from './tickets-drilldown-fixtures.js'

type PageBody = {
  items: Array<{ id: string }>
  total: number
}

let context: TicketHttpContext
let drill: DrillIds

async function get(path: string, cookie: string) {
  return context.app.inject({
    method: 'GET',
    url: path,
    headers: authHeaders(cookie),
  })
}

async function ids(path: string, cookie: string): Promise<string[]> {
  const response = await get(path, cookie)
  expect(response.statusCode).toBe(200)
  const body = response.json() as PageBody
  return body.items.map((item) => item.id).sort()
}

beforeAll(async () => {
  const built = await buildDrillDownApp()
  context = built.context
  drill = built.drill
}, 60_000)

afterAll(async () => {
  await closeDrillDownApp(context)
})

describe('drill-down classification filters', () => {
  it('filters by outcome', async () => {
    const { cookies, ids: ticket } = context
    expect(await ids('/api/tickets?outcome=closed', cookies.admin)).toEqual(
      [ticket.ticketA1, ticket.ticketB1].sort(),
    )
    expect(await ids('/api/tickets?outcome=open', cookies.admin)).toEqual([
      ticket.ticketAux,
    ])
    expect(await ids('/api/tickets?outcome=rejected', cookies.admin)).toEqual([
      ticket.ticketA2,
    ])
  })

  it('filters by classification and channel', async () => {
    const { cookies, ids: ticket, catalog } = context
    expect(
      await ids(
        `/api/tickets?subcategoryId=${catalog.subcategoryA.id}`,
        cookies.admin,
      ),
    ).toEqual([ticket.ticketA1])
    expect(
      await ids(`/api/tickets?problemId=${catalog.problemB.id}`, cookies.admin),
    ).toEqual([ticket.ticketB1])
    expect(
      await ids(`/api/tickets?channelId=${drill.channelBId}`, cookies.admin),
    ).toEqual([ticket.ticketA2])
  })

  it('includes subcategory and problem names', async () => {
    const { cookies, catalog } = context
    const response = await get(
      `/api/tickets?subcategoryId=${catalog.subcategoryA.id}`,
      cookies.admin,
    )
    const body = response.json() as {
      items: Array<{
        subcategoryName: string | null
        problemName: string | null
      }>
    }
    expect(body.items[0]).toMatchObject({
      subcategoryName: 'Subcategoría A',
      problemName: 'Problema A',
    })
  })
})

describe('drill-down ratings and SLA', () => {
  it('filters by rating', async () => {
    const { cookies, ids: ticket } = context
    expect(await ids('/api/tickets?rating=5', cookies.admin)).toEqual([
      ticket.ticketA1,
    ])
    expect(await ids('/api/tickets?rating=3', cookies.admin)).toEqual([
      ticket.ticketB1,
    ])
  })

  it('filters by SLA result with the instance clock by default', async () => {
    const { cookies, ids: ticket } = context
    expect(await ids('/api/tickets?sla=met', cookies.admin)).toEqual([
      ticket.ticketA1,
    ])
    expect(await ids('/api/tickets?sla=missed', cookies.admin)).toEqual([
      ticket.ticketB1,
    ])
    expect(await ids('/api/tickets?sla=with_target', cookies.admin)).toEqual(
      [ticket.ticketA1, ticket.ticketB1].sort(),
    )
  })
})

describe('drill-down pause filters', () => {
  it('matches the current pause reason', async () => {
    const { cookies, ids: ticket } = context
    expect(
      await ids(
        `/api/tickets?pauseReasonId=${drill.pauseReasonId}`,
        cookies.admin,
      ),
    ).toEqual([ticket.ticketAux])
  })

  it('finds a substate that is no longer current', async () => {
    const { cookies, ids: ticket } = context
    expect(
      await ids(
        `/api/tickets?pauseSubstateId=${drill.pauseIntermediateId}`,
        cookies.admin,
      ),
    ).toEqual([ticket.ticketA2])
    expect(
      await ids(
        `/api/tickets?pauseSubstateId=${drill.pauseFinalId}`,
        cookies.admin,
      ),
    ).toEqual([ticket.ticketA2])
  })
})
