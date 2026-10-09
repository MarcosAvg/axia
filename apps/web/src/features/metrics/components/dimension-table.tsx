import { BarChart3Icon } from 'lucide-react'
import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import { formatMinutes, formatPercent } from '../domain/metrics'
import type { DimensionRow } from '../domain/metrics'
import { metricsMessages } from '../i18n'

const t = metricsMessages.table

/** Tabla por dimensión (equipo, edificio, categoría o dependencia). */
export function DimensionTable({
  rows,
  nameOf,
}: {
  rows: DimensionRow[]
  nameOf: (id: string) => string
}) {
  if (rows.length === 0) {
    return <EmptyState icon={BarChart3Icon} title={metricsMessages.empty} />
  }
  const columns: DataTableColumn<DimensionRow>[] = [
    { id: 'dimension', header: t.dimension, cell: (row) => nameOf(row.id) },
    { id: 'tickets', header: t.tickets, cell: (row) => row.tickets },
    {
      id: 'avgActive',
      header: t.avgActive,
      cell: (row) => formatMinutes(row.avgActive),
    },
    {
      id: 'avgTotal',
      header: t.avgTotal,
      cell: (row) => formatMinutes(row.avgTotal),
    },
    {
      id: 'extra',
      header: t.extra,
      cell: (row) => formatMinutes(row.avgActiveExtra),
    },
    {
      id: 'reassignment',
      header: t.reassignment,
      cell: (row) => formatPercent(row.reassignmentRate),
    },
    {
      id: 'recapture',
      header: t.recapture,
      cell: (row) => formatPercent(row.recaptureRate),
    },
  ]
  return <DataTable columns={columns} rows={rows} getRowId={(row) => row.id} />
}
