import { randomUUID } from 'node:crypto'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Client } from 'pg'
import sharp from 'sharp'
import { afterAll, beforeAll, expect, it } from 'vitest'

import { loadActor } from '../../src/auth/authorization.js'
import { createDb } from '../../src/db/client.js'
import { ID } from '../../src/db/seed-demo/data.js'
import { insertDemoEvidence } from '../../src/db/seed-demo/evidence.js'
import { attendTicket } from '../../src/tickets/work.js'
import { validateTicket } from '../../src/tickets/validation.js'
import { seedDemo } from '../../src/db/seed-demo/index.js'
import { takeTicket } from '../../src/tickets/take.js'
import { exerciseDemoPauses } from './demo-pause-flow.js'
import { ownerConnectionString, prepareTestDatabase } from './helpers.js'

let owner: Client
let evidenceDir: string
const password = 'DemoPassword123!'
const registered = 'de000000-0000-4000-8000-000000000001'
const CURATED_IDS = `
  'de000000-0000-4000-8000-000000000001',
  'de000000-0000-4000-8000-000000000002',
  'de000000-0000-4000-8000-000000000003',
  'de000000-0000-4000-8000-000000000004',
  'de000000-0000-4000-8000-000000000005',
  'de000000-0000-4000-8000-000000000006'
`

beforeAll(async () => {
  evidenceDir = await mkdtemp(join(tmpdir(), 'axia-demo-flow-'))
  await prepareTestDatabase()
  owner = new Client({ connectionString: ownerConnectionString() })
  await owner.connect()
}, 60_000)

afterAll(async () => {
  await owner?.end()
  await rm(evidenceDir, { recursive: true, force: true })
})

it('rolls back failed evidence creation and removes only files from this attempt', async () => {
  const preserved = join(evidenceDir, 'existing.txt')
  await writeFile(preserved, 'preserve')
  await owner.query(`create function public.fail_demo_evidence() returns trigger
    language plpgsql as $$ begin raise exception 'demo fixture failure'; end $$`)
  await owner.query(`create trigger fail_demo_evidence before insert on public.evidence
    for each row execute function public.fail_demo_evidence()`)
  try {
    await expect(seedDemo(owner, { password, evidenceDir })).rejects.toThrow(
      'demo fixture failure',
    )
    expect((await owner.query('select id from public.tickets')).rows).toEqual(
      [],
    )
    expect(await readdir(join(evidenceDir, 'files'))).toEqual([])
    expect(await readFile(preserved, 'utf8')).toBe('preserve')
  } finally {
    await owner.query('drop trigger fail_demo_evidence on public.evidence')
    await owner.query('drop function public.fail_demo_evidence()')
  }
  await seedDemo(owner, { password, evidenceDir })
})

it('keeps historical evidence backed by readable images and events', async () => {
  const result = await owner.query<{
    storage_path: string
    thumbnail_path: string
    size_bytes: string
    width: number
    height: number
    event_type: string
  }>(`select ev.*, e.type::text as event_type from public.evidence ev
      join public.ticket_events e on e.id = ev.event_id
      where ev.processing_state = 'ready'
        and ev.ticket_id in (${CURATED_IDS})`)
  expect(result.rows).toHaveLength(5)
  for (const row of result.rows) {
    const data = await readFile(join(evidenceDir, row.storage_path))
    expect(data.length).toBe(Number(row.size_bytes))
    expect(await sharp(data).metadata()).toMatchObject({
      format: 'webp',
      width: row.width,
      height: row.height,
    })
    expect(
      (await readFile(join(evidenceDir, row.thumbnail_path))).length,
    ).toBeGreaterThan(0)
    expect(row.event_type).toBe('evidence_added')
  }
})

it('records both validations, work descriptions and correct participation', async () => {
  const validations =
    await owner.query(`select validator_role from public.ticket_validations
    where ticket_id = 'de000000-0000-4000-8000-000000000006' order by validator_role`)
  expect(validations.rows).toEqual([
    { validator_role: 'requester' },
    { validator_role: 'supervisor' },
  ])
  const work = await owner.query(
    `select payload from public.ticket_events
     where type = 'attended' and ticket_id in (${CURATED_IDS})`,
  )
  expect(work.rows).toHaveLength(2)
  for (const row of work.rows)
    expect(row.payload.workDescription).toEqual(expect.any(String))
  const support =
    await owner.query(`select participation_type from public.ticket_participants
    where ticket_id = 'de000000-0000-4000-8000-000000000004'`)
  expect(support.rows).toEqual([{ participation_type: 'auxiliary' }])
  const assignments = await owner.query<{
    status: string
    ended_at: Date | null
    closed_at: Date | null
  }>(`select t.status::text, a.ended_at, t.closed_at
    from public.ticket_assignments a join public.tickets t on t.id = a.ticket_id
    where a.stage = 'technician' and a.ticket_id in (${CURATED_IDS})`)
  for (const row of assignments.rows) {
    expect(row.ended_at).toEqual(row.status === 'closed' ? row.closed_at : null)
  }
  const participants = await owner.query<{
    status: string
    ended_at: Date | null
    closed_at: Date | null
  }>(`select t.status::text, p.ended_at, t.closed_at
    from public.ticket_participants p join public.tickets t on t.id = p.ticket_id
    where p.ticket_id in (${CURATED_IDS})`)
  for (const row of participants.rows) {
    expect(row.ended_at).toEqual(row.status === 'closed' ? row.closed_at : null)
  }
})

