import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn } from '@/components/shared/data-table'
import type { SupervisorRow } from '../domain/indicators'
import { formatMinutes, formatPercent } from '../domain/metrics'
import { offerRate } from '../domain/team'
import { metricsMessages } from '../i18n'
import { StackedBarCell } from './bar-cell'

const t = metricsMessages.team

const columns: DataTableColumn<SupervisorRow>[] = [
  { id: 'name', header: t.supervisor, cell: (row) => row.name },
  { id: 'offers', header: t.offers, cell: (row) => row.offers },
  {
    id: 'load',
    header: `${t.taken} / ${t.pending} / ${t.withdrawn}`,
    cell: (row) => (
      <StackedBarCell
        segments={[
          { key: 'taken', value: row.taken, color: 'var(--chart-2)' },
          { key: 'pending', value: row.pending, color: 'var(--warning)' },
          { key: 'withdrawn', value: row.withdrawn, color: 'var(--border)' },
        ]}
        label={`${row.taken} / ${row.pending} / ${row.withdrawn}`}
        className="min-w-40"
      />
    ),
  },
  {
    id: 'takeRate',
    header: t.takeRate,
    hideBelow: 'lg',
    cell: (row) => formatPercent(offerRate(row.taken, row.offers)),
  },
  {
    id: 'pendingRate',
    header: t.pendingRate,
    hideBelow: 'lg',
    cell: (row) => formatPercent(offerRate(row.pending, row.offers)),
  },
  {
    id: 'time',
    header: t.timeToTakeContinuous,
    cell: (row) => formatMinutes(row.avgTimeToTakeMinutes),
  },
  {
    id: 'reassigned',
    header: t.reassigned,
    hideBelow: 'md',
    cell: (row) => row.reassigned,
  },
  {
    id: 'validated',
    header: t.validated,
    hideBelow: '2xl',
    cell: (row) => row.validated,
  },
]

/** Actividad de los supervisores: ofertas, tomas, tiempos y validaciones. */
export function SupervisorTable({ rows }: { rows: SupervisorRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{metricsMessages.empty}</p>
    )
  }
  return (
    <DataTable
      columns={columns}
      rows={rows}
      getRowId={(row) => row.supervisorId}
    />
  )
}
