import { Link } from '@tanstack/react-router'
import { ClockIcon } from 'lucide-react'
import { formatDateTime, formatElapsed } from '@/lib/format'
import type { TicketListItem } from '../domain/types'
import { ticketMessages } from '../i18n'
import { PendingSyncBadge } from './pending-sync-badge'
import { PossibleDuplicateBadge } from './possible-duplicate-badge'
import { StatusBadge } from './status-badge'
import { TicketCardHeading } from './ticket-card-heading'
import { UnroutedBadge } from './unrouted-badge'

function TicketMeta({
  ticket,
  showElapsed,
}: {
  ticket: TicketListItem
  showElapsed: boolean
}) {
  const place = [ticket.buildingName, ticket.locationName].filter(Boolean)
  const context = [ticket.categoryName, ticket.requesterName].filter(Boolean)

  return (
    <div className="flex flex-col gap-1 text-xs text-muted-foreground lg:flex-row lg:items-center lg:justify-between lg:gap-2">
      <p className="lg:truncate">
        {place.length > 0 ? (
          <span className="block wrap-break-word font-medium text-foreground lg:inline lg:font-normal lg:text-inherit">
            {place.join(' · ')}
          </span>
        ) : null}
        {place.length > 0 && context.length > 0 ? (
          <span className="hidden lg:inline">{' · '}</span>
        ) : null}
        {context.length > 0 ? (
          <span className="block truncate lg:inline">
            {context.join(' · ')}
          </span>
        ) : null}
      </p>
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 lg:shrink-0 lg:flex-nowrap">
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
  offlineReady,
}: {
  ticket: TicketListItem
  showElapsed: boolean
  offlineReady: boolean
}) {
  return (
    <Link
      to="/tickets/$ticketId"
      params={{ ticketId: ticket.id }}
      className="flex flex-col gap-2 p-4 transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
    >
      <TicketCardHeading
        folio={ticket.folio}
        description={ticket.description}
        offlineReady={offlineReady}
      />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <StatusBadge status={ticket.status} />
        {ticket.pendingSync ? <PendingSyncBadge /> : null}
        <p className="truncate text-xs text-muted-foreground">
          {ticket.technicianName ?? ticketMessages.list.unassignedTechnician}
        </p>
      </div>
      <TicketMeta ticket={ticket} showElapsed={showElapsed} />
    </Link>
  )
}

/** Lista de tiquets con enlace al detalle. */
export function TicketList({
  items,
  showElapsed = false,
  offlineReadyIds,
}: {
  items: TicketListItem[]
  showElapsed?: boolean
  offlineReadyIds?: ReadonlySet<string>
}) {
  return (
    <ul className="flex flex-col divide-y overflow-hidden rounded-xl border bg-card">
      {items.map((ticket) => (
        <li key={ticket.id}>
          <TicketCard
            ticket={ticket}
            showElapsed={showElapsed}
            offlineReady={offlineReadyIds?.has(ticket.id) ?? false}
          />
        </li>
      ))}
    </ul>
  )
}
