import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'

const root = new URL('../', import.meta.url)
for (const [name, url, args] of [
  ['implicit reset', 'postgres://fake@127.0.0.1:1/axia_dev', []],
  [
    'development reset of ordinary database',
    'postgres://fake@127.0.0.1:1/axia',
    ['--development'],
  ],
  ['remote E2E reset', 'postgres://fake@remote.invalid/axia_e2e', ['--e2e']],
]) {
  test(`${name} refuses before any connection`, () => {
    const env = {
      ...process.env,
      AXIA_ENV_FILE: '/dev/null',
      MIGRATION_DATABASE_URL: url,
    }
    delete env.NODE_TEST_CONTEXT
    const result = spawnSync(
      process.execPath,
      ['--import', 'tsx', 'scripts/reset-db.ts', ...args],
      {
        cwd: new URL('apps/server/', root),
        encoding: 'utf8',
        env,
      },
    )
    assert.equal(result.status, 1)
    assert.match(
      result.stdout + result.stderr,
      /Reset requires explicit|Database operation requires/,
    )
    assert.doesNotMatch(result.stdout + result.stderr, /ECONNREFUSED|ENOTFOUND/)
  })
}

test('test setup never discovers dotenv files and defaults to the isolated server', () => {
  const env = { PATH: process.env.PATH, AXIA_ENV_FILE: '/dev/null' }
  const result = spawnSync(
    process.execPath,
    [
      '--import',
      'tsx',
      '--input-type=module',
      '-e',
      `
    process.loadEnvFile = () => { throw new Error('Unexpected dotenv read') }
    await import('./test/setup-env.ts')
    if (new URL(process.env.MIGRATION_DATABASE_URL).pathname !== '/axia_test') process.exit(2)
    if (new URL(process.env.MIGRATION_DATABASE_URL).port !== '55433') process.exit(3)
  `,
    ],
    { cwd: new URL('apps/server/', root), encoding: 'utf8', env },
  )
  assert.equal(result.status, 0, result.stdout + result.stderr)
})
