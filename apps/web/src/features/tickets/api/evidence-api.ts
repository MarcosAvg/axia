// Lectura de evidencias (bucket privado `evidence`). La subida vive en `offline-evidence`.

import { supabase } from '@/lib/supabase'

const BUCKET = 'evidence'

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
