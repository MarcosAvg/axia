import { randomUUID } from 'node:crypto'

import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  authHeaders,
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'
import { loadWriteRefs, type WriteRefs } from './tickets-write-helpers.js'
import { backfillDuplicateAlerts } from '../../src/tickets/duplicate-alerts.js'

let context: TicketHttpContext
let refs: WriteRefs

function ticketBody(
  description: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    buildingId: refs.buildingId,
    locationId: refs.locationId,
    dependencyId: refs.dependencyId,
    categoryId: refs.categoryId,
    subcategoryId: refs.subcategoryId,
    problemId: refs.problemId,
    serviceTypeId: refs.serviceTypeId,
    priorityId: refs.priorityId,
    channelId: refs.channelId,
    description,
    requesterId: refs.requesterId,
    clientRequestId: randomUUID(),
    ...overrides,
  }
}

const description = () =>
  `Ruido metálico intermitente en el extractor del laboratorio ${randomUUID()}`

async function createTicket(
  text: string,
  overrides: Record<string, unknown> = {},
  cookie = context.cookies.requester,
) {
  const response = await context.app.inject({
    method: 'POST',
    url: '/api/tickets',
    headers: authHeaders(cookie),
    payload: ticketBody(text, overrides),
  })
  expect(response.statusCode).toBe(201)
  return (response.json() as { ticket: { id: string } }).ticket.id
}

async function checkDuplicates(
  text: string,
  cookie = context.cookies.requester,
) {
  const response = await context.app.inject({
    method: 'POST',
    url: '/api/tickets/duplicates',
    headers: authHeaders(cookie),
    payload: {
      buildingId: refs.buildingId,
      locationId: refs.locationId,
      categoryId: refs.categoryId,
      subcategoryId: refs.subcategoryId,
      problemId: refs.problemId,
      dependencyId: refs.dependencyId,
      description: text,
    },
  })
  expect(response.statusCode).toBe(200)
  return (response.json() as { items: Record<string, unknown>[] }).items
}

async function action(ticketId: string, originalId: string) {
  return context.app.inject({
    method: 'POST',
    url: `/api/tickets/${ticketId}/actions`,
    headers: authHeaders(context.cookies.requester),
    payload: {
      action: 'mark_duplicate',
      originalId,
      clientRequestId: randomUUID(),
    },
  })
}

async function candidateRow(ticketId: string, candidateId: string) {
  const result = await context.db.execute(sql`
    select decision, decided_by, decided_at, score, reasons
    from public.ticket_duplicate_candidates
    where ticket_id = ${ticketId} and candidate_ticket_id = ${candidateId}
  `)
  return result.rows[0] as
    | {
        decision: string | null
        decided_by: string | null
        decided_at: Date | null
        score: string
        reasons: string[]
      }
    | undefined
}

beforeAll(async () => {
  context = await buildTicketHttpApp()
  refs = await loadWriteRefs(context)
}, 60_000)

afterAll(async () => {
  await closeTicketHttpApp(context)
})

describe('aviso previo de duplicados', () => {
  it('devuelve el candidato con puntaje y motivos, sin bloquear el registro', async () => {
    const text = description()
    const firstId = await createTicket(text)
    const items = await checkDuplicates(text)
    const match = items.find((item) => item.id === firstId)
    expect(match).toMatchObject({
      folio: expect.any(String),
      score: expect.any(Number),
    })
    expect(Number(match?.score)).toBeGreaterThanOrEqual(0.3)
    expect(match?.reasons).toEqual(
      expect.arrayContaining(['location', 'problem', 'subcategory']),
    )
    expect(match).not.toHaveProperty('location')
  })

  it('avisa por misma ubicación y problema aunque el texto sea distinto', async () => {
    const firstId = await createTicket(`Texto distinto ${randomUUID()}`)
    const items = await checkDuplicates(`Otra redacción ${randomUUID()}`)
    const match = items.find((item) => item.id === firstId)
    expect(match).toBeDefined()
    expect(match?.reasons).toEqual(
      expect.arrayContaining(['location', 'problem']),
    )
    expect(Number(match?.score)).toBeGreaterThanOrEqual(0.5)
  })

  it('marca como ignorados los candidatos que se mostraron al registrar', async () => {
    const text = description()
    const firstId = await createTicket(text)
    const secondId = await createTicket(text, { shownCandidateIds: [firstId] })
    const row = await candidateRow(secondId, firstId)
    expect(row).toMatchObject({ decision: 'ignored' })
    expect(row?.decided_by).not.toBeNull()
    expect(row?.decided_at).not.toBeNull()
    expect(Number(row?.score)).toBeGreaterThanOrEqual(0.3)
  })

  it('deja pendientes los candidatos detectados sin aviso previo', async () => {
    const text = description()
    const firstId = await createTicket(text)
    const secondId = await createTicket(text)
    const row = await candidateRow(secondId, firstId)
    expect(row?.decision).toBeNull()
  })
})

