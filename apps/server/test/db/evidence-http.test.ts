import { randomUUID } from 'node:crypto'
import { rm } from 'node:fs/promises'

import { sql } from 'drizzle-orm'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { testConfig } from '../http/helpers.js'
import {
  authHeaders,
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'

let context: TicketHttpContext
let baseUrl: string

function metadata(values: Record<string, string>) {
  return Object.entries(values)
    .map(([key, value]) => `${key} ${Buffer.from(value).toString('base64')}`)
    .join(',')
}

async function createEvidence(cookie: string, type = 'before') {
  return context.app.inject({
    method: 'POST',
    url: `/api/tickets/${context.ids.ticketA1}/evidence`,
    headers: authHeaders(cookie),
    payload: { type, clientRequestId: randomUUID() },
  })
}

async function uploadImage(evidenceId: string, image: Buffer, cookie: string) {
  const post = await fetch(`${baseUrl}/api/uploads/${evidenceId}`, {
    method: 'POST',
    headers: {
      'Tus-Resumable': '1.0.0',
      'Upload-Length': String(image.length),
      'Upload-Metadata': metadata({
        evidenceId,
        ticketId: context.ids.ticketA1,
      }),
      Cookie: cookie,
      Origin: baseUrl,
    },
  })
  const location = post.headers.get('location')
  if (!location) throw new Error('TUS Location header missing')
  const patch = await fetch(location, {
    method: 'PATCH',
    headers: {
      'Tus-Resumable': '1.0.0',
      'Upload-Offset': '0',
      'Content-Type': 'application/offset+octet-stream',
      Cookie: cookie,
      Origin: baseUrl,
    },
    body: image,
  })
  return { post, patch }
}

beforeAll(async () => {
  await rm('./data/evidence-test', { recursive: true, force: true })
  context = await buildTicketHttpApp()
  baseUrl = await context.app.listen({ host: '127.0.0.1', port: 0 })
}, 60_000)

afterAll(async () => {
  await closeTicketHttpApp(context)
  await rm('./data/evidence-test', { recursive: true, force: true })
})

describe('evidence upload and delivery', () => {
  it('uploads an image with TUS, processes it and serves file and thumbnail', async () => {
    const created = await createEvidence(context.cookies.technician)
    expect(created.statusCode).toBe(201)
    const evidenceId = (created.json() as { evidence: { id: string } }).evidence
      .id
    const image = await sharp({
      create: {
        width: 40,
        height: 20,
        channels: 3,
        background: '#cc0000',
      },
    })
      .png()
      .toBuffer()

    const { post, patch } = await uploadImage(
      evidenceId,
      image,
      context.cookies.technician,
    )
    expect(post.status).toBe(201)
    expect(patch.status).toBe(204)

    const ready = await context.db.execute(sql`
      select processing_state, storage_path, thumbnail_path, width, height
      from public.evidence where id = ${evidenceId}
    `)
    expect(ready.rows[0]).toMatchObject({
      processing_state: 'ready',
      width: 40,
      height: 20,
    })
    expect((ready.rows[0] as { storage_path: string }).storage_path).toContain(
      '.webp',
    )

    const file = await fetch(`${baseUrl}/api/evidence/${evidenceId}/file`, {
      headers: { Cookie: context.cookies.technician },
    })
    expect(file.status).toBe(200)
    expect(file.headers.get('content-type')).toContain('image/webp')

    const thumbnail = await fetch(
      `${baseUrl}/api/evidence/${evidenceId}/thumbnail`,
      { headers: { Cookie: context.cookies.technician } },
    )
    expect(thumbnail.status).toBe(200)
    expect(thumbnail.headers.get('content-type')).toContain('image/webp')
  })
})

describe('evidence access', () => {
  it('lists evidence for a visible ticket', async () => {
    const response = await context.app.inject({
      method: 'GET',
      url: `/api/tickets/${context.ids.ticketA1}/evidence`,
      headers: authHeaders(context.cookies.technician),
    })
    expect(response.statusCode).toBe(200)
    const body = response.json() as {
      items: Array<{ processingState: string }>
    }
    expect(body.items.length).toBeGreaterThanOrEqual(1)
  })

  it('rejects work evidence for the requester', async () => {
    const response = await createEvidence(context.cookies.requester)
    expect(response.statusCode).toBe(403)
  })

  it('rejects an unauthenticated TUS upload', async () => {
    const created = await createEvidence(context.cookies.technician)
    const evidenceId = (created.json() as { evidence: { id: string } }).evidence
      .id
    const image = await sharp({
      create: {
        width: 10,
        height: 10,
        channels: 3,
        background: '#000000',
      },
    })
      .png()
      .toBuffer()
    const response = await fetch(`${baseUrl}/api/uploads`, {
      method: 'POST',
      headers: {
        'Tus-Resumable': '1.0.0',
        'Upload-Length': String(image.length),
        'Upload-Metadata': metadata({
          evidenceId,
          ticketId: context.ids.ticketA1,
        }),
        Origin: baseUrl,
      },
    })
    expect(response.status).toBe(401)
  })

  it('does not expose a file outside the actor scope', async () => {
    const row = await context.db.execute(sql`
      select id from public.evidence
      where processing_state = 'ready'
      limit 1
    `)
    const evidenceId = (row.rows[0] as { id: string }).id
    const response = await fetch(`${baseUrl}/api/evidence/${evidenceId}/file`, {
      headers: { Cookie: context.cookies.outsider },
    })
    expect(response.status).toBe(404)
  })
})

describe('evidence authorization by type', () => {
  it('allows the requester to attach claim evidence', async () => {
    const response = await createEvidence(context.cookies.requester, 'claim')
    expect(response.statusCode).toBe(201)
  })

  it('allows the requester to attach the request photo', async () => {
    const response = await createEvidence(context.cookies.requester, 'request')
    expect(response.statusCode).toBe(201)
  })

  it('rejects other evidence for the requester', async () => {
    const response = await createEvidence(context.cookies.requester, 'other')
    expect(response.statusCode).toBe(403)
  })

  it('allows the supervisor to attach work evidence', async () => {
    const response = await createEvidence(context.cookies.supervisor, 'before')
    expect(response.statusCode).toBe(201)
  })

  it('rejects claim evidence for a technician', async () => {
    const response = await createEvidence(context.cookies.technician, 'claim')
    expect(response.statusCode).toBe(403)
  })
})

describe('evidence quota', () => {
  it('rejects the upload before writing it when the quota is full', async () => {
    const created = await createEvidence(context.cookies.technician)
    expect(created.statusCode).toBe(201)
    const evidenceId = (created.json() as { evidence: { id: string } }).evidence
      .id

    const user = await context.db.execute(sql`
      select id from public.users where username = 'technician-access'
    `)
    const userId = (user.rows[0] as { id: string }).id
    await context.db.execute(sql`
      insert into public.evidence (
        ticket_id, cycle, type, uploaded_by, processing_state, size_bytes
      ) values (
        ${context.ids.ticketA1}, 1, 'other', ${userId}, 'ready', 1000
      )
    `)

    const original = testConfig.EVIDENCE_QUOTA_BYTES
    testConfig.EVIDENCE_QUOTA_BYTES = 1000
    try {
      const image = Buffer.alloc(20, 1)
      const response = await fetch(`${baseUrl}/api/uploads/${evidenceId}`, {
        method: 'POST',
        headers: {
          'Tus-Resumable': '1.0.0',
          'Upload-Length': String(image.length),
          'Upload-Metadata': metadata({
            evidenceId,
            ticketId: context.ids.ticketA1,
          }),
          Cookie: context.cookies.technician,
          Origin: baseUrl,
        },
      })
      expect(response.status).toBe(413)
    } finally {
      testConfig.EVIDENCE_QUOTA_BYTES = original
    }
  })
})
