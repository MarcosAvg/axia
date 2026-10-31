import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { planAffectedTests } from './test-plan.mjs'

for (const file of [
  '.github/workflows/ci.yml',
  'compose.yaml',
  'compose.dev.yaml',
  'docker-compose.override.yml',
  'Dockerfile',
  '.dockerignore',
  'deploy/scripts/backup.sh',
  'scripts/install.sh',
  '.env.dev.example',
  'pnpm-lock.yaml',
]) {
  test(`ejecuta la compuerta completa para ${file}`, () => {
    assert.deepEqual(planAffectedTests({ files: [file] }), [['pnpm', 'check']])
  })
}

test('mantiene cambios exclusivamente documentales fuera de la compuerta completa', () => {
  assert.deepEqual(
    planAffectedTests({ files: ['README.md', 'docs/start/instalacion.md'] }),
    [['pnpm', 'check:docs']],
  )
})

for (const file of [
  'apps/web/src/routes/index.tsx',
  'apps/web/src/styles.css',
]) {
  test(`ejecuta smoke para el cambio de interfaz ${file}`, () => {
    const commands = planAffectedTests({ files: [file] })
    assert.ok(
      commands.some((command) => command.join(' ') === 'pnpm test:e2e:smoke'),
    )
    assert.ok(!commands.some((command) => command.join(' ') === 'pnpm check'))
  })
}

test('ejecuta la compuerta completa si se elimina código', () => {
  const file = 'apps/web/src/features/tickets/domain/old-rule.ts'
  assert.deepEqual(planAffectedTests({ files: [file], deletedFiles: [file] }), [
    ['pnpm', 'check'],
  ])
})

test('conserva chequeo documental si solo se elimina documentación', () => {
  assert.deepEqual(
    planAffectedTests({
      files: ['docs/old.md'],
      deletedFiles: ['docs/old.md'],
    }),
    [['pnpm', 'check:docs']],
  )
})

test('usa la compuerta completa si git no puede descubrir cambios', () => {
  assert.deepEqual(planAffectedTests({ files: [], discoveryFailed: true }), [
    ['pnpm', 'check'],
  ])
})

test('usa la compuerta completa para archivos no clasificados', () => {
  assert.deepEqual(planAffectedTests({ files: ['config/new-runtime.json'] }), [
    ['pnpm', 'check'],
  ])
})

test('no ejecuta comandos si no hay cambios', () => {
  assert.deepEqual(planAffectedTests({ files: [] }), [])
})

test('selecciona unitarias relacionadas del servidor y de la web', () => {
  assert.deepEqual(
    planAffectedTests({
      files: ['apps/server/src/auth/check.ts', 'apps/web/src/lib/helper.ts'],
    }),
    [
      [
        'pnpm',
        '--filter',
        '@axia/server',
        'exec',
        'vitest',
        'related',
        '--run',
        'src/auth/check.ts',
      ],
      [
        'pnpm',
        '--filter',
        '@axia/web',
        'exec',
        'vitest',
        'related',
        '--run',
        'src/lib/helper.ts',
      ],
    ],
  )
})

test('selecciona toda la integración para migraciones y acceso a base', () => {
  for (const file of [
    'apps/server/db/migrations/new.sql',
    'apps/server/src/db/client.ts',
  ]) {
    assert.deepEqual(planAffectedTests({ files: [file] }), [
      ['pnpm', '--filter', '@axia/server', 'test'],
      ['pnpm', 'db:test'],
    ])
  }
})

test('selecciona specs E2E explícitos sin duplicar smoke', () => {
  assert.deepEqual(
    planAffectedTests({
      files: ['apps/web/e2e/tickets.spec.ts', 'apps/web/src/styles.css'],
    }),
    [
      [
        'pnpm',
        '--filter',
        '@axia/web',
        'exec',
        'playwright',
        'test',
        'e2e/tickets.spec.ts',
      ],
    ],
  )
})

