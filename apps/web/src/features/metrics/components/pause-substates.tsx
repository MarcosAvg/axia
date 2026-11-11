import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn } from '@/components/shared/data-table'
import type { PauseSubstateRow } from '../domain/indicators'
import { formatMinutes } from '../domain/metrics'
import { metricsMessages } from '../i18n'

const columns: DataTableColumn<PauseSubstateRow>[] = [
  {
    id: 'name',
    header: metricsMessages.quality.substate,
    cell: (row) => row.name,
  },
  {
    id: 'pauses',
    header: metricsMessages.quality.pausesCount,
    cell: (row) => row.pauses,
  },
  {
    id: 'minutes',
    header: metricsMessages.quality.pauseTime,
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
