import { createHash, randomUUID } from 'node:crypto'
import { mkdir, open, rm } from 'node:fs/promises'
import { join } from 'node:path'

import type { Client } from 'pg'
import sharp from 'sharp'

export type DemoEvidenceStorage = {
  directory: string
  createdFiles: string[]
}

type DemoEvidence = {
  ticketId: string
  actorId: string
  technicianId: string
  type: 'before' | 'after'
  at: Date
}

async function writeDemoImage(storage: DemoEvidenceStorage, type: string) {
  const id = randomUUID()
  const svg =
    Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">
    <rect width="640" height="360" fill="#e2e8f0"/>
    <text x="32" y="140" font-size="40" fill="#0f172a">AXIA DEMO</text>
    <text x="32" y="210" font-size="24" fill="#0f172a">Evidencia ficticia: ${type}</text>
    </svg>`)
  const { data, info } = await sharp(svg)
    .webp()
    .toBuffer({ resolveWithObject: true })
  const thumbnail = await sharp(data).resize({ width: 320 }).webp().toBuffer()
  const storagePath = `files/${id}.webp`
  const thumbnailPath = `files/${id}.thumb.webp`
  await mkdir(join(storage.directory, 'files'), {
    recursive: true,
    mode: 0o700,
  })
  for (const [relative, bytes] of [
    [storagePath, data],
    [thumbnailPath, thumbnail],
  ] as const) {
    const absolute = join(storage.directory, relative)
    const file = await open(absolute, 'wx', 0o600)
    storage.createdFiles.push(absolute)
    try {
      await file.writeFile(bytes)
    } finally {
      await file.close()
    }
  }
  return { id, data, info, storagePath, thumbnailPath }
}

export async function insertDemoEvidence(
  client: Client,
  storage: DemoEvidenceStorage,
  evidence: DemoEvidence,
) {
  const image = await writeDemoImage(storage, evidence.type)
  const requestId = randomUUID()
  const event = await client.query<{ id: string }>(
    `insert into public.ticket_events (
       ticket_id, cycle, type, actor_id, occurred_at, client_request_id, payload
     ) values ($1, 1, 'evidence_added', $2, $3, $4, $5::jsonb) returning id`,
    [
      evidence.ticketId,
      evidence.actorId,
      evidence.at,
      requestId,
      JSON.stringify({ evidenceId: image.id, type: evidence.type, demo: true }),
    ],
  )
  await client.query(
    `insert into public.evidence (
       id, ticket_id, cycle, event_id, type, storage_path, thumbnail_path,
       mime_type, size_bytes, captured_by_technician_id, captured_by_user_id,
       uploaded_by, occurred_at, client_request_id, sha256, width, height,
       processing_state, processed_at
     ) values ($1, $2, 1, $3, $4, $5, $6, 'image/webp', $7, $8, $9, $9,
       $10, $11, $12, $13, $14, 'ready', now())`,
    [
      image.id,
      evidence.ticketId,
      event.rows[0]?.id,
      evidence.type,
      image.storagePath,
      image.thumbnailPath,
      image.data.length,
      evidence.technicianId,
      evidence.actorId,
      evidence.at,
      requestId,
      createHash('sha256').update(image.data).digest('hex'),
      image.info.width,
      image.info.height,
    ],
  )
}

export async function removeDemoFiles(storage: DemoEvidenceStorage) {
  await Promise.all(
    storage.createdFiles.map((path) => rm(path, { force: true })),
  )
}
