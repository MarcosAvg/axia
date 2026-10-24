#!/usr/bin/env node
// Ejecuta solo las pruebas relacionadas con los archivos cambiados.
// Uso: pnpm test:affected
// Base opcional: AXIA_TEST_BASE=origin/main pnpm test:affected

import { execFileSync, spawnSync } from 'node:child_process'

const root = new URL('..', import.meta.url).pathname
const base = process.env.AXIA_TEST_BASE ?? 'main'

function git(args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
}

function changedFiles() {
  const tracked = git(['diff', '--name-only', '--diff-filter=ACMR', base])
  const untracked = git(['ls-files', '--others', '--exclude-standard'])
  return [...new Set([...tracked.split('\n'), ...untracked.split('\n')])]
    .filter(Boolean)
    .filter((file) => file !== 'pnpm-lock.yaml')
}

function appPath(file, app) {
  return file.startsWith(`apps/${app}/`)
    ? file.slice(`apps/${app}/`.length)
    : null
}

function run(command, args) {
  console.log(`\n$ ${command} ${args.join(' ')}`)
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

const files = process.env.AXIA_TEST_FILES
  ? process.env.AXIA_TEST_FILES.split(',')
      .map((file) => file.trim())
      .filter(Boolean)
  : changedFiles()
if (files.length === 0) {
  console.log(`Sin cambios respecto a ${base}; no hay pruebas que ejecutar.`)
  process.exit(0)
}

console.log(`Archivos cambiados respecto a ${base}:`)
for (const file of files) console.log(`  - ${file}`)

const docsOnly = files.every(
  (file) =>
    file.startsWith('docs/') ||
    file.startsWith('.github/') ||
    file.endsWith('.md'),
)
if (docsOnly) {
  run('pnpm', ['check:docs'])
  process.exit(0)
}

const structural = files.some(
  (file) =>
    file === 'package.json' ||
    file === 'pnpm-workspace.yaml' ||
    file === 'tsconfig.base.json' ||
    file === 'knip.json' ||
    file === 'lint-staged.config.mjs' ||
    file === 'apps/web/package.json' ||
    file === 'apps/server/package.json' ||
    file.endsWith('vitest.config.ts') ||
    file.endsWith('playwright.config.ts') ||
    file.endsWith('playwright.visual.config.ts') ||
    file.startsWith('scripts/') ||
    file.startsWith('.github/'),
)
if (structural) {
  console.log('\nCambio estructural: se ejecuta la compuerta completa.')
  run('pnpm', ['check'])
  process.exit(0)
}

const serverFiles = files
  .map((file) => appPath(file, 'server'))
  .filter((file) => file && /\.(ts|tsx)$/.test(file))
const webFiles = files
  .map((file) => appPath(file, 'web'))
  .filter((file) => file && /\.(ts|tsx)$/.test(file))

const e2eSpecs = webFiles.filter((file) => file.startsWith('e2e/'))
const webUi = webFiles.filter(
  (file) =>
    !file.includes('.test.') &&
    (file.startsWith('src/components/') ||
      file.startsWith('src/app/') ||
      /^src\/features\/[^/]+\/components\//.test(file)),
)
const serverMigration = files
  .map((file) => appPath(file, 'server'))
  .some(
    (file) =>
      file &&
      (file.startsWith('db/migrations/') ||
        file === 'db/schema.ts' ||
        file.startsWith('src/db/')),
  )

let ran = false

if (serverMigration) {
  ran = true
  console.log(
    '\nCambio de esquema/migración: se ejecuta la integración completa.',
  )
  run('pnpm', ['--filter', '@axia/server', 'test'])
  run('pnpm', ['db:test'])
} else if (serverFiles.length > 0) {
  ran = true
  run('pnpm', [
    '--filter',
    '@axia/server',
    'exec',
    'vitest',
    'related',
    '--run',
    ...serverFiles,
  ])
}

if (webFiles.length > 0) {
  ran = true
  const unitFiles = webFiles.filter((file) => !file.startsWith('e2e/'))
  if (unitFiles.length > 0) {
    run('pnpm', [
      '--filter',
      '@axia/web',
      'exec',
      'vitest',
      'related',
      '--run',
      ...unitFiles,
    ])
  }
  if (e2eSpecs.length > 0) {
    run('pnpm', [
      '--filter',
      '@axia/web',
      'exec',
      'playwright',
      'test',
      ...e2eSpecs,
    ])
  }
  if (webUi.length > 0 && e2eSpecs.length === 0) {
    if (process.env.MIGRATION_DATABASE_URL) {
      run('pnpm', ['test:e2e:smoke'])
    } else {
      console.warn(
        '\nHay cambios de interfaz; define MIGRATION_DATABASE_URL para ejecutar el smoke E2E.',
      )
    }
  }
}

if (!ran) {
  console.log(
    '\nNo hay archivos de código afectados; ejecutando chequeo documental.',
  )
  run('pnpm', ['check:docs'])
}
