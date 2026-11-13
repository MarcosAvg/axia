import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn } from '@/components/shared/data-table'
import type { PauseSubstateRow } from '../domain/indicators'
import { formatMinutes } from '../domain/metrics'
import { metricsMessages } from '../i18n'
import { MetricCount } from './metric-count'

const drillTitle = (name: string) =>
  `${metricsMessages.drillDown.label} · ${name}`

const columns: DataTableColumn<PauseSubstateRow>[] = [
  {
    id: 'name',
    header: metricsMessages.quality.substate,
    cell: (row) => (
      <MetricCount
        title={drillTitle(row.name)}
        filters={{ pauseSubstateId: row.id }}
      >
        {row.name}
      </MetricCount>
    ),
  },
  {
    id: 'pauses',
    header: metricsMessages.quality.pausesCount,
    hint: metricsMessages.tableHints.pauseCount,
    cell: (row) => (
      <MetricCount
        title={drillTitle(row.name)}
        filters={{ pauseSubstateId: row.id }}
        disabled={row.pauses === 0}
      >
        {row.pauses}
      </MetricCount>
    ),
  },
  {
    id: 'minutes',
    header: metricsMessages.quality.pauseTime,
    hint: metricsMessages.tableHints.pauseTime,
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
  return <DataTable columns={columns} rows={rows} getRowId={(row) => row.id} />
}
