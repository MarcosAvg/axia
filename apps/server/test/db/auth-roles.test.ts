import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  buildAuthTestApp,
  closeAuthTestApp,
  headers,
  setupOps,
  type AuthTestContext,
} from './auth-helpers.js'

let context: AuthTestContext

beforeEach(async () => {
  context = await buildAuthTestApp()
}, 60_000)

afterEach(async () => {
  await closeAuthTestApp(context)
})

describe('role assignment protection', () => {
  it('does not let a user manager grant the administrator role', async () => {
    const { adminRole, opsCookie, opsId } = await setupOps(context)

    const selfGrant = await context.app.inject({
      method: 'PATCH',
      url: `/api/admin/users/${opsId}`,
      headers: headers(opsCookie),
      payload: { roleIds: [adminRole] },
    })
    expect(selfGrant.statusCode).toBe(403)

    const createAdmin = await context.app.inject({
      method: 'POST',
      url: '/api/admin/users',
      headers: headers(opsCookie),
      payload: {
        username: 'admin-new',
        fullName: 'Admin nuevo',
        roleIds: [adminRole],
      },
    })
    expect(createAdmin.statusCode).toBe(403)

    const viaAccess = await context.app.inject({
      method: 'POST',
      url: '/api/admin/access/user-roles',
      headers: headers(opsCookie),
      payload: { userId: opsId, roleId: adminRole },
    })
    expect(viaAccess.statusCode).toBe(403)
  })

  it('does not let a user manager reset an administrator password', async () => {
    const { adminUserId, opsCookie } = await setupOps(context)
    const response = await context.app.inject({
      method: 'POST',
      url: `/api/admin/users/${adminUserId}/reset-password`,
      headers: headers(opsCookie),
    })
    expect(response.statusCode).toBe(403)
  })
})

describe('last administrator protection', () => {
  it('protects the last administrator through the user route', async () => {
    const { adminUserId, opsCookie } = await setupOps(context)
    const response = await context.app.inject({
      method: 'PATCH',
      url: `/api/admin/users/${adminUserId}`,
      headers: headers(opsCookie),
      payload: { active: false },
    })
    expect(response.statusCode).toBe(409)
    expect(response.json()).toMatchObject({ error: { code: 'last_admin' } })
  })

  it('protects the last administrator through the access route', async () => {
    const { adminUserId, opsCookie } = await setupOps(context)
    const response = await context.app.inject({
      method: 'PATCH',
      url: `/api/admin/access/profiles/${adminUserId}`,
      headers: headers(opsCookie),
      payload: { active: false },
    })
    expect(response.statusCode).toBe(409)
  })

  it('does not deactivate the administrator role', async () => {
    const { adminCookie, adminRole } = await setupOps(context)
    const response = await context.app.inject({
      method: 'PATCH',
      url: `/api/admin/access/roles/${adminRole}`,
      headers: headers(adminCookie),
      payload: { active: false },
    })
    expect(response.statusCode).toBe(409)
  })
})