function cli(
  t,
  {
    files,
    tracked = '',
    deleted = '',
    untracked = '',
    gitError = false,
    status = 0,
    missingCommand = false,
  } = {},
) {
  const root = mkdtempSync(join(tmpdir(), 'axia-test-plan-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  mkdirSync(join(root, 'scripts'))
  mkdirSync(join(root, 'bin'))
  for (const file of ['test-affected.mjs', 'test-plan.mjs']) {
    copyFileSync(new URL(file, import.meta.url), join(root, 'scripts', file))
  }
  const fake =
    `#!${process.execPath}\n` +
    "const fs = require('node:fs'); const args = process.argv.slice(2);\n" +
    "fs.appendFileSync(process.env.CAPTURE, JSON.stringify([require('node:path').basename(process.argv[1]), ...args]) + '\\n');\n"
  writeFileSync(
    join(root, 'bin/git'),
    fake +
      "if (process.env.GIT_ERROR === 'true') process.exit(3);\n" +
      "process.stdout.write(JSON.parse(args.includes('--diff-filter=D') ? process.env.DELETED : args[0] === 'diff' ? process.env.TRACKED : process.env.UNTRACKED));\n",
    { mode: 0o755 },
  )
  if (!missingCommand)
    writeFileSync(
      join(root, 'bin/pnpm'),
      fake + 'process.exit(Number(process.env.COMMAND_STATUS));\n',
      { mode: 0o755 },
    )
  const capture = join(root, 'commands.jsonl')
  writeFileSync(capture, '')
  const env = {
    PATH: join(root, 'bin'),
    CAPTURE: capture,
    TRACKED: JSON.stringify(tracked),
    DELETED: JSON.stringify(deleted),
    UNTRACKED: JSON.stringify(untracked),
    GIT_ERROR: String(gitError),
    COMMAND_STATUS: String(status),
  }
  if (files) env.AXIA_TEST_FILES = files.join(',')
  const result = spawnSync(
    process.execPath,
    [join(root, 'scripts/test-affected.mjs')],
    { env, encoding: 'utf8' },
  )
  const calls = readFileSync(capture, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line))
  return {
    ...result,
    calls,
    commands: calls.filter(([command]) => command === 'pnpm'),
  }
}

test('CLI incluye lockfile descubierto por Git', (t) => {
  const result = cli(t, { tracked: 'pnpm-lock.yaml\0' })
  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(result.commands, [['pnpm', 'check']])
})

test('CLI descubre borrados y conserva separadores NUL en nombres con espacios', (t) => {
  const file = 'apps/web/src/lib/old rule.ts'
  const result = cli(t, { tracked: `${file}\0`, deleted: `${file}\0` })
  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(result.commands, [['pnpm', 'check']])
  assert.ok(
    result.calls.some(
      (call) => call.includes('--diff-filter=D') && call.includes('-z'),
    ),
  )
})

test('CLI incluye archivos nuevos y evita duplicados', (t) => {
  const result = cli(t, {
    tracked: 'apps/web/src/lib/new.ts\0',
    untracked: 'apps/web/src/lib/new.ts\0',
  })
  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(result.commands, [
    [
      'pnpm',
      '--filter',
      '@axia/web',
      'exec',
      'vitest',
      'related',
      '--run',
      'src/lib/new.ts',
    ],
  ])
})

test('CLI ejecuta smoke sin variables de base exportadas', (t) => {
  const result = cli(t, { files: ['apps/web/src/routes/index.tsx'] })
  assert.equal(result.status, 0, result.stderr)
  assert.ok(
    result.commands.some(
      (command) => command.join(' ') === 'pnpm test:e2e:smoke',
    ),
  )
})

test('CLI usa compuerta completa si Git falla', (t) => {
  const result = cli(t, { gitError: true })
  assert.equal(result.status, 0)
  assert.deepEqual(result.commands, [['pnpm', 'check']])
})

test('CLI propaga fallo del comando y detiene comandos posteriores', (t) => {
  const result = cli(t, { files: ['apps/web/src/routes/index.tsx'], status: 7 })
  assert.equal(result.status, 7)
  assert.equal(result.commands.length, 1)
})

test('CLI devuelve error si no puede arrancar el comando', (t) => {
  const result = cli(t, { files: ['README.md'], missingCommand: true })
  assert.equal(result.status, 1)
})
