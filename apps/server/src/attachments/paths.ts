import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

import { storagePaths } from '../evidence/paths.js'

export type AttachmentStoragePaths = {
  root: string
  uploads: string
  files: string
}

export function attachmentPaths(root: string): AttachmentStoragePaths {
  const base = storagePaths(root)
  return {
    root: base.root,
    uploads: join(base.uploads, 'attachments'),
    files: join(base.files, 'attachments'),
  }
}

export async function ensureAttachmentStorage(
  paths: AttachmentStoragePaths,
): Promise<void> {
  await mkdir(paths.uploads, { recursive: true })
  await mkdir(paths.files, { recursive: true })
}
