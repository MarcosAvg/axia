import type { TicketListItem } from '../domain/types'
import { TICKET_STATUSES } from '../domain/types'
import { statusLabels } from '../i18n'

/** Conteo de tiquets por estado, para encabezar una bandeja. */
export function TicketStatusSummary({ items }: { items: TicketListItem[] }) {
  const counts = TICKET_STATUSES.map((status) => ({
    status,
    count: items.filter((item) => item.status === status).length,
  })).filter((entry) => entry.count > 0)

  if (counts.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {counts.map(({ status, count }) => (
        <span
          key={status}
          className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs"
        >
          <span className="text-muted-foreground">{statusLabels[status]}</span>
          <span className="font-medium">{count}</span>
        </span>
      ))}
    </div>
  )
}
