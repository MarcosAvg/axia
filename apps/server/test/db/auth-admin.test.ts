import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  adminId,
  buildAuthTestApp,
  closeAuthTestApp,
  cookieFrom,
  createUser,
  headers,
  login,
  roleIdByName,
  setupAdmin,
  type AuthTestContext,
} from './auth-helpers.js'

let context: AuthTestContext

beforeEach(async () => {
  context = await buildAuthTestApp()
}, 60_000)

afterEach(async () => {
  await closeAuthTestApp(context)
})

async function activeUser(username: string, temporaryPassword: string) {
  const changed = await context.app.inject({
    method: 'POST',
    url: '/api/auth/change-password',
    headers: headers(
      cookieFrom(await login(context.app, username, temporaryPassword)),
    ),
    payload: {
      currentPassword: temporaryPassword,
      newPassword: 'PersonPassword123!',
    },
  })
  expect(changed.statusCode).toBe(200)
  return cookieFrom(changed)
}

describe('user administration', () => {
  it('creates a user and forces a password change', async () => {
    const adminCookie = await setupAdmin(context.app)
    const requesterRole = await roleIdByName(
      context.app,
      adminCookie,
      'requester',
    )
    const created = await createUser(context.app, adminCookie, 'persona', [
      requesterRole,
    ])

    const temporaryLogin = await login(
      context.app,
      'persona',
      created.temporaryPassword,
    )
    expect(temporaryLogin.statusCode).toBe(200)
    expect(temporaryLogin.json()).toMatchObject({ mustChangePassword: true })
    const temporaryCookie = cookieFrom(temporaryLogin)

    const blocked = await context.app.inject({
      method: 'GET',
      url: '/api/admin/users',
      headers: headers(temporaryCookie),
    })
    expect(blocked.statusCode).toBe(403)
    expect(blocked.json()).toMatchObject({
      error: { code: 'password_change_required' },
    })

    const changed = await context.app.inject({
      method: 'POST',
      url: '/api/auth/change-password',
      headers: headers(temporaryCookie),
      payload: {
        currentPassword: created.temporaryPassword,
        newPassword: 'PersonPassword123!',
      },
    })
    expect(changed.statusCode).toBe(200)
    const personCookie = cookieFrom(changed)
    const me = await context.app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: headers(personCookie),
    })
    expect(me.json()).toMatchObject({
      user: { mustChangePassword: false },
    })
  })
})

describe('user deactivation', () => {
  it('deactivates a user and revokes their sessions', async () => {
    const adminCookie = await setupAdmin(context.app)
    const requesterRole = await roleIdByName(
      context.app,
      adminCookie,
      'requester',
    )
    const created = await createUser(context.app, adminCookie, 'persona', [
      requesterRole,
    ])
    const personCookie = await activeUser('persona', created.temporaryPassword)

    const deactivated = await context.app.inject({
      method: 'PATCH',
      url: `/api/admin/users/${created.user.id}`,
      headers: headers(adminCookie),
      payload: { active: false },
    })
    expect(deactivated.statusCode).toBe(200)

    const inactiveSession = await context.app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: headers(personCookie),
    })
    expect(inactiveSession.statusCode).toBe(401)

    const inactiveLogin = await login(
      context.app,
      'persona',
      'PersonPassword123!',
    )
    expect(inactiveLogin.statusCode).toBe(401)
  })
})

describe('password reset', () => {
  it('resets a password and revokes existing sessions', async () => {
    const adminCookie = await setupAdmin(context.app)
    const requesterRole = await roleIdByName(
      context.app,
      adminCookie,
      'requester',
    )
    const created = await createUser(context.app, adminCookie, 'persona', [
      requesterRole,
    ])
    const personCookie = await activeUser('persona', created.temporaryPassword)

    const reset = await context.app.inject({
      method: 'POST',
      url: `/api/admin/users/${created.user.id}/reset-password`,
      headers: headers(adminCookie),
    })
    expect(reset.statusCode).toBe(200)
    const temporaryPassword = (reset.json() as { temporaryPassword: string })
      .temporaryPassword

    const oldSession = await context.app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: headers(personCookie),
    })
    expect(oldSession.statusCode).toBe(401)

    const temporaryLogin = await login(
      context.app,
      'persona',
      temporaryPassword,
    )
    expect(temporaryLogin.statusCode).toBe(200)
    expect(temporaryLogin.json()).toMatchObject({ mustChangePassword: true })
  })
})

describe('admin protections', () => {
  it('protects the own account from deactivation and role removal', async () => {
    const adminCookie = await setupAdmin(context.app)
    const adminUserId = await adminId(context.app, adminCookie)
    const requesterRole = await roleIdByName(
      context.app,
      adminCookie,
      'requester',
    )

    const selfDeactivate = await context.app.inject({
      method: 'PATCH',
      url: `/api/admin/users/${adminUserId}`,
      headers: headers(adminCookie),
      payload: { active: false },
    })
    expect(selfDeactivate.statusCode).toBe(409)

    const selfRoleGuard = await context.app.inject({
      method: 'PATCH',
      url: `/api/admin/users/${adminUserId}`,
      headers: headers(adminCookie),
      payload: { roleIds: [requesterRole] },
    })
    expect(selfRoleGuard.statusCode).toBe(409)
  })
})

describe('origin guard', () => {
  it('rejects a cross-origin cookie mutation', async () => {
    const cookie = await setupAdmin(context.app)

    const badOrigin = await context.app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { host: 'localhost:80', origin: 'http://evil.example', cookie },
    })
    expect(badOrigin.statusCode).toBe(403)

    const noOrigin = await context.app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { host: 'localhost:80', cookie },
    })
    expect(noOrigin.statusCode).toBe(403)

    const goodOrigin = await context.app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: headers(cookie),
    })
    expect(goodOrigin.statusCode).toBe(204)
  })
})
