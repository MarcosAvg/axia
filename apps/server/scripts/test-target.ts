/** Validate before opening any connection: URL query parameters can override pg's host. */
export function assertDatabaseTarget(
  raw: string,
  kind: 'test' | 'e2e' | 'development',
): URL {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error('Invalid PostgreSQL target URL')
  }
  const suffix = { test: '_test', e2e: '_e2e', development: '_dev' }[kind]
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
    url.search ||
    url.hash ||
    !new RegExp(`^/[a-z_][a-z0-9_]*${suffix}$`).test(url.pathname)
  ) {
    throw new Error(
      `Database operation requires a loopback PostgreSQL URL without parameters and a database ending in ${suffix}`,
    )
  }
  return url
}

export const TEST_OWNER_URL =
  'postgres://axia_test_owner:test-owner-password@127.0.0.1:55433/axia_test'
export const TEST_APP_PASSWORD = 'test-app-password'

export function e2eEnvironment(env: NodeJS.ProcessEnv) {
  let owner: URL
  if (env.AXIA_E2E_MIGRATION_DATABASE_URL) {
    owner = assertDatabaseTarget(env.AXIA_E2E_MIGRATION_DATABASE_URL, 'e2e')
  } else {
    owner = assertDatabaseTarget(
      env.MIGRATION_DATABASE_URL ?? TEST_OWNER_URL,
      'test',
    )
    owner.pathname = owner.pathname.replace(/_test$/, '_e2e')
  }
  const app = new URL(owner)
  app.username = 'axia_app'
  app.password = env.AXIA_APP_PASSWORD ?? TEST_APP_PASSWORD
  return {
    MIGRATION_DATABASE_URL: owner.toString(),
    DATABASE_URL: app.toString(),
    AXIA_APP_PASSWORD: env.AXIA_APP_PASSWORD ?? TEST_APP_PASSWORD,
    AXIA_APP_USER: 'axia_app',
    AXIA_ENV_FILE: '/dev/null',
    PORT: '3101',
    NODE_ENV: 'test',
    AXIA_DEMO_PASSWORD: env.AXIA_DEMO_PASSWORD ?? 'E2ePassword123!',
  }
}
