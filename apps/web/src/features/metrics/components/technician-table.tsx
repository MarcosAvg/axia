import { UsersIcon } from 'lucide-react'
import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import type { TechnicianRow } from '../domain/indicators'
import { formatMinutes } from '../domain/metrics'
import { technicianParticipation } from '../domain/team'
import type { TimeMode } from '../domain/time-mode'
import { metricsMessages } from '../i18n'
import { BarCell } from './bar-cell'
import { MetricCount } from './metric-count'

const t = metricsMessages.technicians
const hints = metricsMessages.tableHints

function loadColumns(): DataTableColumn<TechnicianRow>[] {
  return [
    { id: 'technician', header: t.technician, cell: (row) => row.name },
    {
      id: 'tickets',
      header: t.tickets,
      cell: (row) => (
        <MetricCount
          title={`${metricsMessages.drillDown.label} · ${row.name}`}
          filters={{ participantTechnicianId: row.technicianId }}
          disabled={row.tickets === 0}
        >
          {row.tickets}
        </MetricCount>
      ),
    },
  ]
}

function columns(
  maxParticipation: number,
  mode: TimeMode,
): DataTableColumn<TechnicianRow>[] {
  return [
    ...loadColumns(),
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
      cell: (row) => {
        const value = technicianParticipation(row, mode)
        return (
          <BarCell
            value={value}
            max={maxParticipation}
            label={formatMinutes(value)}
            className="min-w-44"
          />
        )
      },
    },
    ...(mode === 'extra'
      ? []
      : [
          {
            id: 'extra',
            header: t.extra,
            hint: hints.extra,
            cell: (row: TechnicianRow) =>
              formatMinutes(row.participationExtraMinutes),
            hideBelow: 'lg' as const,
          },
        ]),
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
export function TechnicianTable({
  rows,
  mode,
}: {
  rows: TechnicianRow[]
  mode: TimeMode
}) {
  if (rows.length === 0) {
    return <EmptyState icon={UsersIcon} title={metricsMessages.empty} />
  }
  const maxParticipation = Math.max(
    1,
    ...rows.map((row) => technicianParticipation(row, mode)),
  )
  return (
    <DataTable
      columns={columns(maxParticipation, mode)}
      rows={rows}
      getRowId={(row) => row.technicianId}
    />
  )
}
