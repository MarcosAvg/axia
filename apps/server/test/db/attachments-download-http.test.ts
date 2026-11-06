import { randomUUID } from 'node:crypto'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  attachmentIdOf,
  buildAttachmentHttpApp,
  closeAttachmentHttpApp,
  pdf,
  reserve,
  uploadAttachment,
  type AttachmentHttpContext,
} from './attachments-http-helpers.js'
import { authHeaders } from './tickets-http-helpers.js'
import { loadWriteRefs, type WriteRefs } from './tickets-write-helpers.js'

let app: AttachmentHttpContext
let refs: WriteRefs

function ticketBody(attachmentId: string) {
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
    description: 'Falla con documento obligatorio',
    requesterId: refs.requesterId,
    clientRequestId: randomUUID(),
    attachmentId,
  }
}

async function linkedAttachment() {
  const created = await reserve(app.context, app.context.cookies.requester)
  const attachmentId = attachmentIdOf(created)
  await uploadAttachment(
    app.baseUrl,
    attachmentId,
    pdf(),
    app.context.cookies.requester,
  )
  const ticket = await app.context.app.inject({
    method: 'POST',
    url: '/api/tickets',
    headers: authHeaders(app.context.cookies.requester),
    payload: ticketBody(attachmentId),
  })
  expect(ticket.statusCode).toBe(201)
  return {
    attachmentId,
    ticketId: (ticket.json() as { ticket: { id: string } }).ticket.id,
  }
}

beforeAll(async () => {
  app = await buildAttachmentHttpApp()
  refs = await loadWriteRefs(app.context)
}, 60_000)

afterAll(async () => {
  await closeAttachmentHttpApp(app)
})

describe('lista de adjuntos', () => {
  it('devuelve los adjuntos ligados del tiquet', async () => {
    const { ticketId } = await linkedAttachment()
    const response = await app.context.app.inject({
      method: 'GET',
      url: `/api/tickets/${ticketId}/attachments`,
      headers: authHeaders(app.context.cookies.requester),
    })
    expect(response.statusCode).toBe(200)
    const body = response.json() as {
      items: {
        fileName: string
        mimeType: string
        sizeBytes: number
        uploadedByName: string
      }[]
    }
    expect(body.items).toHaveLength(1)
    expect(body.items[0]).toMatchObject({
      fileName: 'cotizacion.pdf',
      mimeType: 'application/pdf',
    })
    expect(body.items[0]?.sizeBytes).toBeGreaterThan(0)
    expect(body.items[0]?.uploadedByName).toBeTruthy()
  })

  it('oculta el tiquet a quien no tiene alcance', async () => {
    const { ticketId } = await linkedAttachment()
    const response = await app.context.app.inject({
      method: 'GET',
      url: `/api/tickets/${ticketId}/attachments`,
      headers: authHeaders(app.context.cookies.outsider),
    })
    expect(response.statusCode).toBe(404)
  })
})

describe('descarga de adjuntos', () => {
  it('entrega el archivo como descarga con cabeceras seguras', async () => {
    const { attachmentId } = await linkedAttachment()
    const response = await fetch(
      `${app.baseUrl}/api/attachments/${attachmentId}/file`,
      { headers: { Cookie: app.context.cookies.requester } },
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/pdf')
    expect(response.headers.get('content-disposition')).toContain('attachment')
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(response.headers.get('cache-control')).toContain('no-store')
    const body = Buffer.from(await response.arrayBuffer())
    expect(body.subarray(0, 5).toString()).toBe('%PDF-')
  })

  it('no descarga un adjunto en preparación o sin ligar', async () => {
    const created = await reserve(app.context, app.context.cookies.requester)
    const attachmentId = attachmentIdOf(created)
    await uploadAttachment(
      app.baseUrl,
      attachmentId,
      pdf(),
      app.context.cookies.requester,
    )
    const response = await fetch(
      `${app.baseUrl}/api/attachments/${attachmentId}/file`,
      { headers: { Cookie: app.context.cookies.requester } },
    )
    expect(response.status).toBe(404)
  })

  it('rechaza a un usuario sin permiso de lectura', async () => {
    const { attachmentId } = await linkedAttachment()
    const response = await app.context.app.inject({
      method: 'GET',
      url: `/api/attachments/${attachmentId}/file`,
      headers: authHeaders(app.context.cookies.noAccess),
    })
    expect(response.statusCode).toBe(403)
  })
})
