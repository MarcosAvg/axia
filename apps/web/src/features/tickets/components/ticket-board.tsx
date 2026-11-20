import { Link } from '@tanstack/react-router'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  InboxIcon,
} from 'lucide-react'
import { useId, useRef } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatElapsed } from '@/lib/format'
import { groupTicketsByStatus } from '../domain/board'
import type { BoardColumn } from '../domain/board'
import type { TicketListItem } from '../domain/types'
import { ticketMessages } from '../i18n'
import { PendingSyncBadge } from './pending-sync-badge'
import { PossibleDuplicateBadge } from './possible-duplicate-badge'
import { PriorityBadge } from './priority-badge'
import { StatusBadge } from './status-badge'
import { TicketCardHeading } from './ticket-card-heading'
import { UnroutedBadge } from './unrouted-badge'

const board = ticketMessages.board

interface TicketBoardProps {
  items: TicketListItem[]
  offeredIds?: ReadonlySet<string>
  emptyColumnLabel?: string
}

function BoardScrollControls({
  viewportId,
  onScroll,
}: {
  viewportId: string
  onScroll: (direction: -1 | 1) => void
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-xs text-muted-foreground lg:hidden">
        {board.scrollHint}
      </p>
      <div className="ml-auto flex shrink-0 gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11 lg:size-9"
          aria-label={board.previousColumns}
          aria-controls={viewportId}
          onClick={() => onScroll(-1)}
        >
          <ChevronLeftIcon aria-hidden />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11 lg:size-9"
          aria-label={board.nextColumns}
          aria-controls={viewportId}
          onClick={() => onScroll(1)}
        >
          <ChevronRightIcon aria-hidden />
        </Button>
      </div>
    </div>
  )
}

/** Tablero de solo lectura: columnas por estado activo y tarjetas que abren el detalle. */
export function TicketBoard({
  items,
  offeredIds,
  emptyColumnLabel = board.emptyColumn,
}: TicketBoardProps) {
  const columns = groupTicketsByStatus(items)
  const viewport = useRef<HTMLDivElement>(null)
  const viewportId = useId()

  function scrollColumns(direction: -1 | 1) {
    const node = viewport.current
    if (node) node.scrollBy({ left: direction * node.clientWidth })
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <BoardScrollControls viewportId={viewportId} onScroll={scrollColumns} />
      <div
        ref={viewport}
        id={viewportId}
        role="region"
        aria-label={board.columnsLabel}
        className="flex min-w-0 snap-x items-start gap-3 overflow-x-auto overscroll-x-contain scroll-smooth rounded-xl pb-2 motion-reduce:scroll-auto"
      >
        {columns.map((column) => (
          <TicketBoardColumn
            key={column.status}
            column={column}
            offeredIds={offeredIds}
            emptyLabel={emptyColumnLabel}
          />
        ))}
      </div>
    </div>
  )
}

function TicketBoardColumn({
  column,
  offeredIds,
  emptyLabel,
}: {
  column: BoardColumn
  offeredIds?: ReadonlySet<string>
  emptyLabel: string
}) {
  const headingId = useId()
  return (
    <section
      aria-labelledby={headingId}
      className="flex w-[80vw] max-w-72 shrink-0 snap-start flex-col rounded-xl border bg-muted/40"
    >
      <h2
        id={headingId}
        className="flex items-center justify-between gap-2 border-b px-3 py-2.5"
      >
        <StatusBadge status={column.status} />
        <span className="text-xs font-medium tabular-nums text-muted-foreground">
          {column.items.length}
        </span>
      </h2>
      {column.items.length === 0 ? (
        <p className="px-1 py-6 text-center text-xs text-muted-foreground">
          {emptyLabel}
        </p>
      ) : (
        <ul className="flex flex-col gap-2 p-2">
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
  )
}

function TicketBoardCard({
  ticket,
  offered,
}: {
  ticket: TicketListItem
  offered: boolean
}) {
  const place = [ticket.buildingName, ticket.locationName].filter(Boolean)
  const context = [ticket.categoryName, ticket.requesterName].filter(Boolean)

  return (
    <Link
      to="/tickets/$ticketId"
      params={{ ticketId: ticket.id }}
      className="flex flex-col gap-2 rounded-lg border bg-card p-3 text-sm transition-colors hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
    >
      <TicketCardHeading
        folio={ticket.folio}
        description={ticket.description}
      />
      <div className="flex flex-wrap items-center gap-1.5">
        <PriorityBadge
          name={ticket.priorityName}
          position={ticket.priorityPosition}
        />
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
      <p className="wrap-break-word text-xs font-medium">
        {place.join(' · ') || '—'}
      </p>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="truncate">{context.join(' · ')}</span>
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
