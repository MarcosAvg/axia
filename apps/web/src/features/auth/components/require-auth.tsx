import { Navigate } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { can, canAny } from '../domain/identity'
import { useAuth } from '../hooks/auth-context'
import { ChangePasswordScreen } from './change-password-screen'
import { ForbiddenCard } from './forbidden-card'
import { LoadingScreen } from './loading-screen'

/** Redirige a `/login` si no hay sesión; si la hay, muestra el contenido. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status, identity, isIdentityLoading } = useAuth()
  if (status === 'loading' || isIdentityLoading) return <LoadingScreen />
  if (status === 'signed-out') return <Navigate to="/login" replace />
  if (identity?.mustChangePassword) return <ChangePasswordScreen />
  return <>{children}</>
}

/** Muestra el contenido solo si el usuario tiene el permiso; si no, un aviso. */
export function RequirePermission({
  permission,
  children,
}: {
  permission: string
  children: ReactNode
}) {
  const { identity, isIdentityLoading } = useAuth()
  if (isIdentityLoading) return <LoadingScreen />
  if (!can(identity, permission)) return <ForbiddenCard />
  return <>{children}</>
}

/** Muestra el contenido si el usuario tiene al menos uno de los permisos. */
export function RequireAnyPermission({
  permissions,
  children,
}: {
  permissions: string[]
  children: ReactNode
}) {
  const { identity, isIdentityLoading } = useAuth()
  if (isIdentityLoading) return <LoadingScreen />
  if (!canAny(identity, permissions)) return <ForbiddenCard />
  return <>{children}</>
}

/** Muestra el contenido solo si la cuenta tiene un perfil de técnico. */
export function RequireTechnician({ children }: { children: ReactNode }) {
  const { identity, isIdentityLoading } = useAuth()
  if (isIdentityLoading) return <LoadingScreen />
  if (!identity?.technicianId) return <ForbiddenCard />
  return <>{children}</>
}
