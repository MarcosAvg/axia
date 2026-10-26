import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AlertTriangleIcon, CloudOffIcon, RefreshCwIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useAuth } from '@/features/auth'
import type { OutboxItem } from '@/lib/offline/db'
import {
  discardOutboxItem,
  errorsForCurrentUser,
  pendingForCurrentUser,
  processOutbox,
  retryOutboxItem,
} from '@/lib/offline/outbox'
import { messages } from '@/lib/i18n'

function itemLabel(type: string): string {
  if (type === 'evidence_upload') return messages.offline.evidence
  if (type === 'ticket_action') return messages.offline.action
  return type
}

function OutboxErrorItem({ item }: { item: OutboxItem }) {
  return (
    <li className="space-y-1 rounded-md border p-2 text-sm">
      <p className="font-medium">{itemLabel(item.type)}</p>
      <p className="break-words text-xs text-destructive">{item.lastError}</p>
      <div className="flex justify-end gap-1">
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() =>
            void retryOutboxItem(item.id).then(() => processOutbox())
          }
        >
          {messages.offline.retry}
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="xs"
          onClick={() => void discardOutboxItem(item.id)}
        >
          {messages.offline.discard}
        </Button>
      </div>
    </li>
  )
}

function OutboxErrors({ items }: { items: OutboxItem[] }) {
  const label = messages.offline.failed(items.length)
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="warning"
          size="sm"
          className="h-8 gap-1 px-2"
          aria-label={label}
        >
          <AlertTriangleIcon />
          <span className="hidden sm:inline">{label}</span>
          <span className="tabular-nums sm:hidden">{items.length}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{messages.offline.failedTitle}</DialogTitle>
          <DialogDescription>
            {messages.offline.failedDescription}
          </DialogDescription>
        </DialogHeader>
        <ul className="max-h-80 space-y-2 overflow-y-auto">
          {items.map((item) => (
            <OutboxErrorItem key={item.id} item={item} />
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}

/** Aviso de "sin conexión", de elementos pendientes y de errores definitivos. */
export function OfflineIndicator() {
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  )
  const { session } = useAuth()
  const userId = session?.user.id
  const pending = useLiveQuery(() => pendingForCurrentUser(), [userId], 0)
  const failed = useLiveQuery(() => errorsForCurrentUser(), [userId], [])

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

  if (failed.length > 0) return <OutboxErrors items={failed} />
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
