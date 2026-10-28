import { UsersIcon } from 'lucide-react'
import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import type { TechnicianRow } from '../domain/indicators'
import { formatMinutes } from '../domain/metrics'
import { metricsMessages } from '../i18n'
import { BarCell } from './bar-cell'

const t = metricsMessages.technicians
const hints = metricsMessages.tableHints

function columns(maxParticipation: number): DataTableColumn<TechnicianRow>[] {
  return [
    { id: 'technician', header: t.technician, cell: (row) => row.name },
    { id: 'tickets', header: t.tickets, cell: (row) => row.tickets },
    {
      id: 'leader',
      header: t.leader,
      hint: hints.leader,
      cell: (row) => row.leaderCount,
      hideBelow: 'md',
    },
    {
      id: 'auxiliary',
      header: t.auxiliary,
      hint: hints.auxiliary,
      cell: (row) => row.auxiliaryCount,
      hideBelow: 'md',
    },
    {
      id: 'participation',
      header: t.participation,
      hint: hints.participation,
      cell: (row) => (
        <BarCell
          value={row.participationMinutes}
          max={maxParticipation}
          label={formatMinutes(row.participationMinutes)}
          className="min-w-44"
        />
      ),
    },
    {
      id: 'extra',
      header: t.extra,
      hint: hints.extra,
      cell: (row) => formatMinutes(row.participationExtraMinutes),
      hideBelow: 'lg',
    },
    {
      id: 'assigned',
      header: t.assigned,
      hint: hints.assigned,
      cell: (row) => row.assignedCount,
      hideBelow: 'md',
    },
  ]
}

/** Carga y participación por técnico. */
export function TechnicianTable({ rows }: { rows: TechnicianRow[] }) {
  if (rows.length === 0) {
    return <EmptyState icon={UsersIcon} title={metricsMessages.empty} />
  }
  const maxParticipation = Math.max(
    1,
    ...rows.map((row) => row.participationMinutes),
  )
  return (
    <DataTable
      columns={columns(maxParticipation)}
      rows={rows}
      getRowId={(row) => row.technicianId}
    />
  )
}
