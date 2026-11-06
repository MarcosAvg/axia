import type { ProblemOption } from '@/features/catalogs'

type AttachmentTypeOption = {
  mime: string
  label: string
}

const ATTACHMENT_TYPE_OPTIONS: AttachmentTypeOption[] = [
  { mime: 'application/pdf', label: 'PDF' },
  { mime: 'image/jpeg', label: 'JPEG' },
  { mime: 'image/png', label: 'PNG' },
  { mime: 'image/webp', label: 'WebP' },
  {
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    label: 'Word (DOCX)',
  },
  {
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    label: 'Excel (XLSX)',
  },
]

/** Tipos que el problema exige; vacío significa que no exige adjunto. */
export function requiredTypesForProblem(
  problem: ProblemOption | null | undefined,
): string[] {
  return problem?.requiredAttachmentTypes ?? []
}

/** Atributo `accept` del selector, construido solo con los tipos permitidos. */
export function acceptFor(types: string[]): string {
  return types.join(',')
}

export function attachmentTypeLabel(mime: string): string {
  return (
    ATTACHMENT_TYPE_OPTIONS.find((option) => option.mime === mime)?.label ??
    mime
  )
}

/** Mensaje útil de un fallo de reserva o de TUS; `null` si no hay uno. */
export function uploadErrorMessage(error: unknown): string | null {
  const response = (
    error as { originalResponse?: { getBody?: () => string | null } }
  )?.originalResponse
  const body = response?.getBody?.()
  if (body) return body
  if (
    error instanceof Error &&
    (error as { name?: string }).name === 'ApiError'
  ) {
    return error.message
  }
  return null
}
