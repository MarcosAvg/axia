import { useState } from 'react'
import { CopyIcon } from 'lucide-react'
import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import type { Dimension } from '../domain/dimensions'
import { formatPercent } from '../domain/metrics'
import type { DuplicateDimensionRow } from '../domain/metrics'
import { metricsMessages } from '../i18n'
import { BarCell } from './bar-cell'
import { ChartCard } from './chart-card'
import { DimensionPicker } from './dimension-picker'

const t = metricsMessages.duplicates
const hints = metricsMessages.tableHints

/** Dimensiones que devuelve el endpoint de duplicados. */
const DUPLICATE_DIMENSIONS: Dimension[] = [
  'team',
  'building',
  'category',
  'dependency',
  'requester',
]

const columns: DataTableColumn<DuplicateDimensionRow>[] = [
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
    cell: (row) => (
      <BarCell
        value={row.duplicateRate}
        max={1}
        label={formatPercent(row.duplicateRate)}
        className="min-w-32"
      />
    ),
  },
]

/** Detalle de duplicados por una dimensión seleccionable. */
export function DuplicateTable({ rows }: { rows: DuplicateDimensionRow[] }) {
  const [dimension, setDimension] = useState<Dimension>('category')
  const filtered = rows
    .filter((row) => row.dimension === dimension)
    .sort(
      (left, right) =>
        right.duplicateRate - left.duplicateRate ||
        right.duplicates - left.duplicates,
    )
  return (
    <ChartCard
      title={t.detail}
      hint={metricsMessages.chartHints.duplicatesByDimension}
    >
      <div className="flex flex-col gap-3">
        <DimensionPicker
          value={dimension}
          onChange={setDimension}
          dimensions={DUPLICATE_DIMENSIONS}
        />
        {filtered.length === 0 ? (
          <EmptyState icon={CopyIcon} title={metricsMessages.empty} />
        ) : (
          <div className="max-h-80 overflow-auto">
            <DataTable
              columns={columns}
              rows={filtered}
              getRowId={(row) => row.dimensionId}
            />
          </div>
        )}
      </div>
    </ChartCard>
  )
}
