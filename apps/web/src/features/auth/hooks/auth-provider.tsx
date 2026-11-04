import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import { setDisplayTimezone } from '@/lib/format'
import { clearPersistedQueries, queryCacheOwner } from '@/app/query-persister'
import {
  fetchIdentity,
  signInWithPassword,
  signOut as signOutRequest,
} from '../api/auth-api'
import type { AuthSession } from '../api/auth-api'
import {
  clearCachedAuth,
  readCachedIdentity,
  writeCachedAuth,
} from '../offline-session'
import { AuthContext } from './auth-context'
import type { AuthContextValue, AuthStatus } from './auth-context'
import { useAuthSession } from './use-auth-session'

const identityQueryKey = (userId: string | undefined) =>
  ['auth', 'identity', userId] as const

function useUnauthorizedHandler(refresh: () => Promise<unknown>) {
  const queryClient = useQueryClient()
  useEffect(() => {
    function onUnauthorized() {
      void refresh()
      queryClient.clear()
      void clearPersistedQueries()
    }
    window.addEventListener('axia:unauthorized', onUnauthorized)
    return () => {
      window.removeEventListener('axia:unauthorized', onUnauthorized)
    }
  }, [queryClient, refresh])
}

function useCacheOwnerGuard(session: AuthSession | null) {
  const queryClient = useQueryClient()
  useEffect(() => {
    if (!session) return
    const owner = queryCacheOwner()
    if (owner && owner !== session.user.id) {
      queryClient.clear()
      clearCachedAuth()
      void clearPersistedQueries()
    }
  }, [queryClient, session])
}

function useSessionCacheCleanup(session: AuthSession | null) {
  const queryClient = useQueryClient()
  const hadSession = useRef(false)
  useEffect(() => {
    if (session) {
      hadSession.current = true
      return
    }
    if (!hadSession.current) return
    hadSession.current = false
    queryClient.clear()
    void clearPersistedQueries()
  }, [queryClient, session])
}

function useAuthIdentity(
  status: AuthStatus,
  session: AuthSession | null,
  isOfflineSession: boolean,
) {
  const userId = session?.user.id
  const cachedIdentity = useMemo(
    () => (userId ? readCachedIdentity(userId) : null),
    [userId],
  )
  const query = useQuery({
    queryKey: identityQueryKey(userId),
    queryFn: fetchIdentity,
    enabled: status === 'signed-in' && Boolean(userId),
    staleTime: 0,
    initialData: cachedIdentity ?? undefined,
  })

  useEffect(() => {
    if (!isOfflineSession && session && query.data) {
      writeCachedAuth(session, query.data)
    }
  }, [isOfflineSession, query.data, session])

  return query
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const { status, session, isOfflineSession, refresh } = useAuthSession()

  useCacheOwnerGuard(session)
  useSessionCacheCleanup(session)

  const {
    data: identity,
    isLoading: isIdentityLoading,
    refetch,
  } = useAuthIdentity(status, session, isOfflineSession)

  useEffect(() => {
    setDisplayTimezone(identity?.timezone)
  }, [identity?.timezone])

  useUnauthorizedHandler(refresh)

  const signIn = useCallback(
    async (username: string, password: string) => {
      await signInWithPassword(username, password)
      await refresh()
      await queryClient.invalidateQueries({ queryKey: ['auth', 'identity'] })
    },
    [queryClient, refresh],
  )

  const signOut = useCallback(async () => {
    await signOutRequest()
    await refresh()
    queryClient.clear()
    await clearPersistedQueries()
  }, [queryClient, refresh])

  const refreshIdentity = useCallback(async () => {
    await refetch()
  }, [refetch])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      identity: identity ?? null,
      isIdentityLoading,
      isOfflineSession,
      signIn,
      signOut,
      refreshIdentity,
    }),
    [
      status,
      session,
      identity,
      isIdentityLoading,
      isOfflineSession,
      signIn,
      signOut,
      refreshIdentity,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
