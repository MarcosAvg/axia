import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ClockIcon } from 'lucide-react'
import { formatDateTime, formatElapsed } from '@/lib/format'
import type { TicketListItem } from '../domain/types'
import { ticketMessages } from '../i18n'
import { PendingSyncBadge } from './pending-sync-badge'
import { PossibleDuplicateBadge } from './possible-duplicate-badge'
import { StatusBadge } from './status-badge'
import { UnroutedBadge } from './unrouted-badge'

function TicketMeta({
  ticket,
  showElapsed,
}: {
  ticket: TicketListItem
  showElapsed: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
      <p className="truncate">
        {[
          ticket.buildingName,
          ticket.locationName,
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
        {ticket.possibleDuplicate ? <PossibleDuplicateBadge /> : null}
        {ticket.isUnrouted ? <UnroutedBadge /> : null}
      </span>
    </div>
  )
}

function TicketCard({
  ticket,
  showElapsed,
  action,
}: {
  ticket: TicketListItem
  showElapsed: boolean
  action?: (ticket: TicketListItem) => ReactNode
}) {
  return (
    <div className="flex flex-col">
      <Link
        to="/tickets/$ticketId"
        params={{ ticketId: ticket.id }}
        className="flex flex-col gap-1 p-4 hover:bg-muted/50"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium">{ticket.folio}</span>
          <span className="flex items-center gap-1.5">
            <StatusBadge status={ticket.status} />
            {ticket.pendingSync ? <PendingSyncBadge /> : null}
          </span>
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {ticket.description}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {ticket.technicianName ?? ticketMessages.list.unassignedTechnician}
        </p>
        <TicketMeta ticket={ticket} showElapsed={showElapsed} />
      </Link>
      {action ? (
        <div className="flex justify-end border-t px-4 py-2">
          {action(ticket)}
        </div>
      ) : null}
    </div>
  )
}

/** Lista de tiquets con enlace al detalle. */
export function TicketList({
  items,
  showElapsed = false,
  action,
}: {
  items: TicketListItem[]
  showElapsed?: boolean
  action?: (ticket: TicketListItem) => ReactNode
}) {
  return (
    <ul className="flex flex-col divide-y overflow-hidden rounded-xl border bg-card">
      {items.map((ticket) => (
        <li key={ticket.id}>
          <TicketCard
            ticket={ticket}
            showElapsed={showElapsed}
            action={action}
          />
        </li>
      ))}
    </ul>
  )
}
