import { CopyIcon } from 'lucide-react'
import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import { averageOf, formatMinutes, formatPercent } from '../domain/metrics'
import type {
  DuplicateAlert,
  DuplicateDimensionRow,
  DuplicateTicket,
} from '../domain/metrics'
import { dimensionLabels, metricsMessages } from '../i18n'
import { MetricCard } from './metric-card'

const t = metricsMessages.duplicates

function decisionLabel(decision: string): string {
  const labels = t.decisions as Record<string, string>
  return labels[decision] ?? decision
}

function dimensionName(row: DuplicateDimensionRow): string {
  const type = dimensionLabels[row.dimension as keyof typeof dimensionLabels]
  const name = row.dimensionName ?? row.dimensionId
  return type ? `${type}: ${name}` : name
}

/** Indicadores de duplicados: tiempo hasta marcarse, alertas y tasa por dimensión. */
export function DuplicatesSection({
  tickets,
  alerts,
  rows,
}: {
  tickets: DuplicateTicket[]
  alerts: DuplicateAlert[]
  rows: DuplicateDimensionRow[]
}) {
  const avg = averageOf(tickets.map((item) => item.timeToMarkMinutes))
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label={t.timeToMark} value={formatMinutes(avg)} />
        {alerts.map((alert) => (
          <MetricCard
            key={alert.decision}
            label={decisionLabel(alert.decision)}
            value={String(alert.candidates)}
          />
        ))}
      </div>
      <DuplicateDimensionTable rows={rows} />
    </div>
  )
}

function DuplicateDimensionTable({ rows }: { rows: DuplicateDimensionRow[] }) {
  if (rows.length === 0) {
    return <EmptyState icon={CopyIcon} title={metricsMessages.empty} />
  }
  const columns: DataTableColumn<DuplicateDimensionRow>[] = [
    {
      id: 'dimension',
      header: t.dimension,
      cell: (row) => dimensionName(row),
    },
    { id: 'tickets', header: t.tickets, cell: (row) => row.tickets },
    {
      id: 'duplicates',
      header: t.duplicates,
      cell: (row) => row.duplicates,
    },
    {
      id: 'rate',
      header: t.rate,
      cell: (row) => formatPercent(row.duplicateRate),
    },
  ]
  return (
    <DataTable
      columns={columns}
      rows={rows}
      getRowId={(row) => `${row.dimension}-${row.dimensionId}`}
    />
  )
}
