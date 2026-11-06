// Lista cerrada de tipos de adjunto. El servidor es la autoridad: la web solo
// duplica las etiquetas y el atributo `accept` del selector de archivos.

export const ATTACHMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const

export type AttachmentMimeType = (typeof ATTACHMENT_MIME_TYPES)[number]

const ATTACHMENT_MIME_TYPE_SET: ReadonlySet<string> = new Set(
  ATTACHMENT_MIME_TYPES,
)

const EXTENSIONS: Record<AttachmentMimeType, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
}

export function isAttachmentMimeType(
  value: string,
): value is AttachmentMimeType {
  return ATTACHMENT_MIME_TYPE_SET.has(value)
}

export function attachmentExtension(mime: AttachmentMimeType): string {
  return EXTENSIONS[mime]
}
