// Development uses Docker only for PostgreSQL; both watchers run on the host.
import { existsSync } from 'node:fs'
import { createServer } from 'node:net'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { assertPortsFree } from './dev-ports.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
process.chdir(root)
const envFile = process.env.AXIA_ENV_FILE ?? `${root}.env.dev`
if (!existsSync(envFile))
  throw new Error('Ejecuta scripts/install.sh para preparar .env.dev')
process.loadEnvFile(envFile)
process.env.AXIA_ENV_FILE = envFile
process.env.PORT ??= '3100'
process.env.HOST ??= '127.0.0.1'
process.env.STORAGE_DIR =
  process.env.AXIA_DEV_STORAGE_DIR ?? `${root}apps/server/data/evidence`
process.env.AXIA_API_URL = `http://127.0.0.1:${process.env.PORT}`
const webPort = Number(process.env.AXIA_DEV_WEB_PORT ?? '5173')
await assertPortsFree([
  { name: 'API', port: Number(process.env.PORT), host: process.env.HOST },
  { name: 'web', port: webPort, host: 'localhost' },
])
const compose = ['compose', '--env-file', envFile, '-f', 'compose.dev.yaml']
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options })
  if (result.error || result.status !== 0)
    throw new Error(`${command} falló; revisa la salida anterior`)
}
const existing = spawnSync('docker', [...compose, 'ps', '-q', 'db'], {
  encoding: 'utf8',
})
if (existing.status !== 0) throw new Error('Docker Compose no está disponible')
if (!existing.stdout.trim()) {
  await new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', () =>
      reject(
        new Error(
          'El puerto PostgreSQL está ocupado. Define otro DB_PORT y sus URLs en .env.dev; no se tocarán servicios existentes.',
        ),
      ),
    )
    server.listen(Number(process.env.DB_PORT ?? 5433), '127.0.0.1', () =>
      server.close(resolve),
    )
  })
}
run('docker', [...compose, 'up', '-d', '--wait', 'db'])
run('pnpm', ['--filter', '@axia/server', 'db:migrate'])
if (process.argv.includes('--demo')) run('pnpm', ['db:demo', '--', '--demo'])
if (!process.argv.includes('--prepare-only')) {
  const children = [
    spawn('pnpm', ['--filter', '@axia/server', 'dev'], {
      stdio: 'inherit',
      detached: true,
    }),
    spawn(
      'pnpm',
      [
        '--filter',
        '@axia/web',
        'dev',
        '--port',
        String(webPort),
        '--strictPort',
      ],
      { stdio: 'inherit', detached: true },
    ),
  ]
  let stopping = false
  function stop(code) {
    if (stopping) return
    stopping = true
    for (const child of children) {
      if (child.pid) {
        try {
          process.kill(-child.pid, 'SIGTERM')
        } catch (error) {
          if (error.code !== 'ESRCH') throw error
        }
      }
    }
    process.exitCode = code
  }
  process.on('SIGINT', () => stop(130))
  process.on('SIGTERM', () => stop(143))
  for (const child of children) {
    child.on('error', () => stop(1))
    child.on('exit', (code) => stop(code ?? 1))
  }
}
