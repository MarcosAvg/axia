import type { TicketListItem } from '../domain/types'
import { TICKET_STATUSES } from '../domain/types'
import { StatusBadge } from './status-badge'

/** Conteo de tiquets por estado, para encabezar una bandeja. */
export function TicketStatusSummary({ items }: { items: TicketListItem[] }) {
  const counts = TICKET_STATUSES.map((status) => ({
    status,
    count: items.filter((item) => item.status === status).length,
  })).filter((entry) => entry.count > 0)

  if (counts.length === 0) return null

  return (
    <ul className="flex flex-wrap gap-2">
      {counts.map(({ status, count }) => (
        <li key={status}>
          <StatusBadge status={status} count={count} />
        </li>
      ))}
    </ul>
  )
}
