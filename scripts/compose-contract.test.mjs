import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

function compose(overrides = {}) {
  const result = spawnSync(
    'docker',
    [
      'compose',
      '--env-file',
      '/dev/null',
      '-f',
      'compose.yaml',
      'config',
      '--format',
      'json',
    ],
    {
      encoding: 'utf8',
      env: {
        PATH: process.env.PATH,
        AXIA_IMAGE: 'axia:audit-test',
        POSTGRES_OWNER_PASSWORD: 'owner-test',
        AXIA_APP_PASSWORD: 'app-test',
        ...overrides,
      },
    },
  )
  assert.equal(result.status, 0, result.stderr)
  return JSON.parse(result.stdout)
}

test('server and migrator use the exact same selected artifact', () => {
  const { services } = compose()
  assert.equal(services.app.image, 'axia:audit-test')
  assert.equal(services.migrate.image, services.app.image)
  assert.deepEqual(services.migrate.command, ['node', 'dist/db/migrate.js'])
  assert.equal(services.app.environment.MIGRATION_DATABASE_URL, undefined)
  assert.equal(services.app.environment.POSTGRES_OWNER_PASSWORD, undefined)
  assert.equal(services.migrate.environment.AXIA_APP_USER, undefined)
})

test('session, access and cleanup settings reach the runtime explicitly', () => {
  const settings = {
    SESSION_COOKIE_NAME: 'test_session',
    SESSION_ABSOLUTE_TTL_HOURS: '72',
    SESSION_IDLE_TTL_HOURS: '2',
    SESSION_TOUCH_INTERVAL_SECONDS: '10',
    LOGIN_MAX_ATTEMPTS: '3',
    LOGIN_MAX_IP_ATTEMPTS: '9',
    LOGIN_WINDOW_MINUTES: '7',
    PASSWORD_MIN_LENGTH: '14',
    EVIDENCE_CLEANUP_HOURS: '48',
    RETENTION_SESSION_DAYS: '5',
    RETENTION_LOGIN_ATTEMPT_DAYS: '6',
    RETENTION_NOTIFICATION_DAYS: '7',
  }
  const { services } = compose(settings)
  for (const [key, value] of Object.entries(settings)) {
    assert.equal(services.app.environment[key], value, key)
  }
})

test('production does not publish database or app ports', () => {
  const { services } = compose()
  assert.equal(services.db.ports, undefined)
  assert.equal(services.app.ports, undefined)
  assert.equal(
    services.app.depends_on.migrate.condition,
    'service_completed_successfully',
  )
})

test('one runtime artifact is built without copying local evidence', () => {
  const ignore = readFileSync('.dockerignore', 'utf8')
  assert.match(ignore, /^apps\/server\/data\/?$/m)
  const dockerfile = readFileSync('apps/server/Dockerfile', 'utf8')
  assert.doesNotMatch(dockerfile, /FROM runtime AS migrate/)
})
