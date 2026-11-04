import { useCallback, useEffect, useState } from 'react'

import { setOfflineUserId } from '@/lib/offline/user'
import { getSession } from '../api/auth-api'
import type { AuthSession } from '../api/auth-api'
import { clearCachedAuth, readCachedAuth } from '../offline-session'
import type { AuthStatus } from './auth-context'

/** Mantiene la sesión de Axia (cookie opaca en el servidor). */
export function useAuthSession() {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [session, setSession] = useState<AuthSession | null>(null)
  const [isOfflineSession, setIsOfflineSession] = useState(false)

  const applySession = useCallback(
    (next: AuthSession | null, offline = false) => {
      setOfflineUserId(next?.user.id ?? null)
      setSession(next)
      setStatus(next ? 'signed-in' : 'signed-out')
      setIsOfflineSession(Boolean(next) && offline)
      if (!next) clearCachedAuth()
    },
    [],
  )

  const refresh = useCallback(async () => {
    try {
      const next = await getSession()
      applySession(next)
      return next
    } catch {
      const cached = readCachedAuth()
      if (cached) {
        applySession(cached.session, true)
        return cached.session
      }
      applySession(null)
      return null
    }
  }, [applySession])

  useEffect(() => {
    let active = true
    getSession()
      .then((next) => {
        if (active) applySession(next)
      })
      .catch(() => {
        if (!active) return
        const cached = readCachedAuth()
        if (cached) applySession(cached.session, true)
        else applySession(null)
      })
    return () => {
      active = false
    }
  }, [applySession])

  useEffect(() => {
    if (!isOfflineSession || typeof window === 'undefined') return
    const onOnline = () => {
      void refresh()
    }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [isOfflineSession, refresh])

  return { status, session, isOfflineSession, refresh }
}
