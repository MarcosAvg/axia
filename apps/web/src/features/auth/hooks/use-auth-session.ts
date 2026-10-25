import { useCallback, useEffect, useState } from 'react'

import { setOfflineUserId } from '@/lib/offline/user'
import { getSession } from '../api/auth-api'
import type { AuthSession } from '../api/auth-api'
import type { AuthStatus } from './auth-context'

/** Mantiene la sesión de Axia (cookie opaca en el servidor). */
export function useAuthSession() {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [session, setSession] = useState<AuthSession | null>(null)

  const applySession = useCallback((next: AuthSession | null) => {
    setOfflineUserId(next?.user.id ?? null)
    setSession(next)
    setStatus(next ? 'signed-in' : 'signed-out')
  }, [])

  const refresh = useCallback(async () => {
    try {
      const next = await getSession()
      applySession(next)
      return next
    } catch {
      applySession(null)
      return null
    }
  }, [applySession])

  useEffect(() => {
    let active = true
    getSession()
      .then((next) => {
        if (!active) return
        applySession(next)
      })
      .catch(() => {
        if (!active) return
        setOfflineUserId(null)
        setStatus('signed-out')
      })
    return () => {
      active = false
    }
  }, [applySession])

  return { status, session, refresh }
}
