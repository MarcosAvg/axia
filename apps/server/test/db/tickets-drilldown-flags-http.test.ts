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

describe('drill-down terminal and routing', () => {
  it('filters by terminal reason and counts distinct tickets', async () => {
    const { cookies, ids: ticket } = context
    expect(
      await ids(
        `/api/tickets?terminalReasonId=${drill.rejectionReasonId}`,
        cookies.admin,
      ),
    ).toEqual([ticket.ticketA2])
    const response = await get('/api/metrics/reject-cancel', cookies.admin)
    const body = response.json() as { items: Array<{ tickets: number }> }
    expect(body.items).toEqual([expect.objectContaining({ tickets: 1 })])
  })

  it('counts pending offers by ticket and cycle', async () => {
    const { cookies, ids: ticket } = context
    expect(await ids('/api/tickets?pendingOffer=true', cookies.admin)).toEqual([
      ticket.ticketAux,
    ])
    const response = await get('/api/metrics/routing', cookies.admin)
    const body = response.json() as {
      items: Array<{ pending_offers: number }>
    }
    expect(body.items[0]?.pending_offers).toBe(1)
  })
})

describe('drill-down quality flags', () => {
  it('filters quality flags', async () => {
    const { cookies, ids: ticket, people } = context
    expect(await ids('/api/tickets?reassigned=true', cookies.admin)).toEqual([
      ticket.ticketAux,
    ])
    expect(await ids('/api/tickets?reopened=true', cookies.admin)).toEqual([
      ticket.ticketB1,
    ])
    expect(await ids('/api/tickets?recaptured=true', cookies.admin)).toEqual([
      ticket.ticketB1,
    ])
    expect(
      await ids('/api/tickets?unverifiedTime=true', cookies.admin),
    ).toEqual([ticket.ticketB1])
    expect(await ids('/api/tickets?firstFix=true', cookies.admin)).toEqual([
      ticket.ticketA1,
    ])
    expect(
      await ids(
        `/api/tickets?participantTechnicianId=${people.technicianRow.id}`,
        cookies.admin,
      ),
    ).toEqual([ticket.ticketAux])
  })

  it('filters by phase using current data', async () => {
    const { cookies, ids: ticket } = context
    expect(
      await ids('/api/tickets?phase=active&timeMode=calendar', cookies.admin),
    ).toEqual([ticket.ticketA1])
  })
})

describe('drill-down phase minutes', () => {
  it('filters phase minutes by range and outliers', async () => {
    const { cookies, ids: ticket } = context
    const active = '/api/tickets?phase=active&timeMode=calendar'
    expect(await ids(`${active}&phaseMinutesMin=5`, cookies.admin)).toEqual([
      ticket.ticketA1,
    ])
    expect(await ids(`${active}&phaseMinutesMin=15`, cookies.admin)).toEqual([])
    expect(await ids(`${active}&phaseMinutesMax=15`, cookies.admin)).toEqual([
      ticket.ticketA1,
    ])
    expect(await ids(`${active}&phaseMinutesMax=5`, cookies.admin)).toEqual([])
    expect(
      await ids(
        `${active}&phaseOutsideLow=0&phaseOutsideHigh=5`,
        cookies.admin,
      ),
    ).toEqual([ticket.ticketA1])
    expect(
      await ids(
        `${active}&phaseOutsideLow=0&phaseOutsideHigh=15`,
        cookies.admin,
      ),
    ).toEqual([])
  })

  it('filters strict phase boundaries for the inverse subset', async () => {
    const { cookies, ids: ticket } = context
    const active = '/api/tickets?phase=active&timeMode=calendar'
    expect(await ids(`${active}&phaseMinutesAbove=5`, cookies.admin)).toEqual([
      ticket.ticketA1,
    ])
    expect(await ids(`${active}&phaseMinutesAbove=10`, cookies.admin)).toEqual(
      [],
    )
    expect(await ids(`${active}&phaseMinutesBelow=10`, cookies.admin)).toEqual(
      [],
    )
    expect(await ids(`${active}&phaseMinutesBelow=15`, cookies.admin)).toEqual([
      ticket.ticketA1,
    ])
  })
})

describe('drill-down scope and validation', () => {
  it('keeps the ticket scope', async () => {
    const { cookies, ids: ticket } = context
    expect(await ids('/api/tickets?outcome=closed', cookies.requester)).toEqual(
      [ticket.ticketA1],
    )
  })

  it('rejects invalid drill-down filters', async () => {
    const { cookies } = context
    for (const path of [
      '/api/tickets?outcome=unknown',
      '/api/tickets?rating=0',
      '/api/tickets?sla=unknown',
      '/api/tickets?phase=unknown',
      '/api/tickets?subcategoryId=not-a-uuid',
      '/api/tickets?phaseMinutesMin=5',
      '/api/tickets?phase=active&phaseOutsideLow=0',
      '/api/tickets?phase=active&phaseOutsideLow=10&phaseOutsideHigh=5',
      '/api/tickets?phase=active&phaseMinutesMin=-1',
      '/api/tickets?phase=active&phaseMinutesMin=10&phaseMinutesMax=5',
      '/api/tickets?phase=active&phaseOutsideLow=abc&phaseOutsideHigh=5',
      '/api/tickets?phaseMinutesAbove=5',
      '/api/tickets?phase=active&phaseMinutesAbove=-1',
      '/api/tickets?phase=active&phaseMinutesBelow=-1',
    ]) {
      const response = await get(path, cookies.admin)
      expect(response.statusCode).toBe(400)
    }
  })
})
