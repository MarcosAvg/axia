// Validación con Zod de las fronteras del feature de autenticación.

import { z } from 'zod'
import type { Identity, Permission } from './domain/identity'
import { authMessages } from './i18n'

const permissionSchema = z.object({
  permission: z.string().min(1),
  scope: z.enum(['own', 'team', 'buildings', 'all']),
})

// Respuesta cruda de la RPC `me()` (snake_case, tal como la devuelve Postgres).
const identityResponseSchema = z.object({
  user_id: z.string(),
  profile: z
    .object({
      id: z.string(),
      full_name: z.string(),
      phone: z.string().nullable(),
      active: z.boolean(),
    })
    .nullable(),
  roles: z.array(z.string()),
  permissions: z.array(permissionSchema),
  timezone: z.string(),
})

export const loginSchema = z.object({
  email: z.email(authMessages.login.errors.email),
  password: z.string().min(1, authMessages.login.errors.password),
})
export type LoginInput = z.infer<typeof loginSchema>

export const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, authMessages.profile.errors.fullName)
    .max(120),
  phone: z.string().trim().max(40).optional(),
})
export type ProfileInput = z.infer<typeof profileSchema>

/** Convierte la respuesta de `me()` en una identidad tipada. Lanza si no hay perfil. */
export function parseIdentity(raw: unknown): Identity {
  const data = identityResponseSchema.parse(raw)
  if (!data.profile) {
    throw new Error('El usuario no tiene perfil')
  }
  return {
    userId: data.user_id,
    fullName: data.profile.full_name,
    phone: data.profile.phone,
    active: data.profile.active,
    roles: data.roles,
    permissions: data.permissions as Permission[],
    timezone: data.timezone,
  }
}
