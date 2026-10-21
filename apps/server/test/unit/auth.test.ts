import { describe, expect, it } from 'vitest'

import {
  generateTemporaryPassword,
  hashPassword,
  verifyPassword,
  verifyPasswordOrDummy,
} from '../../src/auth/password.js'
import {
  passwordSchema,
  setupSchema,
  usernameSchema,
} from '../../src/auth/schemas.js'

describe('password primitives', () => {
  it('hashes and verifies Argon2id passwords', async () => {
    const password = 'A secure password 123!'
    const hash = await hashPassword(password)

    expect(hash).toContain('$argon2id$')
    await expect(verifyPassword(hash, password)).resolves.toBe(true)
    await expect(verifyPassword(hash, 'wrong')).resolves.toBe(false)
  })

  it('pays a verification cost for unknown users and rejects them', async () => {
    await expect(verifyPasswordOrDummy(null, 'any-password')).resolves.toBe(
      false,
    )
  })

  it('generates temporary passwords with enough entropy', () => {
    const password = generateTemporaryPassword()
    expect(password.length).toBeGreaterThanOrEqual(16)
    expect(generateTemporaryPassword()).not.toBe(password)
  })
})

describe('auth schemas', () => {
  it('normalizes usernames and rejects invalid formats', () => {
    expect(usernameSchema.parse('  Admin.User ')).toBe('admin.user')
    expect(() => usernameSchema.parse('a')).toThrow()
    expect(() => usernameSchema.parse('con espacios')).toThrow()
  })

  it('enforces the configured password length', () => {
    expect(() => passwordSchema(12).parse('short')).toThrow()
    expect(passwordSchema(12).parse('A long enough password')).toBe(
      'A long enough password',
    )
  })

  it('requires the setup fields', () => {
    expect(() =>
      setupSchema(12).parse({
        username: 'admin',
        fullName: 'Administrador',
        password: 'short',
      }),
    ).toThrow()
  })
})
