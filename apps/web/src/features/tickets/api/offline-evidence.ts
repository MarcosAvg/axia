// Evidencia offline: comprime, guarda en Dexie y reserva la evidencia en el servidor antes
// de subirla por TUS. La cola garantiza que la evidencia se registre antes que la acción.

import { apiBaseUrl, apiFetch } from '@/lib/api-client'
import { db } from '@/lib/offline/db'
import { isNetworkError } from '@/lib/offline/errors'
import { compressImage } from '@/lib/offline/image'
import {
  enqueue,
  processOutbox,
  registerOutboxHandler,
} from '@/lib/offline/outbox'
import { uploadResumable } from '@/lib/offline/tus'
import { currentOfflineUserId } from '@/lib/offline/user'
import { EVIDENCE_TYPES } from '../domain/types'
import type { EvidenceType } from '../domain/types'

const EVIDENCE_UPLOAD = 'evidence_upload'

interface EvidenceInput {
  ticketId: string
  cycle: number
  type: EvidenceType
  file: File
  note?: string | null
  occurredAt?: string
}

/** Comprime el archivo y lo guarda en el dispositivo, sin subirlo todavía. */
async function saveEvidence(params: EvidenceInput): Promise<string> {
  const id = crypto.randomUUID()
  const blob = await compressImage(params.file)
  await db.evidences.add({
    id,
    userId: currentOfflineUserId() ?? undefined,
    ticketId: params.ticketId,
    cycle: params.cycle,
    type: params.type,
    blob,
    mimeType: blob.type || params.file.type,
    fileName: params.file.name,
    note: params.note ?? null,
    occurredAt: params.occurredAt,
    state: 'pending',
    progress: 0,
    createdAt: Date.now(),
  })
  return id
}

/** Reserva la evidencia y la sube al servidor. */
async function uploadEvidenceItem(payload: unknown): Promise<void> {
  const { evidenceId } = payload as { evidenceId: string }
  const evidence = await db.evidences.get(evidenceId)
  if (!evidence) return
  if (evidence.state === 'uploaded') {
    await db.evidences.delete(evidenceId)
    return
  }
  if (evidence.userId && evidence.userId !== currentOfflineUserId()) {
    throw new Error('La evidencia pertenece a otro usuario')
  }
  const type = EVIDENCE_TYPES.find((candidate) => candidate === evidence.type)
  if (!type) throw new Error('Tipo de evidencia inválido')

  const created = await apiFetch<{ evidence: { id: string } }>(
    `/api/tickets/${evidence.ticketId}/evidence`,
    {
      method: 'POST',
      body: JSON.stringify({
        type,
        clientRequestId: evidence.id,
        mimeType: evidence.mimeType,
        sizeBytes: evidence.blob.size,
        occurredAt: evidence.occurredAt,
      }),
    },
  )
  const serverId = created.evidence.id

  await db.evidences.update(evidenceId, { state: 'uploading', progress: 0 })
  let reported = -1
  await uploadResumable({
    endpoint: `${apiBaseUrl()}/api/uploads`,
    evidenceId: serverId,
    ticketId: evidence.ticketId,
    blob: evidence.blob,
    mimeType: evidence.mimeType,
    onProgress: (percentage) => {
      if (percentage !== reported) {
        reported = percentage
        void db.evidences.update(evidenceId, { progress: percentage })
      }
    },
  })
  // La foto ya está en el servidor: no hace falta conservar otra copia local.
  await db.evidences.delete(evidenceId)
}

/**
 * Guarda la evidencia y la sube de inmediato si hay red; si no hay conexión (o falla la red a
 * medio camino), la encola. Se espera a que termine cuando hay red, para que la acción de flujo
 * posterior encuentre la evidencia ya registrada.
 */
export async function saveAndUploadEvidence(
  params: EvidenceInput,
): Promise<string> {
  const id = await saveEvidence(params)
  const online = typeof navigator === 'undefined' || navigator.onLine === true
  if (online) {
    try {
      await uploadEvidenceItem({ evidenceId: id })
      return id
    } catch (error) {
      if (!isNetworkError(error)) {
        // Un error de dominio no se resuelve reintentando: se descarta la fila
        // local para no dejar una evidencia pendiente que nunca se subirá.
        await db.evidences.delete(id)
        throw error
      }
    }
  }
  await enqueue(EVIDENCE_UPLOAD, { evidenceId: id })
  void processOutbox()
  return id
}

/** Registra el manejador de subida de evidencia en la cola de salida. */
export function registerEvidenceUploadHandler() {
  registerOutboxHandler(
    EVIDENCE_UPLOAD,
    uploadEvidenceItem,
    async (payload) => {
      const { evidenceId } = payload as { evidenceId: string }
      const evidence = await db.evidences.get(evidenceId)
      if (evidence?.state !== 'uploaded') await db.evidences.delete(evidenceId)
    },
  )
}
