import { describe, expect, it } from 'vitest'

import { parseDemoCli } from '../../src/db/seed-demo/cli.js'

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
})
