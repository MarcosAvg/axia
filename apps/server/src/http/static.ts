import { statSync } from 'node:fs'
import { join } from 'node:path'

import fastifyStatic from '@fastify/static'
import type { FastifyInstance } from 'fastify'

function assertStaticDirectory(root: string) {
  const directory = statSync(root, { throwIfNoEntry: false })
  if (!directory?.isDirectory()) {
    throw new Error(`STATIC_DIR does not exist or is not a directory: ${root}`)
  }

  const index = statSync(join(root, 'index.html'), { throwIfNoEntry: false })
  if (!index?.isFile()) {
    throw new Error(`STATIC_DIR does not contain index.html: ${root}`)
  }
}

export async function registerStatic(app: FastifyInstance, root: string) {
  assertStaticDirectory(root)

  await app.register(fastifyStatic, {
    root,
    prefix: '/',
    cacheControl: false,
    setHeaders(response, filePath) {
      const normalized = filePath.replaceAll('\\', '/')
      if (normalized.includes('/assets/')) {
        response.header('cache-control', 'public, max-age=31536000, immutable')
        return
      }

      response.header('cache-control', 'no-cache')
    },
  })
}
