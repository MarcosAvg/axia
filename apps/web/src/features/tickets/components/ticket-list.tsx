import { Link } from '@tanstack/react-router'
import { ClockIcon } from 'lucide-react'
import { formatDateTime, formatElapsed } from '@/lib/format'
import type { TicketListItem } from '../domain/types'
import { ticketMessages } from '../i18n'
import { StatusBadge } from './status-badge'

/** Lista de tiquets con enlace al detalle. */
export function TicketList({
  items,
  showElapsed = false,
}: {
  items: TicketListItem[]
  showElapsed?: boolean
}) {
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
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <p className="truncate">
                {[
                  ticket.buildingName,
                  ticket.categoryName,
                  ticket.requesterName,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              <span className="flex shrink-0 items-center gap-2">
                <span>{formatDateTime(ticket.reportedAt)}</span>
                {showElapsed ? (
                  <span
                    data-elapsed
                    className="inline-flex items-center gap-1"
                    title={ticketMessages.list.elapsed}
                  >
                    <ClockIcon className="size-3" aria-hidden />
                    {formatElapsed(ticket.reportedAt)}
                  </span>
                ) : null}
                {ticket.possibleDuplicate ? (
                  <span className="font-medium text-amber-700 dark:text-amber-400">
                    {ticketMessages.list.duplicateMark}
                  </span>
                ) : null}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
