import { createHash } from 'node:crypto'
import { readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import sharp from 'sharp'

import type { AppConfig } from '../config.js'
import { AppError } from '../http/errors.js'
import type { EvidenceService } from './service.js'

const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp'])

type ProcessedImage = {
  input: Buffer
  normalized: Buffer
  thumbnail: Buffer
  width: number
  height: number
  sha256: string
}

async function prepareImage(
  input: Buffer,
  config: AppConfig,
): Promise<ProcessedImage> {
  const metadata = await sharp(input, {
    failOn: 'error',
    limitInputPixels: config.EVIDENCE_MAX_DIMENSION ** 2 * 2,
  }).metadata()
  if (!metadata.format || !ALLOWED_FORMATS.has(metadata.format)) {
    throw new AppError(
      415,
      'unsupported_media_type',
      'La evidencia debe ser una imagen JPEG, PNG o WebP',
    )
  }
  const normalized = await sharp(input)
    .rotate()
    .resize({
      width: config.EVIDENCE_MAX_DIMENSION,
      height: config.EVIDENCE_MAX_DIMENSION,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true })
  const thumbnail = await sharp(input)
    .rotate()
    .resize({
      width: config.EVIDENCE_THUMBNAIL_SIZE,
      height: config.EVIDENCE_THUMBNAIL_SIZE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 80 })
    .toBuffer()
  return {
    input,
    normalized: normalized.data,
    thumbnail,
    width: normalized.info.width,
    height: normalized.info.height,
    sha256: createHash('sha256').update(input).digest('hex'),
  }
}

async function writeProcessed(
  service: EvidenceService,
  evidenceId: string,
  image: ProcessedImage,
) {
  const normalizedPath = join(service.paths.files, `${evidenceId}.webp`)
  const thumbnailFilePath = join(
    service.paths.files,
    `${evidenceId}.thumb.webp`,
  )
  await writeFile(normalizedPath, image.normalized)
  await writeFile(thumbnailFilePath, image.thumbnail)
  return { normalizedPath, thumbnailFilePath }
}

export async function processEvidence(
  service: EvidenceService,
  config: AppConfig,
  evidenceId: string,
) {
  const evidence = await service.findForTus(evidenceId)
  if (!evidence) throw new AppError(404, 'not_found', 'Evidencia no encontrada')
  if (evidence.processing_state !== 'pending') return

  const originalPath = join(service.paths.uploads, evidenceId)
  const normalizedPath = join(service.paths.files, `${evidenceId}.webp`)
  const thumbnailFilePath = join(
    service.paths.files,
    `${evidenceId}.thumb.webp`,
  )

  try {
    const input = await readFile(originalPath)
    const image = await prepareImage(input, config)
    if (evidence.uploaded_by) {
      const used = await service.quotaForUploader(
        evidence.uploaded_by,
        evidenceId,
      )
      if (used + image.normalized.length > config.EVIDENCE_QUOTA_BYTES) {
        throw new AppError(
          413,
          'quota_exceeded',
          'La evidencia supera la cuota disponible',
        )
      }
    }
    const written = await writeProcessed(service, evidenceId, image)
    await service.complete(evidenceId, {
      storagePath: `files/${evidenceId}.webp`,
      thumbnailPath: `files/${evidenceId}.thumb.webp`,
      sizeBytes: image.normalized.length,
      width: image.width,
      height: image.height,
      sha256: image.sha256,
    })
    await rm(originalPath, { force: true })
    return written
  } catch (error) {
    await service.markFailed(
      evidenceId,
      error instanceof Error ? error.message : 'Evidence processing failed',
    )
    await Promise.all([
      rm(originalPath, { force: true }),
      rm(normalizedPath, { force: true }),
      rm(thumbnailFilePath, { force: true }),
    ])
    throw error
  }
}
