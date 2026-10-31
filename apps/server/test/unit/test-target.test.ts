import { describe, expect, it } from 'vitest'
import {
  assertDatabaseTarget,
  e2eEnvironment,
} from '../../scripts/test-target.js'

describe('isolated database targets', () => {
  it.each([
    'postgres://owner@127.0.0.1/axia_dev',
    'postgres://owner@remote.example/axia_test',
    'postgres://owner@127.0.0.1/axia_test?host=remote.example',
  ])('rejects unsafe integration target %s before connecting', (url) => {
    expect(() => assertDatabaseTarget(url, 'test')).toThrow()
  })
  it('does not echo malformed connection values in errors', () => {
    expect(() =>
      assertDatabaseTarget('private-connection-value', 'test'),
    ).toThrow('Invalid PostgreSQL target URL')
  })
  it('requires explicit development reset and an exclusive development name', () => {
    expect(() =>
      assertDatabaseTarget('postgres://owner@localhost/axia', 'development'),
    ).toThrow()
    expect(
      assertDatabaseTarget('postgres://owner@localhost/axia_dev', 'development')
        .pathname,
    ).toBe('/axia_dev')
  })
  it('derives E2E from a validated test owner URL, ignoring development app credentials', () => {
    const env = e2eEnvironment({
      MIGRATION_DATABASE_URL: 'postgres://owner:fake@localhost:55433/axia_test',
      DATABASE_URL: 'postgres://app:fake@localhost/axia_dev',
    })
    expect(new URL(env.MIGRATION_DATABASE_URL).pathname).toBe('/axia_e2e')
    expect(new URL(env.DATABASE_URL).pathname).toBe('/axia_e2e')
    expect(env.PORT).toBe('3101')
  })
  it('rejects development source and remote explicit E2E target', () => {
    expect(() =>
      e2eEnvironment({
        MIGRATION_DATABASE_URL: 'postgres://owner@localhost/axia_dev',
      }),
    ).toThrow()
    expect(() =>
      e2eEnvironment({
        AXIA_E2E_MIGRATION_DATABASE_URL:
          'postgres://owner@remote.example/axia_e2e',
      }),
    ).toThrow()
  })
})
