import { randomUUID } from 'node:crypto'

import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  attachmentIdOf,
  buildAttachmentHttpApp,
  closeAttachmentHttpApp,
  reserve,
  type AttachmentHttpContext,
} from './attachments-http-helpers.js'

let app: AttachmentHttpContext

beforeAll(async () => {
  app = await buildAttachmentHttpApp()
}, 60_000)

afterAll(async () => {
  await closeAttachmentHttpApp(app)
})

describe('reserva de adjuntos', () => {
  it('rechaza un problema que no exige adjunto', async () => {
    const response = await reserve(app.context, app.context.cookies.requester, {
      problemId: app.context.catalog.problemB.id,
    })
    expect(response.statusCode).toBe(422)
  })

  it('reserva un adjunto pendiente para un problema con regla', async () => {
    const response = await reserve(app.context, app.context.cookies.requester)
    expect(response.statusCode).toBe(201)
    const row = await app.context.db.execute(sql`
      select ticket_id, processing_state, uploaded_by
      from public.ticket_attachments
      where id = ${attachmentIdOf(response)}
    `)
    expect(row.rows[0]).toMatchObject({
      ticket_id: null,
      processing_state: 'pending',
    })
  })

  it('rechaza un tipo que el problema no admite', async () => {
    const response = await reserve(app.context, app.context.cookies.requester, {
      declaredMimeType: 'text/html',
      fileName: 'pagina.html',
    })
    expect(response.statusCode).toBe(422)
  })

  it('repite la reserva con la misma clave sin duplicar la fila', async () => {
    const payload = { clientRequestId: randomUUID() }
    const first = await reserve(
      app.context,
      app.context.cookies.requester,
      payload,
    )
    const second = await reserve(
      app.context,
      app.context.cookies.requester,
      payload,
    )
    expect(first.statusCode).toBe(201)
    expect(second.statusCode).toBe(200)
    expect(attachmentIdOf(second)).toBe(attachmentIdOf(first))
    const count = await app.context.db.execute(sql`
      select count(*)::int as total
      from public.ticket_attachments
      where client_request_id = ${payload.clientRequestId}
    `)
    expect(count.rows[0]).toMatchObject({ total: 1 })
  })

  it('rechaza a un técnico sin permiso de alta', async () => {
    const response = await reserve(app.context, app.context.cookies.technician)
    expect(response.statusCode).toBe(403)
  })

  it('rechaza reservar para recaptura sin permiso', async () => {
    const response = await reserve(app.context, app.context.cookies.requester, {
      ticketId: app.context.ids.ticketA1,
    })
    expect(response.statusCode).toBe(403)
  })
})
