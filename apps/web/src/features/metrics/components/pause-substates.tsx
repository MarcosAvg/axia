import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn } from '@/components/shared/data-table'
import type { PauseSubstateRow } from '../domain/indicators'
import { totalInMode, type TimeMode } from '../domain/time-mode'
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
]

/** Detalle de pausas por subestado. */
export function PauseSubstates({
  rows,
  mode,
}: {
  rows: PauseSubstateRow[]
  mode: TimeMode
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{metricsMessages.empty}</p>
    )
  }
  const timeColumn: DataTableColumn<PauseSubstateRow> = {
    id: 'minutes',
    header: metricsMessages.quality.pauseTime,
    hint: metricsMessages.tableHints.pauseTime,
    cell: (row) =>
      formatMinutes(totalInMode(row.pauseMinutes, row.pauseLaborMinutes, mode)),
  }
  return (
    <DataTable
      columns={[...columns, timeColumn]}
      rows={rows}
      getRowId={(row) => row.id}
    />
  )
}
