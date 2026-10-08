// Subida y lectura de evidencias (bucket privado `evidence`).

import { supabase } from '@/lib/supabase'
import type { EvidenceType } from '../domain/types'

const BUCKET = 'evidence'

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  return dot > 0 ? fileName.slice(dot + 1).toLowerCase() : 'bin'
}

/** Sube el archivo y registra la evidencia; devuelve el id de la evidencia. */
export async function uploadEvidence(params: {
  ticketId: string
  cycle: number
  type: EvidenceType
  file: File
  clientRequestId: string
}): Promise<string> {
  const { ticketId, cycle, type, file, clientRequestId } = params
  const path = `tickets/${ticketId}/${cycle}/${clientRequestId}.${extensionOf(file.name)}`

  const upload = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  })
  if (upload.error) throw upload.error

  const { data, error } = await supabase.rpc('evidence_add', {
    p_ticket_id: ticketId,
    p_type: type,
    p_storage_path: path,
    p_mime_type: file.type,
    p_size_bytes: file.size,
    p_client_request_id: clientRequestId,
  })
  if (error) throw error
  return data
}

/** URL firmada temporal para mostrar una evidencia. */
export async function getEvidenceUrl(
  storagePath: string,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 600)
  if (error) throw error
  return data?.signedUrl ?? null
}
