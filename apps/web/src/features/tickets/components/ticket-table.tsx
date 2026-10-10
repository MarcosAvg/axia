import { Link, useNavigate } from '@tanstack/react-router'
import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn } from '@/components/shared/data-table'
import { ToneDot } from '@/components/shared/tone'
import { formatDateTime } from '@/lib/format'
import { toneForId } from '@/lib/tones'
import type { TicketListItem } from '../domain/types'
import { ticketMessages } from '../i18n'
import { PriorityBadge } from './priority-badge'
import { StatusBadge } from './status-badge'

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
      <span className="block max-w-56 truncate">{ticket.description}</span>
    ),
  },
  {
    id: 'status',
    header: columns.status,
    cell: (ticket) => (
      <div className="flex items-center gap-2">
        <StatusBadge status={ticket.status} />
        {ticket.possibleDuplicate ? (
          <span className="text-xs text-warning">
            {ticketMessages.list.duplicateMark}
          </span>
        ) : null}
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
    id: 'building',
    header: columns.building,
    hideBelow: 'lg',
    cell: (ticket) =>
      ticket.buildingName ? (
        <span className="inline-flex items-center gap-2">
          <ToneDot tone={toneForId(ticket.buildingName)} />
          {ticket.buildingName}
        </span>
      ) : (
        placeholder
      ),
  },
  {
    id: 'team',
    header: columns.team,
    hideBelow: 'lg',
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
    id: 'reported',
    header: columns.reported,
    hideBelow: 'md',
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
