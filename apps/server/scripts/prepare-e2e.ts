import { spawn } from 'node:child_process'
import { Client } from 'pg'
import { e2eEnvironment } from './test-target.js'
import { ensureAppRole, runMigrations } from '../src/db/migrate.js'
import { runDemoSeedCli } from '../src/db/seed-demo/cli.js'

const env = e2eEnvironment(process.env)
Object.assign(process.env, env)
const target = new URL(env.MIGRATION_DATABASE_URL)
const database = target.pathname.slice(1)
const maintenance = new URL(target)
maintenance.pathname = '/postgres'
const admin = new Client({ connectionString: maintenance.toString() })
await admin.connect()
try {
  // Identifier has already been restricted to lowercase letters/digits/underscore.
  await admin.query(`drop database if exists "${database}" with (force)`)
  await admin.query(`create database "${database}"`)
} finally {
  await admin.end()
}
const client = new Client({ connectionString: target.toString() })
await client.connect()
try {
  await ensureAppRole(client)
  await runMigrations(client)
} finally {
  await client.end()
}
await runDemoSeedCli(['--demo'], process.env)
const server = spawn(process.execPath, ['--import', 'tsx', 'src/server.ts'], {
  stdio: 'inherit',
  env: process.env,
})
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => server.kill(signal))
}
server.on('error', (error) => {
  throw error
})
server.on('exit', (code) => {
  process.exitCode = code ?? 1
})
