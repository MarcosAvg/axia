import { describe, expect, it } from 'vitest'

import {
  localDemoEnvironment,
  parseDemoCli,
} from '../../src/db/seed-demo/cli.js'

const localUrl = 'postgres://axia_owner:secret@127.0.0.1:5433/axia'

describe('demo seed CLI', () => {
  it('requires the explicit flag', () => {
    expect(() =>
      parseDemoCli([], { MIGRATION_DATABASE_URL: localUrl }),
    ).toThrow(/explícita/)
  })

  it('refuses production', () => {
    expect(() =>
      parseDemoCli(['--demo'], {
        NODE_ENV: 'production',
        MIGRATION_DATABASE_URL: localUrl,
      }),
    ).toThrow(/production/)
  })

  it('refuses non-local databases', () => {
    expect(() =>
      parseDemoCli(['--demo'], {
        MIGRATION_DATABASE_URL:
          'postgres://axia_owner:secret@db.example.test:5432/axia',
      }),
    ).toThrow(/base local/)
  })

  it('accepts the compose db host and the reset flag', () => {
    expect(
      parseDemoCli(['--demo', '--reset-passwords'], {
        MIGRATION_DATABASE_URL: 'postgres://axia_owner:secret@db:5432/axia',
        AXIA_DEMO_PASSWORD: 'DemoPassword123!',
      }),
    ).toMatchObject({
      resetPasswords: true,
      password: 'DemoPassword123!',
    })
  })

  it('reapplies an explicit env password without requiring the reset flag', () => {
    expect(
      parseDemoCli(['--demo'], {
        MIGRATION_DATABASE_URL: localUrl,
        AXIA_DEMO_PASSWORD: 'DemoPassword123!',
      }),
    ).toMatchObject({
      resetPasswords: true,
      password: 'DemoPassword123!',
    })
  })

  it('ignores an empty env password', () => {
    expect(
      parseDemoCli(['--demo'], {
        MIGRATION_DATABASE_URL: localUrl,
        AXIA_DEMO_PASSWORD: '',
      }),
    ).toMatchObject({
      resetPasswords: false,
      password: undefined,
    })
  })
})

it('passes the configured private storage directory to the demo seed', () => {
  expect(
    parseDemoCli(['--demo'], {
      MIGRATION_DATABASE_URL: localUrl,
      STORAGE_DIR: '/tmp/axia-demo-private',
    }),
  ).toMatchObject({ evidenceDir: '/tmp/axia-demo-private' })
})

it('uses the same local storage override as the development API', () => {
  const env = localDemoEnvironment({
    MIGRATION_DATABASE_URL: localUrl,
    AXIA_DEV_STORAGE_DIR: '/tmp/axia-custom-demo',
    STORAGE_DIR: '/data/evidence',
  })
  expect(parseDemoCli(['--demo'], env).evidenceDir).toBe(
    '/tmp/axia-custom-demo',
  )
})

it('uses repository storage instead of a container path for local demo', () => {
  const env = localDemoEnvironment({
    MIGRATION_DATABASE_URL: localUrl,
    STORAGE_DIR: '/data/evidence',
  })
  expect(parseDemoCli(['--demo'], env).evidenceDir).toMatch(
    /apps\/server\/data\/evidence\/$/,
  )
})
