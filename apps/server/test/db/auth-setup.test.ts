import { sql } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  ADMIN_PASSWORD,
  buildAuthTestApp,
  closeAuthTestApp,
  cookieFrom,
  headers,
  login,
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

describe('setup and sessions', () => {
  it('creates the first administrator once and returns a session cookie', async () => {
    const before = await context.app.inject({
      method: 'GET',
      url: '/api/setup/status',
    })
    expect(before.json()).toEqual({ required: true })

    const setup = await context.app.inject({
      method: 'POST',
      url: '/api/setup',
      headers: headers(),
      payload: {
        username: 'admin',
        fullName: 'Administrador',
        password: ADMIN_PASSWORD,
      },
    })
    expect(setup.statusCode).toBe(201)
    expect(setup.body).not.toContain('$argon2')
    expect(String(setup.headers['set-cookie'])).toContain('axia_session=')
    expect(String(setup.headers['set-cookie'])).toContain('HttpOnly')
    expect(String(setup.headers['set-cookie'])).toContain('SameSite=Lax')

    const me = await context.app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: headers(cookieFrom(setup)),
    })
    expect(me.statusCode).toBe(200)
    expect(me.json()).toMatchObject({
      user: { username: 'admin', mustChangePassword: false },
    })

    const second = await context.app.inject({
      method: 'POST',
      url: '/api/setup',
      headers: headers(),
      payload: {
        username: 'other',
        fullName: 'Otro',
        password: ADMIN_PASSWORD,
      },
    })
    expect(second.statusCode).toBe(409)
  })
})

describe('setup concurrency', () => {
  it('serializes concurrent setup requests', async () => {
    const request = () =>
      context.app.inject({
        method: 'POST',
        url: '/api/setup',
        headers: headers(),
        payload: {
          username: 'admin',
          fullName: 'Administrador',
          password: ADMIN_PASSWORD,
        },
      })
    const responses = await Promise.all([request(), request()])
    expect(responses.map((response) => response.statusCode).sort()).toEqual([
      201, 409,
    ])
  })
})

describe('sessions', () => {
  it('revokes the session on logout and when it expires', async () => {
    const cookie = await setupAdmin(context.app)
    const logout = await context.app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: headers(cookie),
    })
    expect(logout.statusCode).toBe(204)

    const afterLogout = await context.app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: headers(cookie),
    })
    expect(afterLogout.statusCode).toBe(401)

    const loginResponse = await login(context.app, 'admin', ADMIN_PASSWORD)
    expect(loginResponse.statusCode).toBe(200)
    const secondCookie = cookieFrom(loginResponse)
    await context.db.execute(sql`
      update public.sessions
      set idle_expires_at = now() - interval '1 second'
    `)
    const expired = await context.app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: headers(secondCookie),
    })
    expect(expired.statusCode).toBe(401)
  })
})

describe('login and password', () => {
  it('uses a generic error and locks after repeated failures', async () => {
    await setupAdmin(context.app)

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await login(context.app, 'admin', 'wrong-password')
      expect(response.statusCode).toBe(401)
      expect(response.json()).toMatchObject({
        error: { code: 'invalid_credentials' },
      })
    }

    const locked = await login(context.app, 'admin', 'wrong-password')
    expect(locked.statusCode).toBe(429)
    expect(locked.headers['retry-after']).toBeDefined()
  })

  it('changes the password and revokes old sessions', async () => {
    const cookie = await setupAdmin(context.app)
    const wrongCurrent = await context.app.inject({
      method: 'POST',
      url: '/api/auth/change-password',
      headers: headers(cookie),
      payload: {
        currentPassword: 'not-the-password',
        newPassword: 'NewPassword123!',
      },
    })
    expect(wrongCurrent.statusCode).toBe(400)

    const changed = await context.app.inject({
      method: 'POST',
      url: '/api/auth/change-password',
      headers: headers(cookie),
      payload: {
        currentPassword: ADMIN_PASSWORD,
        newPassword: 'NewPassword123!',
      },
    })
    expect(changed.statusCode).toBe(200)

    const oldSession = await context.app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: headers(cookie),
    })
    expect(oldSession.statusCode).toBe(401)

    const oldPassword = await login(context.app, 'admin', ADMIN_PASSWORD)
    expect(oldPassword.statusCode).toBe(401)
    const newPassword = await login(context.app, 'admin', 'NewPassword123!')
    expect(newPassword.statusCode).toBe(200)
  })
})
