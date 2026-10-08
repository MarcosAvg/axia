import { createContext, useContext } from 'react'
import type { AuthSession } from '../api/auth-api'
import type { Identity } from '../domain/identity'

export type AuthStatus = 'loading' | 'signed-out' | 'signed-in'

export interface AuthContextValue {
  status: AuthStatus
  session: AuthSession | null
  identity: Identity | null
  isIdentityLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshIdentity: () => Promise<void>
}

/** Contexto de sesión. Exportado para las pruebas; en el código usa `useAuth`. */
export const AuthContext = createContext<AuthContextValue | null>(null)

/** Estado de sesión e identidad del usuario. Debe usarse dentro de `<AuthProvider>`. */
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  }
  return value
}
