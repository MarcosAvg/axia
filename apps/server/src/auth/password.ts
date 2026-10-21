import { randomBytes } from 'node:crypto'

import { hash, verify, type Algorithm } from '@node-rs/argon2'

const ARGON2ID: Algorithm = 2

const ARGON_OPTIONS = {
  algorithm: ARGON2ID,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
} as const

let dummyHash: Promise<string> | undefined

function getDummyHash(): Promise<string> {
  dummyHash ??= hash('axia-invalid-password', ARGON_OPTIONS)
  return dummyHash
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON_OPTIONS)
}

export async function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  try {
    return await verify(passwordHash, password)
  } catch {
    return false
  }
}

/**
 * Verifies against a real hash, or a dummy one when the username does not
 * exist, so both paths pay a similar Argon2 cost.
 */
export async function verifyPasswordOrDummy(
  passwordHash: string | null,
  password: string,
): Promise<boolean> {
  const target = passwordHash ?? (await getDummyHash())
  const valid = await verifyPassword(target, password)
  return passwordHash !== null && valid
}

export function generateTemporaryPassword(): string {
  return randomBytes(18).toString('base64url')
}
