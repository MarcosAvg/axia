import { CloudOffIcon } from 'lucide-react'
import { formatDateTime } from '@/lib/format'
import type { ActionKey } from '../domain/actions'
import type { PendingTicketAction } from '../domain/pending-actions'
import { ticketMessages } from '../i18n'

function operationLabel(action: PendingTicketAction): string {
  const { operation } = action
  if (operation === 'rate') return ticketMessages.rating.open
  if (operation === 'take') return ticketMessages.detail.takeOffer
  if (operation === 'validate') {
    if (action.args.role === 'requester') {
      return ticketMessages.actions.validate_requester
    }
    if (action.args.role === 'supervisor') {
      return ticketMessages.actions.validate_supervisor
    }
    return ticketMessages.pending.validate
  }
  return ticketMessages.actions[operation as ActionKey] ?? operation
}

function syncLabel(action: PendingTicketAction): string {
  if (action.syncStatus === 'confirmed') return 'Aplicado · Actualizando vista'
  if (action.sending) return 'Enviando'
  if (action.syncStatus === 'retry') return 'En espera de reintento'
  return 'Guardado en este dispositivo'
}

/** Acciones guardadas en el dispositivo mientras se sincroniza la vista. */
export function PendingActions({
  actions,
}: {
  actions: PendingTicketAction[]
}) {
  if (actions.length === 0) return null
  const allConfirmed = actions.every(
    (action) => action.syncStatus === 'confirmed',
  )
  return (
    <section
      role="status"
      aria-live="polite"
      className="rounded-xl border border-warning/50 bg-warning/5 p-3"
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <CloudOffIcon className="size-4 text-warning-foreground dark:text-warning" />
        {allConfirmed ? 'Actualizando el tiquet' : ticketMessages.pending.title}
      </div>
      {!allConfirmed ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {ticketMessages.pending.help}
        </p>
      ) : null}
      <ul className="mt-2 flex flex-col gap-1 text-sm">
        {actions.map((action) => (
          <li
            key={action.id}
            data-pending-action={action.operation}
            className="flex flex-wrap items-center justify-between gap-x-3"
          >
            <span>{operationLabel(action)}</span>
            <span className="text-xs text-muted-foreground">
              {formatDateTime(action.occurredAt)} ·{' '}
              <span>{syncLabel(action)}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
