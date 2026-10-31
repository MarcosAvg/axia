#!/usr/bin/env node
// Uso: pnpm test:affected; base opcional: AXIA_TEST_BASE=origin/main.
import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { planAffectedTests } from './test-plan.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const base = process.env.AXIA_TEST_BASE ?? 'main'

function gitFiles(args) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
    .split('\0')
    .filter(Boolean)
}

function discoverChanges() {
  if (process.env.AXIA_TEST_FILES) {
    return {
      files: process.env.AXIA_TEST_FILES.split(',')
        .map((file) => file.trim())
        .filter(Boolean),
    }
  }
  try {
    const tracked = gitFiles([
      'diff',
      '-z',
      '--name-only',
      '--diff-filter=ACMRD',
      base,
    ])
    const deletedFiles = gitFiles([
      'diff',
      '-z',
      '--name-only',
      '--diff-filter=D',
      base,
    ])
    const untracked = gitFiles([
      'ls-files',
      '-z',
      '--others',
      '--exclude-standard',
    ])
    return { files: [...new Set([...tracked, ...untracked])], deletedFiles }
  } catch {
    console.warn(
      'No se pudieron descubrir los cambios; se ejecuta la compuerta completa.',
    )
    return { files: [], discoveryFailed: true }
  }
}

function run([command, ...args]) {
  console.log(`\n$ ${command} ${args.join(' ')}`)
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' })
  if (result.error)
    console.error(`No se pudo ejecutar ${command}: ${result.error.message}`)
  if (result.error || result.status !== 0) process.exit(result.status || 1)
}

const changes = discoverChanges()
const commands = planAffectedTests(changes)
if (changes.files.length > 0) {
  console.log(`Archivos cambiados respecto a ${base}:`)
  for (const file of changes.files) console.log(`  - ${file}`)
}
if (commands.length === 0)
  console.log(`Sin cambios respecto a ${base}; no hay pruebas que ejecutar.`)
for (const command of commands) run(command)
