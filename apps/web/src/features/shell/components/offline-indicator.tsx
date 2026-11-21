import { Link } from '@tanstack/react-router'
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
import { OutboxTimeCorrection, isTimeError } from '@/features/tickets'
import type { OutboxItem } from '@/lib/offline/db'
import {
  discardOutboxItem,
  errorsForCurrentUser,
  pendingForCurrentUser,
  processOutbox,
  retryOutboxItem,
} from '@/lib/offline/outbox'
import { messages } from '@/lib/i18n'
import { useOnline } from '@/lib/use-online'

function itemLabel(type: string): string {
  if (type === 'evidence_upload') return messages.offline.evidence
  if (type === 'ticket_action') return messages.offline.action
  return type
}

function OutboxErrorItem({ item }: { item: OutboxItem }) {
  const timeError = isTimeError(item)
  if (item.orderingKey) {
    return (
      <li className="space-y-1 rounded-md border p-2 text-sm">
        <p className="font-medium">{itemLabel(item.type)}</p>
        <p className="break-words text-xs text-destructive">{item.lastError}</p>
        <Link
          className="underline"
          to="/tickets/$ticketId"
          params={{ ticketId: item.orderingKey }}
        >
          Revisar en el tiquet
        </Link>
      </li>
    )
  }
  return (
    <li className="space-y-1 rounded-md border p-2 text-sm">
      <p className="font-medium">{itemLabel(item.type)}</p>
      <p className="break-words text-xs text-destructive">{item.lastError}</p>
      {timeError ? <OutboxTimeCorrection item={item} /> : null}
      <div className="flex justify-end gap-1">
        {timeError ? null : (
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
        )}
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
          className="h-11 gap-1 px-2 lg:h-8"
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

function OfflineStatus({
  online,
  pending,
  isOfflineSession,
  onSync,
}: {
  online: boolean
  pending: number
  isOfflineSession: boolean
  onSync: () => void
}) {
  const offline = !online || isOfflineSession
  const label = online
    ? pending > 0
      ? messages.offline.pending(pending)
      : messages.offline.session
    : messages.offline.disconnected
  const className =
    'inline-flex min-h-11 items-center gap-1 text-xs text-warning-foreground dark:text-warning'
  const content = (
    <>
      {offline ? (
        <CloudOffIcon className="size-3.5 shrink-0" aria-hidden />
      ) : (
        <RefreshCwIcon className="size-3.5 shrink-0" aria-hidden />
      )}
      <span className="hidden sm:inline">{label}</span>
      {offline ? null : (
        <span className="tabular-nums sm:hidden">{pending}</span>
      )}
    </>
  )

  if (online && pending > 0) {
    return (
      <button
        type="button"
        onClick={onSync}
        aria-label={`${messages.offline.syncNow}: ${label}`}
        className={className}
      >
        {content}
      </button>
    )
  }

  return (
    <span role="status" aria-label={label} className={className}>
      {content}
    </span>
  )
}

/** Aviso de "sin conexión", de elementos pendientes y de errores definitivos. */
export function OfflineIndicator() {
  const online = useOnline()
  const { session, isOfflineSession } = useAuth()
  const userId = session?.user.id
  const pending = useLiveQuery(() => pendingForCurrentUser(), [userId], 0)
  const failed = useLiveQuery(() => errorsForCurrentUser(), [userId], [])

  const showStatus = !online || pending > 0 || isOfflineSession
  if (!showStatus && failed.length === 0) return null

  return (
    <div className="flex items-center gap-2">
      {failed.length > 0 ? <OutboxErrors items={failed} /> : null}
      {showStatus ? (
        <OfflineStatus
          online={online}
          pending={pending}
          isOfflineSession={isOfflineSession}
          onSync={() => void processOutbox()}
        />
      ) : null}
    </div>
  )
}
