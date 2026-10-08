// Evidencia offline: comprime, guarda en Dexie y encola la subida reanudable + `evidence_add`.

import { db } from '@/lib/offline/db'
import { compressImage } from '@/lib/offline/image'
import {
  enqueue,
  processOutbox,
  registerOutboxHandler,
} from '@/lib/offline/outbox'
import { uploadResumable } from '@/lib/offline/tus'
import { getRuntimeConfig } from '@/lib/runtime-config'
import { supabase } from '@/lib/supabase'
import { EVIDENCE_TYPES } from '../domain/types'
import type { EvidenceType } from '../domain/types'

const BUCKET = 'evidence'
const EVIDENCE_UPLOAD = 'evidence_upload'

function endpoint(): string {
  return `${getRuntimeConfig().supabaseUrl}/storage/v1/upload/resumable`
}

/** Comprime el archivo, lo guarda en el dispositivo y encola su subida. */
export async function queueEvidence(params: {
  ticketId: string
  cycle: number
  type: EvidenceType
  file: File
}): Promise<string> {
  const id = crypto.randomUUID()
  const blob = await compressImage(params.file)
  await db.evidences.add({
    id,
    ticketId: params.ticketId,
    cycle: params.cycle,
    type: params.type,
    blob,
    mimeType: blob.type || params.file.type,
    fileName: params.file.name,
    state: 'pending',
    progress: 0,
    createdAt: Date.now(),
  })
  await enqueue(EVIDENCE_UPLOAD, { evidenceId: id })
  void processOutbox()
  return id
}

async function uploadEvidenceItem(payload: unknown): Promise<void> {
  const { evidenceId } = payload as { evidenceId: string }
  const evidence = await db.evidences.get(evidenceId)
  if (!evidence || evidence.state === 'uploaded') return
  const type = EVIDENCE_TYPES.find((candidate) => candidate === evidence.type)
  if (!type) throw new Error('Tipo de evidencia inválido')

  const session = await supabase.auth.getSession()
  const token = session.data.session?.access_token
  if (!token) throw new Error('Sin sesión')

  await db.evidences.update(evidenceId, { state: 'uploading', progress: 0 })
  const storagePath = `tickets/${evidence.ticketId}/${evidence.cycle}/${evidence.id}.jpg`
  let reported = -1
  await uploadResumable({
    endpoint: endpoint(),
    token,
    bucket: BUCKET,
    path: storagePath,
    blob: evidence.blob,
    mimeType: evidence.mimeType,
    onProgress: (percentage) => {
      if (percentage !== reported) {
        reported = percentage
        void db.evidences.update(evidenceId, { progress: percentage })
      }
    },
  })
  const { error } = await supabase.rpc('evidence_add', {
    p_ticket_id: evidence.ticketId,
    p_type: type,
    p_storage_path: storagePath,
    p_mime_type: evidence.mimeType,
    p_size_bytes: evidence.blob.size,
    p_client_request_id: evidence.id,
  })
  if (error) {
    await db.evidences.update(evidenceId, { state: 'error' })
    throw error
  }
  await db.evidences.update(evidenceId, { state: 'uploaded', progress: 100 })
}

/** Registra el manejador de subida de evidencia en la cola de salida. */
export function registerEvidenceUploadHandler() {
  registerOutboxHandler(EVIDENCE_UPLOAD, uploadEvidenceItem)
}
