import { CopyIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import { DIMENSIONS } from '../domain/dimensions'
import type { Dimension } from '../domain/dimensions'
import { formatPercent } from '../domain/metrics'
import type { DuplicateDimensionRow } from '../domain/metrics'
import { dimensionLabels, metricsMessages } from '../i18n'

const t = metricsMessages.duplicates

const columns: DataTableColumn<DuplicateDimensionRow>[] = [
  {
    id: 'name',
    header: metricsMessages.table.name,
    cell: (row) => row.dimensionName ?? row.dimensionId,
  },
  { id: 'tickets', header: t.tickets, cell: (row) => row.tickets },
  { id: 'duplicates', header: t.duplicates, cell: (row) => row.duplicates },
  {
    id: 'rate',
    header: t.rate,
    cell: (row) => formatPercent(row.duplicateRate),
  },
]

function DuplicateDimensionCard({
  dimension,
  rows,
}: {
  dimension: Dimension
  rows: DuplicateDimensionRow[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {dimensionLabels[dimension]}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState icon={CopyIcon} title={metricsMessages.empty} />
        ) : (
          <div className="max-h-64 overflow-auto">
            <DataTable
              columns={columns}
              rows={rows}
              getRowId={(row) => row.dimensionId}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/** Duplicados por dimensión: una tarjeta por dimensión. */
export function DuplicateSections({ rows }: { rows: DuplicateDimensionRow[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {DIMENSIONS.map((dimension) => (
        <DuplicateDimensionCard
          key={dimension}
          dimension={dimension}
          rows={rows.filter((row) => row.dimension === dimension)}
        />
      ))}
    </div>
  )
}
