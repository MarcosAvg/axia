import { apiFetch } from '@/lib/api-client'
import type { UserAccount } from '../domain/access'

interface UserAccountsResponse {
  items: UserAccount[]
  total: number
  page: number
  pageSize: number
}

export interface CreateUserInput {
  username: string
  fullName: string
  roleIds: string[]
}

export interface CreateUserResult {
  user: UserAccount
  temporaryPassword: string
}

/** Cuentas de la instancia, con usuario, último acceso y estado de contraseña. */
export async function listUserAccounts(): Promise<UserAccount[]> {
  const body = await apiFetch<UserAccountsResponse>(
    '/api/admin/users?page=1&pageSize=100',
  )
  return body.items
}

export async function createUser(
  input: CreateUserInput,
): Promise<CreateUserResult> {
  return apiFetch<CreateUserResult>('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function resetUserPassword(
  id: string,
): Promise<{ temporaryPassword: string }> {
  return apiFetch<{ temporaryPassword: string }>(
    `/api/admin/users/${id}/reset-password`,
    { method: 'POST' },
  )
}

export async function revokeUserSessions(id: string): Promise<void> {
  await apiFetch(`/api/admin/users/${id}/revoke-sessions`, { method: 'POST' })
}

export async function deleteUser(id: string): Promise<void> {
  await apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' })
}
