import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo } from 'react'
import type { ReactNode } from 'react'
import { setDisplayTimezone } from '@/lib/format'
import {
  fetchIdentity,
  signInWithPassword,
  signOut as signOutRequest,
} from '../api/auth-api'
import { AuthContext } from './auth-context'
import type { AuthContextValue } from './auth-context'
import { useAuthSession } from './use-auth-session'

const identityQueryKey = (userId: string | undefined) =>
  ['auth', 'identity', userId] as const

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const { status, session } = useAuthSession()
  const userId = session?.user.id

  const {
    data: identity,
    isLoading: isIdentityLoading,
    refetch,
  } = useQuery({
    queryKey: identityQueryKey(userId),
    queryFn: fetchIdentity,
    enabled: status === 'signed-in' && Boolean(userId),
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    setDisplayTimezone(identity?.timezone)
  }, [identity?.timezone])

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithPassword(email, password)
  }, [])

  const signOut = useCallback(async () => {
    await signOutRequest()
    queryClient.clear()
  }, [queryClient])

  const refreshIdentity = useCallback(async () => {
    await refetch()
  }, [refetch])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      identity: identity ?? null,
      isIdentityLoading,
      signIn,
      signOut,
      refreshIdentity,
    }),
    [
      status,
      session,
      identity,
      isIdentityLoading,
      signIn,
      signOut,
      refreshIdentity,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
