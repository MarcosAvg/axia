import { Navigate } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { can } from '../domain/identity'
import { useAuth } from '../hooks/auth-context'
import { ForbiddenCard } from './forbidden-card'
import { LoadingScreen } from './loading-screen'

/** Redirige a `/login` si no hay sesión; si la hay, muestra el contenido. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  if (status === 'loading') return <LoadingScreen />
  if (status === 'signed-out') return <Navigate to="/login" replace />
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
