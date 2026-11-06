import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { cleanupPendingAttachments } from '../../src/attachments/cleanup.js'
import {
  attachmentPaths,
  ensureAttachmentStorage,
} from '../../src/attachments/paths.js'
import { testConfig } from '../http/helpers.js'
import {
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'

let context: TicketHttpContext
let userId: string
const paths = attachmentPaths(testConfig.STORAGE_DIR)

async function insertAttachment(
  values: {
    state?: string
    ticketId?: string | null
    storagePath?: string | null
  } = {},
): Promise<string> {
  const id = randomUUID()
  await context.db.execute(sql`
    insert into public.ticket_attachments (
      id, ticket_id, problem_id, client_request_id, uploaded_by,
      original_name, declared_mime_type, mime_type, size_bytes,
      storage_path, processing_state, created_at, linked_at
    ) values (
      ${id}, ${values.ticketId ?? null}, ${context.catalog.problemA.id},
      ${randomUUID()}, ${userId}, 'archivo.pdf', 'application/pdf',
      ${values.state === 'ready' ? 'application/pdf' : null},
      ${values.state === 'ready' ? 10 : null},
      ${values.storagePath ?? null}, ${values.state ?? 'pending'},
      now() - interval '48 hours', ${values.ticketId ? new Date() : null}
    )
  `)
  return id
}

beforeAll(async () => {
  context = await buildTicketHttpApp()
  await ensureAttachmentStorage(paths)
  const user = await context.db.execute(sql`
    select id from public.users where username = 'requester-access'
  `)
  userId = (user.rows[0] as { id: string }).id
}, 60_000)

afterAll(async () => {
  await closeTicketHttpApp(context)
})

describe('limpieza de adjuntos abandonados', () => {
  it('marca y borra las preparaciones sin ligar, y respeta las ligadas', async () => {
    const pendingId = await insertAttachment()
    const pendingFile = join(paths.uploads, pendingId)
    await writeFile(pendingFile, 'parcial')

    const readyId = await insertAttachment({ state: 'ready' })
    const readyRelative = `files/attachments/${readyId}.pdf`
    const readyFile = join(paths.files, `${readyId}.pdf`)
    await mkdir(paths.files, { recursive: true })
    await writeFile(readyFile, '%PDF-1.4')
    await context.db.execute(sql`
      update public.ticket_attachments
      set storage_path = ${readyRelative}
      where id = ${readyId}
    `)

    const linkedId = await insertAttachment({
      state: 'ready',
      ticketId: context.ids.ticketA1,
    })
    const linkedRelative = `files/attachments/${linkedId}.pdf`
    const linkedFile = join(paths.files, `${linkedId}.pdf`)
    await writeFile(linkedFile, '%PDF-1.4')
    await context.db.execute(sql`
      update public.ticket_attachments
      set storage_path = ${linkedRelative}
      where id = ${linkedId}
    `)

    const result = await cleanupPendingAttachments(context.db, paths, 24)
    expect(result.rows).toBeGreaterThanOrEqual(2)

    const rows = await context.db.execute(sql`
      select id, processing_state
      from public.ticket_attachments
      where id in (${pendingId}, ${readyId}, ${linkedId})
    `)
    const byId = new Map(
      (rows.rows as { id: string; processing_state: string }[]).map((row) => [
        row.id,
        row.processing_state,
      ]),
    )
    expect(byId.get(pendingId)).toBe('failed')
    expect(byId.get(readyId)).toBe('failed')
    expect(byId.get(linkedId)).toBe('ready')
    expect(existsSync(pendingFile)).toBe(false)
    expect(existsSync(readyFile)).toBe(false)
    expect(existsSync(linkedFile)).toBe(true)
  })
})
