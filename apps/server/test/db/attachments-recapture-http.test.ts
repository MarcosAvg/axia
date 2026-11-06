import { randomUUID } from 'node:crypto'

import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { AttachmentMimeType } from '../../src/attachments/types.js'
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
import {
  loadWriteRefs,
  takeTicket,
  type WriteRefs,
} from './tickets-write-helpers.js'

let app: AttachmentHttpContext
let refs: WriteRefs
let problemC: string
let problemD: string

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
    description: 'Captura inicial para recaptura',
    requesterId: refs.requesterId,
    clientRequestId: randomUUID(),
    ...overrides,
  }
}

async function createTicket(overrides: Record<string, unknown> = {}) {
  const response = await app.context.app.inject({
    method: 'POST',
    url: '/api/tickets',
    headers: authHeaders(app.context.cookies.requester),
    payload: ticketBody(overrides),
  })
  expect(response.statusCode).toBe(201)
  return (response.json() as { ticket: { id: string } }).ticket.id
}

async function attach(problemId = problemC): Promise<string> {
  const created = await reserve(app.context, app.context.cookies.requester, {
    problemId,
  })
  const attachmentId = attachmentIdOf(created)
  await uploadAttachment(
    app.baseUrl,
    attachmentId,
    pdf(),
    app.context.cookies.requester,
  )
  return attachmentId
}

async function attachForRecapture(
  ticketId: string,
  problemId = problemC,
): Promise<string> {
  const created = await reserve(app.context, app.context.cookies.supervisor, {
    problemId,
    ticketId,
  })
  const attachmentId = attachmentIdOf(created)
  await uploadAttachment(
    app.baseUrl,
    attachmentId,
    pdf(),
    app.context.cookies.supervisor,
  )
  return attachmentId
}

async function recapture(
  ticketId: string,
  changes: Record<string, unknown>,
  attachmentId?: string,
) {
  return app.context.app.inject({
    method: 'POST',
    url: `/api/tickets/${ticketId}/actions`,
    headers: authHeaders(app.context.cookies.supervisor),
    payload: {
      action: 'recapture',
      changes,
      clientRequestId: randomUUID(),
      attachmentId,
    },
  })
}

async function addProblem(name: string): Promise<string> {
  const result = await app.context.db.execute(sql`
    insert into public.problems (subcategory_id, team_id, name)
    values (${refs.subcategoryId}, ${refs.teamId}, ${name})
    returning id
  `)
  return (result.rows[0] as { id: string }).id
}

async function setTypes(problemId: string, types: AttachmentMimeType[]) {
  const array = sql`array[${sql.join(
    types.map((type) => sql`${type}`),
    sql`, `,
  )}]::text[]`
  await app.context.db.execute(sql`
    update public.problems set attachment_required_types = ${array}
    where id = ${problemId}
  `)
}

beforeAll(async () => {
  app = await buildAttachmentHttpApp()
  refs = await loadWriteRefs(app.context)
  await setProblemTypes(app.context, [])
  problemC = await addProblem('Problema C con PDF')
  problemD = await addProblem('Problema D con PDF')
  await setTypes(problemC, ['application/pdf'])
  await setTypes(problemD, ['application/pdf'])
}, 60_000)

afterAll(async () => {
  await closeAttachmentHttpApp(app)
})

describe('recaptura con problema que exige adjunto', () => {
  it('rechaza el cambio de problema sin adjunto', async () => {
    const ticketId = await createTicket()
    await takeTicket(app.context, ticketId)
    const response = await recapture(ticketId, { problemId: problemC })
    expect(response.statusCode).toBe(422)
  })

  it('liga el adjunto al cambiar a un problema que lo exige', async () => {
    const ticketId = await createTicket()
    await takeTicket(app.context, ticketId)
    const attachmentId = await attachForRecapture(ticketId)
    const response = await recapture(
      ticketId,
      { problemId: problemC },
      attachmentId,
    )
    expect(response.statusCode).toBe(200)
    const linked = await app.context.db.execute(sql`
      select ticket_id from public.ticket_attachments where id = ${attachmentId}
    `)
    expect(linked.rows[0]).toMatchObject({ ticket_id: ticketId })
    const event = await app.context.db.execute(sql`
      select type from public.ticket_events
      where ticket_id = ${ticketId} and type = 'attachment_added'
    `)
    expect(event.rows).toHaveLength(1)
  })

  it('reutiliza un adjunto compatible ya ligado', async () => {
    const attachmentId = await attach()
    const ticketId = await createTicket({
      problemId: problemC,
      attachmentId,
    })
    await takeTicket(app.context, ticketId)
    const response = await recapture(ticketId, { problemId: problemD })
    expect(response.statusCode).toBe(200)
    const count = await app.context.db.execute(sql`
      select count(*)::int as total
      from public.ticket_attachments where ticket_id = ${ticketId}
    `)
    expect(count.rows[0]).toMatchObject({ total: 1 })
  })

  it('no bloquea un tiquet histórico si el problema no cambia', async () => {
    const ticketId = await createTicket()
    await setProblemTypes(app.context, ['application/pdf'])
    try {
      await takeTicket(app.context, ticketId)
      const response = await recapture(ticketId, {
        description: 'Solo corrige el texto',
      })
      expect(response.statusCode).toBe(200)
    } finally {
      await setProblemTypes(app.context, [])
    }
  })
})
