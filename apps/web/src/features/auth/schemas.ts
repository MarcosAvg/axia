// Validación con Zod de las fronteras del feature de autenticación.

import { z } from 'zod'
import type { Identity, Permission } from './domain/identity'
import { authMessages } from './i18n'

const permissionSchema = z.object({
  permission: z.string().min(1),
  scope: z.enum(['own', 'team', 'buildings', 'all']),
})

// Respuesta camelCase de `GET /api/auth/me`.
const identityResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    fullName: z.string(),
    phone: z.string().nullable(),
    active: z.boolean(),
    roles: z.array(z.string()),
    permissions: z.array(permissionSchema),
    technicianId: z.string().nullable(),
    timezone: z.string(),
    mustChangePassword: z.boolean(),
  }),
})

export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, authMessages.login.errors.username)
    .max(64, authMessages.login.errors.username),
  password: z.string().min(1, authMessages.login.errors.password),
})
export type LoginInput = z.infer<typeof loginSchema>

export const setupSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, authMessages.setup.errors.username)
      .max(64, authMessages.setup.errors.username),
    fullName: z
      .string()
      .trim()
      .min(1, authMessages.setup.errors.fullName)
      .max(120),
    password: z.string().min(12, authMessages.setup.errors.password).max(128),
    confirmPassword: z.string().min(1, authMessages.setup.errors.confirm),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: authMessages.setup.errors.confirm,
  })
export type SetupInput = z.infer<typeof setupSchema>

export const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, authMessages.profile.errors.fullName)
    .max(120),
  phone: z.string().trim().max(40).optional(),
})
export type ProfileInput = z.infer<typeof profileSchema>

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(12, authMessages.setup.errors.password),
    confirmPassword: z.string().min(1),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ['confirmPassword'],
    message: authMessages.password.errors.confirm,
  })
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>

/** Convierte la respuesta de `me()` en una identidad tipada. Lanza si no hay perfil. */
export function parseIdentity(raw: unknown): Identity {
  const data = identityResponseSchema.parse(raw)
  return {
    userId: data.user.id,
    fullName: data.user.fullName,
    phone: data.user.phone,
    active: data.user.active,
    roles: data.user.roles,
    permissions: data.user.permissions as Permission[],
    technicianId: data.user.technicianId,
    timezone: data.user.timezone,
    mustChangePassword: data.user.mustChangePassword,
  }
}
