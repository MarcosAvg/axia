import { createHash } from 'node:crypto'
import { readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { fileTypeFromBuffer } from 'file-type'

import type { AppConfig } from '../config.js'
import { AppError } from '../http/errors.js'
import type { AttachmentService } from './service.js'
import {
  attachmentExtension,
  isAttachmentMimeType,
  type AttachmentMimeType,
} from './types.js'

type Detected = {
  mime: AttachmentMimeType
  extension: string
}

async function detect(
  input: Buffer,
  declared: string | null,
): Promise<Detected> {
  const detected = await fileTypeFromBuffer(input)
  if (!detected || !isAttachmentMimeType(detected.mime)) {
    throw new AppError(
      415,
      'unsupported_media_type',
      'El adjunto debe ser PDF, imagen, DOCX o XLSX',
    )
  }
  if (declared && declared !== detected.mime) {
    throw new AppError(
      415,
      'unsupported_media_type',
      'El contenido no corresponde al tipo declarado',
    )
  }
  return {
    mime: detected.mime,
    extension: attachmentExtension(detected.mime),
  }
}

type PersistInput = {
  service: AttachmentService
  config: AppConfig
  attachmentId: string
  uploadedBy: string
  input: Buffer
  detected: Detected
}

async function persist({
  service,
  config,
  attachmentId,
  uploadedBy,
  input,
  detected,
}: PersistInput): Promise<string> {
  const used = await service.quotaForUploader(uploadedBy, attachmentId)
  if (used + input.length > config.ATTACHMENT_QUOTA_BYTES) {
    throw new AppError(
      413,
      'quota_exceeded',
      'El adjunto supera la cuota disponible',
    )
  }

  const storedPath = join(
    service.paths.files,
    `${attachmentId}.${detected.extension}`,
  )
  await writeFile(storedPath, input)
  await service.complete(attachmentId, {
    storagePath: `files/attachments/${attachmentId}.${detected.extension}`,
    mimeType: detected.mime,
    sizeBytes: input.length,
    sha256: createHash('sha256').update(input).digest('hex'),
  })
  return storedPath
}

type FailureInput = {
  service: AttachmentService
  attachmentId: string
  originalPath: string
  storedPath: string | null
  error: unknown
}

async function failAndClean({
  service,
  attachmentId,
  originalPath,
  storedPath,
  error,
}: FailureInput): Promise<never> {
  await service.markFailed(
    attachmentId,
    error instanceof Error ? error.message : 'Attachment processing failed',
  )
  await Promise.all([
    rm(originalPath, { force: true }),
    storedPath ? rm(storedPath, { force: true }) : Promise.resolve(),
  ])
  throw error
}

/** Verifica el contenido real y guarda el original bajo `files/attachments`. */
export async function processAttachment(
  service: AttachmentService,
  config: AppConfig,
  attachmentId: string,
): Promise<void> {
  const attachment = await service.findForTus(attachmentId)
  if (!attachment) {
    throw new AppError(404, 'not_found', 'Adjunto no encontrado')
  }
  if (attachment.processing_state !== 'pending') return

  const originalPath = join(service.paths.uploads, attachmentId)
  let storedPath: string | null = null

  try {
    const input = await readFile(originalPath)
    const detected = await detect(input, attachment.declared_mime_type)
    storedPath = await persist({
      service,
      config,
      attachmentId,
      uploadedBy: attachment.uploaded_by,
      input,
      detected,
    })
    await rm(originalPath, { force: true })
  } catch (error) {
    await failAndClean({
      service,
      attachmentId,
      originalPath,
      storedPath,
      error,
    })
  }
}
