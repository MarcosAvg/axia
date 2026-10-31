import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { Script } from 'node:vm'

// Aísla los procesos externos: ninguna prueba puede ejecutar pnpm ni tocar una base.
const scriptUrl = new URL('./test-affected.mjs', import.meta.url)
const source = readFileSync(scriptUrl, 'utf8')
  .replace(/^import .* from 'node:child_process'$/m, '')
  .replaceAll('import.meta.url', JSON.stringify(scriptUrl.href))

function selectTests(
  t,
  {
    files,
    tracked = '',
    deleted = '',
    gitError,
    status = 0,
    withDatabase = true,
  } = {},
) {
  const commands = []
  const gitCommands = []
  const env = { AXIA_TEST_BASE: 'main', MIGRATION_DATABASE_URL: 'test-only' }
  if (!withDatabase) delete env.MIGRATION_DATABASE_URL
  if (files) env.AXIA_TEST_FILES = files.join(',')
  const exit = Symbol('exit')
  let exitCode
  const context = {
    URL,
    console: { log() {}, warn() {} },
    process: {
      env,
      exit(code) {
        exitCode = code
        throw exit
      },
    },
    spawnSync(command, args) {
      commands.push([command, ...args])
      return { status }
    },
    execFileSync(command, args) {
      assert.equal(command, 'git')
      gitCommands.push([...args])
      if (gitError) throw new Error('Git no disponible')
      if (args.includes('--diff-filter=D')) return deleted
      return args[0] === 'diff' ? tracked : ''
    },
  }
  try {
    new Script(source, { filename: scriptUrl.pathname }).runInNewContext(
      context,
    )
  } catch (error) {
    if (error !== exit) throw error
  }
  return { commands, gitCommands, exitCode }
}

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
  test(`ejecuta la compuerta completa para ${file}`, async (t) => {
    const result = await selectTests(t, { files: [file] })
    assert.deepEqual(result.commands, [['pnpm', 'check']])
  })
}

test('mantiene los cambios exclusivamente documentales fuera de la compuerta completa', async (t) => {
  const result = await selectTests(t, {
    files: ['README.md', 'docs/start/instalacion.md'],
  })
  assert.deepEqual(result.commands, [['pnpm', 'check:docs']])
})

for (const file of [
  'apps/web/src/routes/index.tsx',
  'apps/web/src/styles.css',
]) {
  test(`ejecuta smoke para el cambio de interfaz ${file}`, async (t) => {
    const result = await selectTests(t, { files: [file] })
    assert.ok(
      result.commands.some(
        (command) => command.join(' ') === 'pnpm test:e2e:smoke',
      ),
    )
    assert.ok(
      !result.commands.some((command) => command.join(' ') === 'pnpm check'),
    )
  })
}

test('incluye el lockfile descubierto por git', async (t) => {
  const result = await selectTests(t, { tracked: 'pnpm-lock.yaml' })
  assert.deepEqual(result.commands, [['pnpm', 'check']])
})

test('ejecuta smoke con el destino aislado predeterminado sin variables exportadas', (t) => {
  const result = selectTests(t, {
    files: ['apps/web/src/routes/index.tsx'],
    withDatabase: false,
  })
  assert.ok(
    result.commands.some(
      (command) => command.join(' ') === 'pnpm test:e2e:smoke',
    ),
  )
})

test('ejecuta la compuerta completa si se elimina código', async (t) => {
  const result = await selectTests(t, {
    tracked: 'apps/web/src/features/tickets/domain/old-rule.ts',
    deleted: 'apps/web/src/features/tickets/domain/old-rule.ts',
  })
  assert.deepEqual(result.commands, [['pnpm', 'check']])
  assert.ok(result.gitCommands.some((args) => args.includes('--diff-filter=D')))
})

test('conserva el chequeo documental si solo se elimina documentación', async (t) => {
  const result = await selectTests(t, {
    tracked: 'docs/old.md',
    deleted: 'docs/old.md',
  })
  assert.deepEqual(result.commands, [['pnpm', 'check:docs']])
})

test('usa la compuerta completa si git no puede descubrir cambios', async (t) => {
  const result = await selectTests(t, { gitError: true })
  assert.deepEqual(result.commands, [['pnpm', 'check']])
})

test('usa la compuerta completa para archivos no clasificados', async (t) => {
  const result = await selectTests(t, { files: ['config/new-runtime.json'] })
  assert.deepEqual(result.commands, [['pnpm', 'check']])
})

test('propaga el fallo del comando seleccionado', async (t) => {
  const result = await selectTests(t, { files: ['README.md'], status: 7 })
  assert.equal(result.exitCode, 7)
})
