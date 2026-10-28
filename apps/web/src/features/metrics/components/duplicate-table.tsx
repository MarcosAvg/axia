import { CopyIcon } from 'lucide-react'
import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import type { Dimension } from '../domain/dimensions'
import { formatPercent } from '../domain/metrics'
import type { DuplicateDimensionRow } from '../domain/metrics'
import { dimensionLabels, metricsMessages } from '../i18n'
import { ChartCard } from './chart-card'

const t = metricsMessages.duplicates
const hints = metricsMessages.tableHints

const columns: DataTableColumn<DuplicateDimensionRow>[] = [
  {
    id: 'dimension',
    header: t.dimension,
    cell: (row) => dimensionLabels[row.dimension as Dimension] ?? row.dimension,
  },
  {
    id: 'name',
    header: metricsMessages.table.name,
    cell: (row) => row.dimensionName ?? row.dimensionId,
  },
  {
    id: 'tickets',
    header: t.tickets,
    hideBelow: 'md',
    cell: (row) => row.tickets,
  },
  {
    id: 'duplicates',
    header: t.duplicates,
    hideBelow: 'md',
    cell: (row) => row.duplicates,
  },
  {
    id: 'rate',
    header: t.rate,
    hint: hints.duplicateRate,
    cell: (row) => formatPercent(row.duplicateRate),
  },
]

/** Detalle de duplicados por agrupación, en una sola tabla. */
export function DuplicateTable({ rows }: { rows: DuplicateDimensionRow[] }) {
  const sorted = [...rows].sort(
    (left, right) =>
      right.duplicateRate - left.duplicateRate ||
      right.duplicates - left.duplicates,
  )
  return (
    <ChartCard
      title={t.detail}
      hint={metricsMessages.chartHints.duplicatesByDimension}
    >
      {sorted.length === 0 ? (
        <EmptyState icon={CopyIcon} title={metricsMessages.empty} />
      ) : (
        <div className="max-h-80 overflow-auto">
          <DataTable
            columns={columns}
            rows={sorted}
            getRowId={(row) => `${row.dimension}:${row.dimensionId}`}
          />
        </div>
      )}
    </ChartCard>
  )
}
