import { Link } from '@tanstack/react-router'
import { ClockIcon, InboxIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatElapsed } from '@/lib/format'
import { groupTicketsByStatus } from '../domain/board'
import type { TicketListItem } from '../domain/types'
import { statusLabels, ticketMessages } from '../i18n'
import { PendingSyncBadge } from './pending-sync-badge'
import { PossibleDuplicateBadge } from './possible-duplicate-badge'
import { PriorityBadge } from './priority-badge'
import { UnroutedBadge } from './unrouted-badge'

const board = ticketMessages.board

interface TicketBoardProps {
  items: TicketListItem[]
  offeredIds?: ReadonlySet<string>
  emptyColumnLabel?: string
}

/** Tablero de solo lectura: columnas por estado activo y tarjetas que abren el detalle. */
export function TicketBoard({
  items,
  offeredIds,
  emptyColumnLabel = board.emptyColumn,
}: TicketBoardProps) {
  const columns = groupTicketsByStatus(items)

  return (
    <div className="flex snap-x gap-3 overflow-x-auto pb-2">
      {columns.map((column) => (
        <section
          key={column.status}
          aria-labelledby={`board-${column.status}`}
          className="flex w-[80vw] max-w-72 shrink-0 snap-start flex-col gap-2 rounded-xl border bg-muted/20 p-2"
        >
          <h2
            id={`board-${column.status}`}
            className="flex items-center justify-between gap-2 px-1 text-sm font-medium"
          >
            {statusLabels[column.status]}
            <span className="rounded-full bg-background px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
              {column.items.length}
            </span>
          </h2>
          {column.items.length === 0 ? (
            <p className="px-1 py-6 text-center text-xs text-muted-foreground">
              {emptyColumnLabel}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {column.items.map((ticket) => (
                <li key={ticket.id}>
                  <TicketBoardCard
                    ticket={ticket}
                    offered={offeredIds?.has(ticket.id) ?? false}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  )
}

function TicketBoardCard({
  ticket,
  offered,
}: {
  ticket: TicketListItem
  offered: boolean
}) {
  const place = [ticket.buildingName, ticket.categoryName]
    .filter(Boolean)
    .join(' · ')

  return (
    <Link
      to="/tickets/$ticketId"
      params={{ ticketId: ticket.id }}
      className="flex flex-col gap-2 rounded-lg border bg-card p-3 text-sm shadow-xs transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium">{ticket.folio}</span>
        <PriorityBadge
          name={ticket.priorityName}
          position={ticket.priorityPosition}
        />
      </div>
      <p className="line-clamp-2 text-muted-foreground">{ticket.description}</p>
      <p className="truncate text-xs text-muted-foreground">{place || '—'}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {offered ? (
          <Badge
            variant="secondary"
            className="gap-1 bg-info/10 text-info dark:bg-info/20"
          >
            <InboxIcon aria-hidden />
            {board.offer}
          </Badge>
        ) : null}
        {ticket.pendingSync ? <PendingSyncBadge /> : null}
        {ticket.possibleDuplicate ? <PossibleDuplicateBadge /> : null}
        {ticket.isUnrouted ? <UnroutedBadge /> : null}
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="truncate">{ticket.requesterName}</span>
        <span
          className="inline-flex shrink-0 items-center gap-1"
          title={ticketMessages.list.elapsed}
        >
          <ClockIcon className="size-3" aria-hidden />
          {formatElapsed(ticket.reportedAt)}
        </span>
      </div>
    </Link>
  )
}
