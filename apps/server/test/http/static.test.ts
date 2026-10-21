import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { buildTestApp } from './helpers.js'

function createStaticFixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'axia-web-'))
  mkdirSync(join(root, 'assets'))
  writeFileSync(
    join(root, 'index.html'),
    '<!doctype html><html><body><div id="root">Axia</div></body></html>',
  )
  writeFileSync(join(root, 'assets', 'app.js'), 'console.log("axia")\n')
  return root
}

describe('static serving', () => {
  it('serves the SPA shell and hashed assets with the right cache policy', async () => {
    const root = createStaticFixture()
    const app = await buildTestApp({ STATIC_DIR: root })

    try {
      const index = await app.inject({ method: 'GET', url: '/' })
      expect(index.statusCode).toBe(200)
      expect(index.headers['content-type']).toContain('text/html')
      expect(index.body).toContain('Axia')
      expect(index.headers['cache-control']).toBe('no-cache')

      const route = await app.inject({ method: 'GET', url: '/tickets/123' })
      expect(route.statusCode).toBe(200)
      expect(route.body).toContain('Axia')

      const asset = await app.inject({
        method: 'GET',
        url: '/assets/app.js',
      })
      expect(asset.statusCode).toBe(200)
      expect(asset.headers['content-type']).toContain('javascript')
      expect(asset.headers['cache-control']).toBe(
        'public, max-age=31536000, immutable',
      )
    } finally {
      await app.close()
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('does not turn missing assets or API routes into the SPA shell', async () => {
    const root = createStaticFixture()
    const app = await buildTestApp({ STATIC_DIR: root })

    try {
      const asset = await app.inject({
        method: 'GET',
        url: '/assets/missing.js',
      })
      expect(asset.statusCode).toBe(404)
      expect(asset.body).not.toContain('Axia')

      const api = await app.inject({ method: 'GET', url: '/api/nope' })
      expect(api.statusCode).toBe(404)
      expect(api.headers['content-type']).toContain('application/json')
    } finally {
      await app.close()
      rmSync(root, { recursive: true, force: true })
    }
  })
})