it('repairs missing offers on untouched registered demo tickets without changing history', async () => {
  await owner.query('delete from public.ticket_offers where ticket_id = $1', [
    registered,
  ])
  const before = await owner.query(
    'select * from public.ticket_events order by id',
  )
  await seedDemo(owner, { password, evidenceDir })
  const offers = await owner.query(
    `select status from public.ticket_offers where ticket_id = $1`,
    [registered],
  )
  expect(offers.rows).toEqual([{ status: 'offered' }])
  expect(
    (await owner.query('select * from public.ticket_events order by id')).rows,
  ).toEqual(before.rows)
})

it('lets the demo supervisor take its offer and preserves operated tickets on reapply', async () => {
  const { db, pool } = createDb(ownerConnectionString())
  try {
    const actor = await loadActor(db, ID.userSupervisor)
    if (!actor) throw new Error('Demo supervisor not found')
    const requestId = randomUUID()
    await expect(
      takeTicket(db, actor, registered, requestId),
    ).resolves.toMatchObject({ replayed: false })
    await expect(
      takeTicket(db, actor, registered, requestId),
    ).resolves.toMatchObject({ replayed: true })
    const before = await owner.query(
      'select * from public.ticket_events order by id',
    )
    await seedDemo(owner, { password, evidenceDir })
    expect(
      (await owner.query('select * from public.ticket_events order by id'))
        .rows,
    ).toEqual(before.rows)
    expect(
      (
        await owner.query(
          'select status from public.ticket_offers where ticket_id = $1',
          [registered],
        )
      ).rows,
    ).toEqual([{ status: 'taken' }])
  } finally {
    await pool.end()
  }
})

it('does not restore offers after a registered ticket has user activity', async () => {
  const id = 'de000000-0000-4000-8000-000000000002'
  await owner.query(
    "update public.tickets set status = 'registered' where id = $1",
    [id],
  )
  await owner.query('delete from public.ticket_offers where ticket_id = $1', [
    id,
  ])
  await seedDemo(owner, { password, evidenceDir })
  expect(
    (
      await owner.query(
        'select id from public.ticket_offers where ticket_id = $1',
        [id],
      )
    ).rows,
  ).toEqual([])
})

it('advances the in-progress demo through every pause root, attendance and both validations', async () => {
  const { db, pool } = createDb(ownerConnectionString())
  const ticketId = 'de000000-0000-4000-8000-000000000004'
  try {
    const technician = await loadActor(db, ID.userTechnician)
    const supervisor = await loadActor(db, ID.userSupervisor)
    if (!technician || !supervisor) throw new Error('Demo actors not found')
    await exerciseDemoPauses(owner, db, technician, ticketId)
    await insertDemoEvidence(
      owner,
      { directory: evidenceDir, createdFiles: [] },
      {
        ticketId,
        actorId: technician.id,
        technicianId: ID.technicianLead,
        type: 'after',
        at: new Date(),
      },
    )
    await expect(
      attendTicket(db, technician, {
        ticketId,
        workDescription: 'Trabajo demo completado tras probar pausas',
        clientRequestId: randomUUID(),
      }),
    ).resolves.toMatchObject({ replayed: false })
    const requesterRow = await owner.query<{ requester_id: string }>(
      'select requester_id from public.tickets where id = $1',
      [ticketId],
    )
    const requesterId = requesterRow.rows[0]?.requester_id
    if (!requesterId) throw new Error('Demo requester not found')
    await validateTicket(db, supervisor, {
      ticketId,
      clientRequestId: randomUUID(),
      subjectRequesterId: requesterId,
    })
    expect(
      (
        await owner.query('select status from public.tickets where id = $1', [
          ticketId,
        ])
      ).rows,
    ).toEqual([{ status: 'attended' }])
    await validateTicket(db, supervisor, {
      ticketId,
      clientRequestId: randomUUID(),
    })
    expect(
      (
        await owner.query('select status from public.tickets where id = $1', [
          ticketId,
        ])
      ).rows,
    ).toEqual([{ status: 'closed' }])
  } finally {
    await pool.end()
  }
})
