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

/** Acciones guardadas en el dispositivo que aún no llegan al servidor. */
export function PendingActions({
  actions,
}: {
  actions: PendingTicketAction[]
}) {
  if (actions.length === 0) return null
  return (
    <section
      role="status"
      aria-live="polite"
      className="rounded-xl border border-warning/50 bg-warning/5 p-3"
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <CloudOffIcon className="size-4 text-warning-foreground dark:text-warning" />
        {ticketMessages.pending.title}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {ticketMessages.pending.help}
      </p>
      <ul className="mt-2 flex flex-col gap-1 text-sm">
        {actions.map((action) => (
          <li
            key={action.id}
            data-pending-action={action.operation}
            className="flex flex-wrap items-center justify-between gap-x-3"
          >
            <span>{operationLabel(action)}</span>
            <span className="text-xs text-muted-foreground">
              {formatDateTime(action.occurredAt)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
