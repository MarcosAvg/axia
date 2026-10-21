import { z } from 'zod'

export const usernameSchema = z
  .string()
  .transform((value) => value.trim().toLowerCase())
  .pipe(
    z
      .string()
      .regex(
        /^[a-z0-9][a-z0-9._-]{2,63}$/,
        'El usuario debe tener entre 3 y 64 caracteres: minúsculas, números, punto, guion o guion bajo',
      ),
  )

export const passwordSchema = (minLength: number) =>
  z
    .string()
    .min(minLength, `La contraseña debe tener al menos ${minLength} caracteres`)
    .max(128, 'La contraseña no puede superar 128 caracteres')

export const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1).max(128),
})

export const setupSchema = (minLength: number) =>
  z.object({
    username: usernameSchema,
    fullName: z.string().trim().min(1).max(120),
    password: passwordSchema(minLength),
  })

export const changePasswordSchema = (minLength: number) =>
  z.object({
    currentPassword: z.string().min(1).max(128),
    newPassword: passwordSchema(minLength),
  })

export const createUserSchema = z.object({
  username: usernameSchema,
  fullName: z.string().trim().min(1).max(120),
  roleIds: z.array(z.string().uuid()).min(1),
})

export const updateUserSchema = z
  .object({
    fullName: z.string().trim().min(1).max(120).optional(),
    active: z.boolean().optional(),
    roleIds: z.array(z.string().uuid()).min(1).optional(),
  })
  .refine(
    (value) =>
      value.fullName !== undefined ||
      value.active !== undefined ||
      value.roleIds !== undefined,
    'Indica al menos un cambio',
  )

export const listUsersQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  active: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
})
