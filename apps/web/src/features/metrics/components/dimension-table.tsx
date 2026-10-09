import { BarChart3Icon } from 'lucide-react'
import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import type { Dimension, DimensionGroup } from '../domain/dimensions'
import { formatPercent } from '../domain/metrics'
import { dimensionLabels, metricsMessages } from '../i18n'

const t = metricsMessages.table

/** Cantidades por agrupación y dimensión (Resumen). */
export function DimensionTable({
  groups,
  nameOf,
}: {
  groups: DimensionGroup[]
  nameOf: (dimension: Dimension, id: string) => string
}) {
  if (groups.length === 0) {
    return <EmptyState icon={BarChart3Icon} title={metricsMessages.empty} />
  }
  const columns: DataTableColumn<DimensionGroup>[] = [
    {
      id: 'dimension',
      header: t.dimension,
      cell: (group) => dimensionLabels[group.dimension],
    },
    {
      id: 'name',
      header: t.name,
      cell: (group) => nameOf(group.dimension, group.row.id),
    },
    { id: 'tickets', header: t.tickets, cell: (group) => group.row.tickets },
    {
      id: 'reassignment',
      header: t.reassignment,
      cell: (group) => formatPercent(group.row.reassignmentRate),
    },
    {
      id: 'recapture',
      header: t.recapture,
      cell: (group) => formatPercent(group.row.recaptureRate),
    },
  ]
  return (
    <DataTable
      columns={columns}
      rows={groups}
      getRowId={(group) => `${group.dimension}-${group.row.id}`}
    />
  )
}
