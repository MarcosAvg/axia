import { Link, useNavigate } from '@tanstack/react-router'
import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn } from '@/components/shared/data-table'
import { ToneDot } from '@/components/shared/tone'
import { formatDateTime, formatElapsed } from '@/lib/format'
import { toneForId } from '@/lib/tones'
import type { TicketListItem } from '../domain/types'
import { ticketMessages } from '../i18n'
import { PendingSyncBadge } from './pending-sync-badge'
import { PriorityBadge } from './priority-badge'
import { PossibleDuplicateBadge } from './possible-duplicate-badge'
import { StatusBadge } from './status-badge'
import { UnroutedBadge } from './unrouted-badge'

const { columns } = ticketMessages.list
const placeholder = '—'

const DEFS: DataTableColumn<TicketListItem>[] = [
  {
    id: 'folio',
    header: columns.folio,
    className: 'font-medium',
    cell: (ticket) => (
      <Link
        to="/tickets/$ticketId"
        params={{ ticketId: ticket.id }}
        className="text-primary hover:underline"
        onClick={(event) => event.stopPropagation()}
      >
        {ticket.folio}
      </Link>
    ),
  },
  {
    id: 'description',
    header: columns.description,
    cell: (ticket) => (
      <span className="flex max-w-64 flex-col">
        <span className="truncate">{ticket.description}</span>
        <span className="truncate text-xs text-muted-foreground">
          {ticket.categoryName ?? placeholder}
        </span>
      </span>
    ),
  },
  {
    id: 'status',
    header: columns.status,
    cell: (ticket) => (
      <div className="flex items-center gap-2">
        <StatusBadge status={ticket.status} />
        {ticket.pendingSync ? <PendingSyncBadge /> : null}
        {ticket.possibleDuplicate ? <PossibleDuplicateBadge /> : null}
        {ticket.isUnrouted ? <UnroutedBadge /> : null}
      </div>
    ),
  },
  {
    id: 'priority',
    header: columns.priority,
    hideBelow: 'lg',
    cell: (ticket) => (
      <PriorityBadge
        name={ticket.priorityName}
        position={ticket.priorityPosition}
      />
    ),
  },
  {
    id: 'location',
    header: columns.location,
    hideBelow: 'lg',
    cell: (ticket) => (
      <span className="flex flex-col">
        <span className="inline-flex items-center gap-2">
          {ticket.buildingName ? (
            <ToneDot tone={toneForId(ticket.buildingName)} />
          ) : null}
          {ticket.buildingName ?? placeholder}
        </span>
        <span className="text-xs text-muted-foreground">
          {ticket.locationName ?? placeholder}
        </span>
      </span>
    ),
  },
  {
    id: 'requester',
    header: columns.requester,
    hideBelow: 'xl',
    cell: (ticket) => ticket.requesterName,
  },
  {
    id: 'technician',
    header: columns.technician,
    hideBelow: 'xl',
    cell: (ticket) =>
      ticket.technicianName ?? (
        <span className="text-muted-foreground">
          {ticketMessages.list.unassignedTechnician}
        </span>
      ),
  },
  {
    id: 'team',
    header: columns.team,
    hideBelow: '2xl',
    cell: (ticket) =>
      ticket.teamName ? (
        <span className="inline-flex items-center gap-2">
          <ToneDot tone={toneForId(ticket.teamName)} />
          {ticket.teamName}
        </span>
      ) : (
        placeholder
      ),
  },
  {
    id: 'elapsed',
    header: ticketMessages.list.elapsed,
    hideBelow: 'md',
    className: 'tabular-nums',
    cell: (ticket) => formatElapsed(ticket.reportedAt),
  },
  {
    id: 'reported',
    header: columns.reported,
    hideBelow: 'xl',
    cell: (ticket) => formatDateTime(ticket.reportedAt),
  },
]

/** Tabla de tiquets para escritorio. */
export function TicketTable({ items }: { items: TicketListItem[] }) {
  const navigate = useNavigate()

  return (
    <DataTable
      columns={DEFS}
      rows={items}
      getRowId={(ticket) => ticket.id}
      onRowClick={(ticket) => {
        void navigate({
          to: '/tickets/$ticketId',
          params: { ticketId: ticket.id },
        })
      }}
    />
  )
}
