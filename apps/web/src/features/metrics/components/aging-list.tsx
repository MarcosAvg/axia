import { ClockIcon } from 'lucide-react'
import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import { formatMinutes } from '../domain/metrics'
import type { AgingRow } from '../domain/metrics'
import { metricsMessages } from '../i18n'
import { BarCell } from './bar-cell'

const t = metricsMessages.aging

/** Lista de tiquets pendientes por antigüedad, con barra comparativa. */
export function AgingList({
  rows,
  statusLabel,
}: {
  rows: AgingRow[]
  statusLabel: (status: string) => string
}) {
  if (rows.length === 0) {
    return <EmptyState icon={ClockIcon} title={metricsMessages.empty} />
  }
  const maxAge = Math.max(1, ...rows.map((row) => row.ageMinutes))
  const columns: DataTableColumn<AgingRow>[] = [
    { id: 'folio', header: t.ticket, cell: (row) => row.folio },
    {
      id: 'status',
      header: t.status,
      hideBelow: 'sm',
      cell: (row) => statusLabel(row.status),
    },
    {
      id: 'age',
      header: t.age,
      hint: metricsMessages.tableHints.age,
      cell: (row) => (
        <BarCell
          value={row.ageMinutes}
          max={maxAge}
          label={formatMinutes(row.ageMinutes)}
          className="min-w-40"
        />
      ),
    },
  ]
  return <DataTable columns={columns} rows={rows} getRowId={(row) => row.id} />
}
