import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { CloudOffIcon, RefreshCwIcon } from 'lucide-react'
import { useAuth } from '@/features/auth'
import { pendingForCurrentUser } from '@/lib/offline/outbox'
import { messages } from '@/lib/i18n'

/** Aviso de "sin conexión" y de elementos pendientes de sincronizar. */
export function OfflineIndicator() {
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  )
  const { session } = useAuth()
  const userId = session?.user.id
  const pending = useLiveQuery(() => pendingForCurrentUser(), [userId], 0)

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

  const label = online
    ? messages.offline.pending(pending)
    : messages.offline.disconnected

  return (
    <span
      role="status"
      aria-label={label}
      className="inline-flex items-center gap-1 text-xs text-warning-foreground dark:text-warning"
    >
      {online ? (
        <RefreshCwIcon className="size-3.5 shrink-0" aria-hidden />
      ) : (
        <CloudOffIcon className="size-3.5 shrink-0" aria-hidden />
      )}
      <span className="hidden sm:inline">{label}</span>
      {online ? (
        <span className="tabular-nums sm:hidden">{pending}</span>
      ) : null}
    </span>
  )
}
