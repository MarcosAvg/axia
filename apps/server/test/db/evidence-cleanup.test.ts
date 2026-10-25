import { randomUUID } from 'node:crypto'
import { access, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { cleanupPendingEvidence } from '../../src/evidence/cleanup.js'
import { ensureStorage, storagePaths } from '../../src/evidence/paths.js'
import {
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'

let context: TicketHttpContext
let directory: string

async function exists(path: string) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

beforeAll(async () => {
  context = await buildTicketHttpApp()
  directory = await mkdtemp(join(tmpdir(), 'axia-evidence-cleanup-'))
}, 60_000)

afterAll(async () => {
  await closeTicketHttpApp(context)
  await rm(directory, { recursive: true, force: true })
})

describe('evidence cleanup', () => {
  it('removes abandoned upload files and marks the row failed', async () => {
    const paths = storagePaths(directory)
    await ensureStorage(paths)
    const abandoned = randomUUID()
    await context.db.execute(sql`
      insert into public.evidence (
        id, ticket_id, cycle, type, processing_state, created_at
      ) values (
        ${abandoned}, ${context.ids.ticketA1}, 1, 'other', 'pending',
        now() - interval '2 days'
      )
    `)
    await writeFile(join(paths.uploads, abandoned), 'parcial')
    await writeFile(join(paths.uploads, `${abandoned}.json`), '{}')

    const recent = randomUUID()
    await context.db.execute(sql`
      insert into public.evidence (
        id, ticket_id, cycle, type, processing_state
      ) values (
        ${recent}, ${context.ids.ticketA1}, 1, 'other', 'pending'
      )
    `)
    await writeFile(join(paths.uploads, recent), 'reciente')

    const result = await cleanupPendingEvidence(context.db, paths, 24)
    expect(result.rows).toBe(1)
    expect(await exists(join(paths.uploads, abandoned))).toBe(false)
    expect(await exists(join(paths.uploads, `${abandoned}.json`))).toBe(false)
    expect(await exists(join(paths.uploads, recent))).toBe(true)

    const rows = await context.db.execute(sql`
      select id, processing_state, processing_error
      from public.evidence
      where id in (${abandoned}, ${recent})
      order by id
    `)
    const abandonedRow = rows.rows.find(
      (row) => (row as { id: string }).id === abandoned,
    ) as { processing_state: string; processing_error: string | null }
    const recentRow = rows.rows.find(
      (row) => (row as { id: string }).id === recent,
    ) as { processing_state: string; processing_error: string | null }
    expect(abandonedRow.processing_state).toBe('failed')
    expect(abandonedRow.processing_error).toBe('Subida abandonada')
    expect(recentRow.processing_state).toBe('pending')
  })
})
