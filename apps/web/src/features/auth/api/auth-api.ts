import { apiFetch, ApiError } from '@/lib/api-client'
import type { Identity, Permission } from '../domain/identity'
import { parseIdentity } from '../schemas'

/** Sesión mínima de Axia: el servidor guarda el token opaco en una cookie. */
export type AuthSession = {
  user: {
    id: string
    username: string
    fullName: string
  }
}

export interface ProfileUpdateInput {
  fullName: string
  phone: string | null
}

type MeResponse = {
  user: {
    id: string
    username: string
    fullName: string
    phone: string | null
    active: boolean
    timezone: string
    mustChangePassword: boolean
    roles: string[]
    permissions: Permission[]
    technicianId: string | null
  }
}

/** Sesión actual, o `null` si no hay. */
export async function getSession(): Promise<AuthSession | null> {
  try {
    const me = await apiFetch<MeResponse>('/api/auth/me')
    return {
      user: {
        id: me.user.id,
        username: me.user.username,
        fullName: me.user.fullName,
      },
    }
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null
    throw error
  }
}

/** La sesión vive en una cookie; no hay eventos del navegador que escuchar. */

export async function signInWithPassword(
  username: string,
  password: string,
): Promise<void> {
  await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export async function signOut(): Promise<void> {
  await apiFetch('/api/auth/logout', { method: 'POST' })
}

export async function fetchIdentity(): Promise<Identity> {
  const me = await apiFetch<MeResponse>('/api/auth/me')
  return parseIdentity(me)
}

export async function updateProfile(input: ProfileUpdateInput): Promise<void> {
  await apiFetch('/api/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export async function changePassword(input: {
  currentPassword: string
  newPassword: string
}): Promise<void> {
  await apiFetch('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function fetchSetupStatus(): Promise<{ required: boolean }> {
  return apiFetch('/api/setup/status')
}

export async function setupAdmin(input: {
  username: string
  fullName: string
  password: string
}): Promise<void> {
  await apiFetch('/api/setup', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
