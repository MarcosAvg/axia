import { randomUUID } from 'node:crypto'

import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  attachmentIdOf,
  buildAttachmentHttpApp,
  closeAttachmentHttpApp,
  pdf,
  reserve,
  setProblemTypes,
  uploadAttachment,
  type AttachmentHttpContext,
} from './attachments-http-helpers.js'
import { authHeaders } from './tickets-http-helpers.js'
import { loadWriteRefs, type WriteRefs } from './tickets-write-helpers.js'

let app: AttachmentHttpContext
let refs: WriteRefs

function ticketBody(overrides: Record<string, unknown> = {}) {
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
    ...overrides,
  }
}

async function createTicket(
  cookie: string,
  payload: Record<string, unknown> = {},
) {
  return app.context.app.inject({
    method: 'POST',
    url: '/api/tickets',
    headers: authHeaders(cookie),
    payload: ticketBody(payload),
  })
}

async function readyAttachment(cookie: string) {
  const created = await reserve(app.context, cookie)
  const attachmentId = attachmentIdOf(created)
  await uploadAttachment(app.baseUrl, attachmentId, pdf(), cookie)
  return attachmentId
}

beforeAll(async () => {
  app = await buildAttachmentHttpApp()
  refs = await loadWriteRefs(app.context)
}, 60_000)

afterAll(async () => {
  await closeAttachmentHttpApp(app)
})

describe('alta con adjunto obligatorio', () => {
  it('rechaza el alta sin el adjunto que exige el problema', async () => {
    const response = await createTicket(app.context.cookies.requester)
    expect(response.statusCode).toBe(422)
  })

  it('liga el adjunto y escribe el evento en la misma transacción', async () => {
    const attachmentId = await readyAttachment(app.context.cookies.requester)
    const response = await createTicket(app.context.cookies.requester, {
      attachmentId,
    })
    expect(response.statusCode).toBe(201)
    const ticketId = (response.json() as { ticket: { id: string } }).ticket.id
    const linked = await app.context.db.execute(sql`
      select ticket_id, linked_at
      from public.ticket_attachments
      where id = ${attachmentId}
    `)
    expect(linked.rows[0]).toMatchObject({ ticket_id: ticketId })
    expect(linked.rows[0]?.linked_at).not.toBeNull()
    const events = await app.context.db.execute(sql`
      select type, payload
      from public.ticket_events
      where ticket_id = ${ticketId}
      order by id
    `)
    expect(events.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'attachment_added' }),
      ]),
    )
  })
})

describe('validación del adjunto en el alta', () => {
  it('rechaza un adjunto de otra persona', async () => {
    const attachmentId = await readyAttachment(app.context.cookies.requester)
    const response = await createTicket(app.context.cookies.admin, {
      attachmentId,
    })
    expect([404, 422]).toContain(response.statusCode)
  })

  it('rechaza un adjunto cuyo tipo ya no corresponde al problema', async () => {
    const attachmentId = await readyAttachment(app.context.cookies.requester)
    await setProblemTypes(app.context, ['image/jpeg'])
    try {
      const response = await createTicket(app.context.cookies.requester, {
        attachmentId,
      })
      expect(response.statusCode).toBe(422)
    } finally {
      await setProblemTypes(app.context, ['application/pdf'])
    }
  })

  it('no reutiliza un adjunto ya ligado a otro tiquet', async () => {
    const attachmentId = await readyAttachment(app.context.cookies.requester)
    const first = await createTicket(app.context.cookies.requester, {
      attachmentId,
    })
    expect(first.statusCode).toBe(201)
    const second = await createTicket(app.context.cookies.requester, {
      attachmentId,
    })
    expect(second.statusCode).toBe(422)
  })
})

describe('idempotencia del alta con adjunto', () => {
  it('repite el alta sin duplicar el vínculo ni el evento', async () => {
    const attachmentId = await readyAttachment(app.context.cookies.requester)
    const clientRequestId = randomUUID()
    const first = await createTicket(app.context.cookies.requester, {
      attachmentId,
      clientRequestId,
    })
    const second = await createTicket(app.context.cookies.requester, {
      attachmentId,
      clientRequestId,
    })
    expect(first.statusCode).toBe(201)
    expect(second.statusCode).toBe(200)
    const ticketId = (first.json() as { ticket: { id: string } }).ticket.id
    const links = await app.context.db.execute(sql`
      select count(*)::int as total
      from public.ticket_attachments
      where ticket_id = ${ticketId}
    `)
    expect(links.rows[0]).toMatchObject({ total: 1 })
    const events = await app.context.db.execute(sql`
      select count(*)::int as total
      from public.ticket_events
      where ticket_id = ${ticketId} and type = 'attachment_added'
    `)
    expect(events.rows[0]).toMatchObject({ total: 1 })
  })
})