describe('descarte de alertas', () => {
  it('descarta las alertas pendientes y limpia el indicador', async () => {
    const text = description()
    await createTicket(text)
    const ticketId = await createTicket(text)
    const response = await context.app.inject({
      method: 'POST',
      url: `/api/tickets/${ticketId}/duplicate-alerts/dismiss`,
      headers: authHeaders(context.cookies.requester),
    })
    expect(response.statusCode).toBe(204)
    const alerts = await context.app.inject({
      method: 'GET',
      url: `/api/tickets/${ticketId}/duplicate-alerts`,
      headers: authHeaders(context.cookies.requester),
    })
    expect(alerts.statusCode).toBe(200)
    const items = (alerts.json() as { items: { decision: string }[] }).items
    expect(items.every((item) => item.decision === 'dismissed')).toBe(true)
    const ticket = await context.db.execute(sql`
      select possible_duplicate from public.tickets where id = ${ticketId}
    `)
    expect(
      (ticket.rows[0] as { possible_duplicate: boolean }).possible_duplicate,
    ).toBe(false)
  })
})

describe('marcar duplicado desde una alerta', () => {
  it('enlaza el candidato elegido y descarta el resto al marcar duplicado', async () => {
    const text = description()
    const originalId = await createTicket(text)
    const duplicateId = await createTicket(text)
    expect((await action(duplicateId, originalId)).statusCode).toBe(200)
    const row = await candidateRow(duplicateId, originalId)
    expect(row).toMatchObject({ decision: 'linked' })
    expect(row?.decided_by).not.toBeNull()
    const ticket = await context.db.execute(sql`
      select possible_duplicate from public.tickets where id = ${duplicateId}
    `)
    expect(
      (ticket.rows[0] as { possible_duplicate: boolean }).possible_duplicate,
    ).toBe(false)
  })

  it('rechaza enlazar a un original que ya es duplicado', async () => {
    const text = description()
    const firstId = await createTicket(text)
    const secondId = await createTicket(text)
    expect((await action(secondId, firstId)).statusCode).toBe(200)
    const thirdId = await createTicket(text)
    const response = await action(thirdId, secondId)
    expect(response.statusCode).toBe(409)
    expect(
      (response.json() as { error: { message: string } }).error.message,
    ).toContain('ya es un duplicado')
  })

  it('oculta un original fuera de alcance que no fue candidato', async () => {
    const other = await context.db.execute(sql`
      select id from public.requesters
      where full_name = 'Solicitante sin cuenta' limit 1
    `)
    const otherRequesterId = (other.rows[0] as { id: string }).id
    const hiddenId = await createTicket(
      `Solicitud sin relación ${randomUUID()}`,
      { requesterId: otherRequesterId },
      context.cookies.admin,
    )
    const ownId = await createTicket(description(), {
      categoryId: refs.categoryIdB,
      subcategoryId: refs.subcategoryIdB,
      problemId: refs.problemIdB,
    })
    const response = await action(ownId, hiddenId)
    expect(response.statusCode).toBe(404)
  })
})

describe('relleno de tiquets existentes', () => {
  it('recalcula candidatos y el indicador de un tiquet ya creado', async () => {
    const text = description()
    const firstId = await createTicket(text)
    const secondId = await createTicket(text)
    await context.db.execute(sql`
      delete from public.ticket_duplicate_candidates
      where ticket_id = ${secondId}
    `)
    await context.db.execute(sql`
      update public.tickets set possible_duplicate = false where id = ${secondId}
    `)
    const result = await backfillDuplicateAlerts(context.db)
    expect(result.tickets).toBeGreaterThan(0)
    const row = await candidateRow(secondId, firstId)
    expect(row?.decision).toBeNull()
    const ticket = await context.db.execute(sql`
      select possible_duplicate from public.tickets where id = ${secondId}
    `)
    expect(
      (ticket.rows[0] as { possible_duplicate: boolean }).possible_duplicate,
    ).toBe(true)
  })
})
