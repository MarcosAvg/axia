import { useCallback, useEffect, useState } from 'react'

import { getSession } from '../api/auth-api'
import type { AuthSession } from '../api/auth-api'
import type { AuthStatus } from './auth-context'

/** Mantiene la sesión de Axia (cookie opaca en el servidor). */
export function useAuthSession() {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [session, setSession] = useState<AuthSession | null>(null)

  const refresh = useCallback(async () => {
    try {
      const next = await getSession()
      setSession(next)
      setStatus(next ? 'signed-in' : 'signed-out')
      return next
    } catch {
      setSession(null)
      setStatus('signed-out')
      return null
    }
  }, [])

  useEffect(() => {
    let active = true
    getSession()
      .then((next) => {
        if (!active) return
        setSession(next)
        setStatus(next ? 'signed-in' : 'signed-out')
      })
      .catch(() => {
        if (active) setStatus('signed-out')
      })
    return () => {
      active = false
    }
  }, [])

  return { status, session, refresh }
}
