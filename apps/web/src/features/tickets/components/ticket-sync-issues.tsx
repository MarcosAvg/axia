import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth'
import { db } from '@/lib/offline/db'
import type { OutboxItem } from '@/lib/offline/db'
import {
  discardOutboxItem,
  processOutbox,
  retryOutboxItem,
} from '@/lib/offline/outbox'
import type { TicketStatus } from '../domain/types'
import { statusLabels, ticketMessages } from '../i18n'
import { isTimeError, OutboxTimeCorrection } from './outbox-time-correction'

function TicketSyncIssue({
  item,
  waiting,
}: {
  item: OutboxItem
  waiting: number
}) {
  const timeError = isTimeError(item)
  const payload = item.payload as {
    operation?: keyof typeof ticketMessages.actions
  } | null
  const label = payload?.operation
    ? ticketMessages.actions[payload.operation]
    : undefined
  const status = item.lastServerState
    ? statusLabels[item.lastServerState as TicketStatus]
    : undefined
  return (
    <li className="space-y-2 rounded-md border p-3 text-sm">
      <p className="font-medium">
        {label ??
          (item.type === 'evidence_upload'
            ? 'Subir evidencia'
            : 'Acción pendiente')}
      </p>
      <p className="text-destructive">{item.lastError}</p>
      {status ? <p>Estado al intentar sincronizar: {status}.</p> : null}
      {waiting > 0 ? (
        <p>Operaciones posteriores en espera: {waiting}.</p>
      ) : null}
      {timeError ? <OutboxTimeCorrection item={item} /> : null}
      <IssueButtons item={item} timeError={timeError} />
    </li>
  )
}

function IssueButtons({
  item,
  timeError,
}: {
  item: OutboxItem
  timeError: boolean
}) {
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  return (
    <>
      {confirmDiscard ? (
        <div className="space-y-2">
          <p>
            Se quitará esta operación del dispositivo. Revisa las operaciones
            posteriores antes de continuar.
          </p>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => void discardOutboxItem(item.id)}
          >
            Confirmar descarte
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setConfirmDiscard(false)}
          >
            Volver
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {!timeError ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void retryOutboxItem(item.id).then(processOutbox)}
            >
              Reintentar
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setConfirmDiscard(true)}
          >
            Descartar…
          </Button>
        </div>
      )}
    </>
  )
}

export function TicketSyncIssues({ ticketId }: { ticketId: string }) {
  const { session } = useAuth()
  const userId = session?.user.id
  const items = useLiveQuery(
    async () => {
      if (!userId) return []
      return (await db.outbox.toArray()).filter(
        (item) => item.userId === userId && item.orderingKey === ticketId,
      )
    },
    [ticketId, userId],
    [],
  )
  const failed = items.filter((item) => item.state === 'error')
  if (failed.length === 0) return null
  return (
    <ul aria-label="Problemas de sincronización" className="mb-3 space-y-2">
      {failed.map((item) => (
        <TicketSyncIssue
          key={item.id}
          item={item}
          waiting={items.filter((other) => other.seq > item.seq).length}
        />
      ))}
    </ul>
  )
}
