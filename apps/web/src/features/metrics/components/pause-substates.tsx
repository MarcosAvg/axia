import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn } from '@/components/shared/data-table'
import type { PauseSubstateRow } from '../domain/indicators'
import { formatMinutes } from '../domain/metrics'
import { metricsMessages } from '../i18n'

const columns: DataTableColumn<PauseSubstateRow>[] = [
  { id: 'name', header: 'Subestado', cell: (row) => row.name },
  { id: 'pauses', header: 'Pausas', cell: (row) => row.pauses },
  {
    id: 'minutes',
    header: 'Tiempo',
    cell: (row) => formatMinutes(row.pauseMinutes),
  },
]

/** Detalle de pausas por subestado. */
export function PauseSubstates({ rows }: { rows: PauseSubstateRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{metricsMessages.empty}</p>
    )
  }
  return (
    <DataTable columns={columns} rows={rows} getRowId={(row) => row.name} />
  )
}
