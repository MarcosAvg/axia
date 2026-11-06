import { randomUUID } from 'node:crypto'

import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  authHeaders,
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'

let context: TicketHttpContext

function reserve(cookie: string, overrides: Record<string, unknown> = {}) {
  return context.app.inject({
    method: 'POST',
    url: '/api/attachments',
    headers: authHeaders(cookie),
    payload: {
      clientRequestId: randomUUID(),
      problemId: context.catalog.problemA.id,
      fileName: 'cotizacion.pdf',
      declaredMimeType: 'application/pdf',
      sizeBytes: 1024,
      ...overrides,
    },
  })
}

beforeAll(async () => {
  context = await buildTicketHttpApp()
  await context.db.execute(sql`
    update public.problems
    set attachment_required_types = array['application/pdf']::text[]
    where id = ${context.catalog.problemA.id}
  `)
}, 60_000)

afterAll(async () => {
  await closeTicketHttpApp(context)
})

describe('reserva de adjuntos', () => {
  it('rechaza un problema que no exige adjunto', async () => {
    const response = await reserve(context.cookies.requester, {
      problemId: context.catalog.problemB.id,
    })
    expect(response.statusCode).toBe(422)
  })

  it('reserva un adjunto pendiente para un problema con regla', async () => {
    const response = await reserve(context.cookies.requester)
    expect(response.statusCode).toBe(201)
    const body = response.json() as { attachment: { id: string } }
    const row = await context.db.execute(sql`
      select ticket_id, processing_state, uploaded_by
      from public.ticket_attachments
      where id = ${body.attachment.id}
    `)
    expect(row.rows[0]).toMatchObject({
      ticket_id: null,
      processing_state: 'pending',
    })
  })

  it('rechaza un tipo que el problema no admite', async () => {
    const response = await reserve(context.cookies.requester, {
      declaredMimeType: 'text/html',
      fileName: 'pagina.html',
    })
    expect(response.statusCode).toBe(422)
  })

  it('repite la reserva con la misma clave sin duplicar la fila', async () => {
    const payload = { clientRequestId: randomUUID() }
    const first = await reserve(context.cookies.requester, payload)
    const second = await reserve(context.cookies.requester, payload)
    expect(first.statusCode).toBe(201)
    expect(second.statusCode).toBe(200)
    expect(second.json()).toMatchObject({
      attachment: (first.json() as { attachment: { id: string } }).attachment,
      replayed: true,
    })
    const count = await context.db.execute(sql`
      select count(*)::int as total
      from public.ticket_attachments
      where client_request_id = ${payload.clientRequestId}
    `)
    expect(count.rows[0]).toMatchObject({ total: 1 })
  })

  it('rechaza a un técnico sin permiso de alta', async () => {
    const response = await reserve(context.cookies.technician)
    expect(response.statusCode).toBe(403)
  })

  it('rechaza reservar para recaptura sin permiso', async () => {
    const response = await reserve(context.cookies.requester, {
      ticketId: context.ids.ticketA1,
    })
    expect(response.statusCode).toBe(403)
  })
})
