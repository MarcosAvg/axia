// Evidencia offline: comprime, guarda en Dexie y reserva la evidencia en el servidor antes
// de subirla por TUS. La cola garantiza que la evidencia se registre antes que la acción.

import { apiBaseUrl, apiFetch } from '@/lib/api-client'
import { db, type Evidence } from '@/lib/offline/db'
import { isRetryableOutboxError } from '@/lib/offline/errors'
import { compressImage } from '@/lib/offline/image'
import {
  enqueue,
  processOutbox,
  registerOutboxHandler,
} from '@/lib/offline/outbox'
import { uploadResumable } from '@/lib/offline/tus'
import { currentOfflineUserId, offlineUserForTab } from '@/lib/offline/user'
import { EVIDENCE_TYPES } from '../domain/types'
import type { EvidenceType } from '../domain/types'

const EVIDENCE_UPLOAD = 'evidence_upload'

interface EvidenceInput {
  ticketId: string
  cycle: number
  type: EvidenceType
  file: File
  note?: string | null
  occurredLocal?: string
  subjectTechnicianId?: string
}

/** Comprime el archivo y lo guarda en el dispositivo, sin subirlo todavía. */
async function prepareEvidence(
  params: EvidenceInput,
  owner: string | null,
): Promise<Evidence> {
  const id = crypto.randomUUID()
  const blob = await compressImage(params.file)
  return {
    id,
    userId: owner ?? undefined,
    ticketId: params.ticketId,
    cycle: params.cycle,
    type: params.type,
    blob,
    mimeType: blob.type || params.file.type,
    fileName: params.file.name,
    note: params.note ?? null,
    occurredLocal: params.occurredLocal || undefined,
    subjectTechnicianId: params.subjectTechnicianId,
    state: 'pending',
    progress: 0,
    createdAt: Date.now(),
  }
}

/** Cuerpo de reserva de la evidencia; la hora de dispositivo solo viaja si se capturó sin conexión. */
export function buildEvidenceUploadBody(
  evidence: Evidence,
  type: EvidenceType,
) {
  return {
    type,
    cycle: evidence.cycle,
    clientRequestId: evidence.id,
    mimeType: evidence.mimeType,
    sizeBytes: evidence.blob.size,
    occurredLocal: evidence.occurredLocal || undefined,
    subjectTechnicianId: evidence.subjectTechnicianId,
    clientCapturedAt: evidence.clientCapturedAt,
    deviceNow: evidence.clientCapturedAt ? new Date().toISOString() : undefined,
  }
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
  await uploadEvidence(evidence)
}

async function uploadEvidence(evidence: Evidence): Promise<void> {
  const evidenceId = evidence.id
  if (evidence.userId && evidence.userId !== currentOfflineUserId()) {
    throw new Error('La evidencia pertenece a otro usuario')
  }
  const type = EVIDENCE_TYPES.find((candidate) => candidate === evidence.type)
  if (!type) throw new Error('Tipo de evidencia inválido')

  const created = await apiFetch<{ evidence: { id: string } }>(
    `/api/tickets/${evidence.ticketId}/evidence`,
    {
      method: 'POST',
      body: JSON.stringify(buildEvidenceUploadBody(evidence, type)),
    },
  )
  const serverId = created.evidence.id
  if (evidence.userId) assertCaptureOwner(evidence.userId)

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

function assertCaptureOwner(owner: string | null) {
  if (owner !== currentOfflineUserId()) {
    throw new Error('La sesión cambió durante la captura')
  }
}

/**
 * Guarda la evidencia y la sube de inmediato si hay red; si no hay conexión (o falla la red a
 * medio camino), la encola. Se espera a que termine cuando hay red, para que la acción de flujo
 * posterior encuentre la evidencia ya registrada.
 */
export async function saveAndUploadEvidence(
  params: EvidenceInput,
): Promise<string> {
  const capturedAt = new Date().toISOString()
  const owner = offlineUserForTab()
  assertCaptureOwner(owner)
  const evidence = await prepareEvidence(params, owner)
  assertCaptureOwner(owner)

  const { id } = evidence
  if (typeof navigator === 'undefined' || navigator.onLine) {
    try {
      await uploadEvidence(evidence)
      return id
    } catch (error) {
      if (!isRetryableOutboxError(error)) throw error
    }
  }
  await db.transaction('rw', db.evidences, db.outbox, async () => {
    await db.evidences.add({ ...evidence, clientCapturedAt: capturedAt })
    await enqueue(EVIDENCE_UPLOAD, { evidenceId: id }, params.ticketId, owner)
  })
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
    async (payload) => {
      const { evidenceId } = payload as { evidenceId: string }
      return (await db.evidences.get(evidenceId))?.ticketId
    },
  )
}
