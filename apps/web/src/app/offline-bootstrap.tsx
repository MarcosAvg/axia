import { useEffect } from 'react'
import { useAuth } from '@/features/auth'

/**
 * Arranca la cola offline cuando hay sesión.
 *
 * Se importa en diferido para que `/login` no cargue la funcionalidad de
 * tiquets, Dexie ni TUS: sin sesión no hay acciones que reenviar.
 */
export function OfflineBootstrap() {
  const { status } = useAuth()

  useEffect(() => {
    if (status !== 'signed-in') return

    let dispose: (() => void) | undefined
    let isActive = true

    void import('@/app/offline')
      .then(({ setupOffline }) => {
        if (isActive) dispose = setupOffline()
      })
      .catch((error: unknown) => {
        console.warn('No se pudo iniciar la cola offline', error)
      })

    return () => {
      isActive = false
      dispose?.()
    }
  }, [status])

  return null
}
