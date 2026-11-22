import { useCallback, useEffect, useState } from 'react'

import { setOfflineUserId } from '@/lib/offline/user'
import { getSession } from '../api/auth-api'
import type { AuthSession } from '../api/auth-api'
import { clearCachedAuth, readCachedAuth } from '../offline-session'
import type { AuthStatus } from './auth-context'

async function loadSession() {
  if (navigator.onLine) {
    try {
      return { session: await getSession(), offline: false }
    } catch {
      // La sesión local sigue disponible durante una interrupción de red.
    }
  }
  return { session: readCachedAuth()?.session ?? null, offline: true }
}

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
    const { session, offline } = await loadSession()
    applySession(session, offline)
    return session
  }, [applySession])

  useEffect(() => {
    let active = true
    void loadSession().then(({ session, offline }) => {
      if (active) applySession(session, offline)
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
