import { apiBaseUrl, apiFetch } from '@/lib/api-client'
import { uploadAttachmentResumable } from '@/lib/offline/tus'
import type { TicketAttachment } from '../domain/types'

export type AttachmentReservation = {
  attachment: { id: string }
  uploadUrl: string
  maxSize: number
  quotaRemaining: number
  replayed: boolean
}

export interface ReserveAttachmentInput {
  clientRequestId: string
  problemId: string
  ticketId?: string
  fileName: string
  declaredMimeType: string
  sizeBytes: number
}

export function reserveAttachment(
  input: ReserveAttachmentInput,
): Promise<AttachmentReservation> {
  return apiFetch<AttachmentReservation>('/api/attachments', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function uploadAttachment(
  reservation: AttachmentReservation,
  file: File,
  onProgress?: (percentage: number) => void,
): Promise<void> {
  await uploadAttachmentResumable({
    endpoint: `${apiBaseUrl()}${reservation.uploadUrl}`,
    attachmentId: reservation.attachment.id,
    blob: file,
    mimeType: file.type || 'application/octet-stream',
    onProgress,
  })
}

export async function listTicketAttachments(
  ticketId: string,
): Promise<TicketAttachment[]> {
  const body = await apiFetch<{ items: TicketAttachment[] }>(
    `/api/tickets/${ticketId}/attachments`,
  )
  return body.items
}

/** URL autenticada de descarga; la cookie de sesión viaja en la petición. */
export function getAttachmentUrl(attachmentId: string): string {
  return `/api/attachments/${attachmentId}/file`
}
