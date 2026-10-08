import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { getSession, subscribeToAuthChanges } from '../api/auth-api'
import type { AuthSession } from '../api/auth-api'
import type { AuthStatus } from './auth-context'

/** Mantiene la sesión de Supabase (estado inicial y cambios en vivo). */
export function useAuthSession() {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [session, setSession] = useState<AuthSession | null>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    let isMounted = true

    getSession()
      .then((initial) => {
        if (!isMounted) return
        setSession(initial)
        setStatus(initial ? 'signed-in' : 'signed-out')
      })
      .catch(() => {
        if (isMounted) setStatus('signed-out')
      })

    const unsubscribe = subscribeToAuthChanges((next) => {
      setSession(next)
      setStatus(next ? 'signed-in' : 'signed-out')
      void queryClient.invalidateQueries({ queryKey: ['auth', 'identity'] })
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [queryClient])

  return { status, session }
}
