import { Link } from '@tanstack/react-router'
import { formatDateTime } from '@/lib/format'
import type { TicketListItem } from '../domain/types'
import { ticketMessages } from '../i18n'
import { StatusBadge } from './status-badge'

/** Lista de tiquets con enlace al detalle. */
export function TicketList({ items }: { items: TicketListItem[] }) {
  return (
    <ul className="flex flex-col divide-y overflow-hidden rounded-xl ring-1 ring-foreground/10">
      {items.map((ticket) => (
        <li key={ticket.id}>
          <Link
            to="/tickets/$ticketId"
            params={{ ticketId: ticket.id }}
            className="flex flex-col gap-1 p-4 hover:bg-muted/50"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{ticket.folio}</span>
              <StatusBadge status={ticket.status} />
            </div>
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {ticket.description}
            </p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {ticket.buildingName ? <span>{ticket.buildingName}</span> : null}
              {ticket.categoryName ? <span>{ticket.categoryName}</span> : null}
              <span>{ticket.requesterName}</span>
              <span>{formatDateTime(ticket.reportedAt)}</span>
              {ticket.possibleDuplicate ? (
                <span className="font-medium text-amber-700 dark:text-amber-400">
                  {ticketMessages.list.duplicateMark}
                </span>
              ) : null}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
