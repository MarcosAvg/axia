import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/offline/db'
import { messages } from '@/lib/i18n'

/** Aviso de "sin conexión" y de elementos pendientes de sincronizar. */
export function OfflineIndicator() {
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  )
  const pending = useLiveQuery(() => db.outbox.count(), [], 0)

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  if (online && pending === 0) return null

  return (
    <span
      role="status"
      className="text-xs text-warning-foreground dark:text-warning"
    >
      {online
        ? messages.offline.pending(pending)
        : messages.offline.disconnected}
    </span>
  )
}
