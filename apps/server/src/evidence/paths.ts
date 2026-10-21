import { mkdir } from 'node:fs/promises'
import { resolve, sep } from 'node:path'

export type StoragePaths = {
  root: string
  uploads: string
  files: string
}

export function storagePaths(root: string): StoragePaths {
  const absolute = resolve(root)
  return {
    root: absolute,
    uploads: resolve(absolute, 'uploads'),
    files: resolve(absolute, 'files'),
  }
}

export async function ensureStorage(paths: StoragePaths) {
  await mkdir(paths.uploads, { recursive: true })
  await mkdir(paths.files, { recursive: true })
}

export function resolveStored(paths: StoragePaths, relative: string): string {
  const path = resolve(paths.root, relative)
  if (path !== paths.root && !path.startsWith(`${paths.root}${sep}`)) {
    throw new Error('Invalid stored path')
  }
  return path
}
