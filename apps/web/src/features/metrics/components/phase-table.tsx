import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn } from '@/components/shared/data-table'
import { useTimeMeasure } from '@/components/shared/time-measure-context'
import { isRobustMeasure, type TimeMeasure } from '@/lib/time-measure'
import { formatMinutes } from '../domain/metrics'
import type { MetricsSummary } from '../domain/metrics'
import { cyclePhases, shareOf } from '../domain/visuals'
import type { CyclePhase } from '../domain/visuals'
import { metricsMessages } from '../i18n'
import { measureValue, type TimeMode } from '../domain/time-mode'

const t = metricsMessages.times

interface PhaseRow {
  phase: CyclePhase
  value: number
  share: number
}

function phaseRows(
  summary: MetricsSummary,
  measure: TimeMeasure,
  mode: TimeMode,
): PhaseRow[] {
  const record = summary as unknown as Record<string, number>
  const value = (key: string) => measureValue(record, key, mode, measure)
  const values = {
    response: value('response'),
    assignment: value('assignment'),
    pendingTake: value('pendingTake'),
    wait: value('wait'),
    active: value('active'),
    pause: value('pause'),
    dormant: value('dormant'),
    validation: value('validation'),
    claim: value('claim'),
    total: value('total'),
  }
  return cyclePhases(values).map((slice) => ({
    phase: slice.phase,
    value: slice.minutes,
    share: isRobustMeasure(measure) ? 0 : shareOf(slice.minutes, values.total),
  }))
}

function valueHeader(measure: TimeMeasure): string {
  if (measure === 'average') return t.average
  if (measure === 'total') return t.accumulated
  return metricsMessages.measure[measure]
}

function phaseColumns(measure: TimeMeasure): DataTableColumn<PhaseRow>[] {
  const columns: DataTableColumn<PhaseRow>[] = [
    {
      id: 'phase',
      header: t.phase,
      cell: (row) => t.phases[row.phase],
    },
    {
      id: 'value',
      header: valueHeader(measure),
      hint: metricsMessages.timesHints.phaseValue,
      cell: (row) => formatMinutes(row.value),
    },
  ]
  if (!isRobustMeasure(measure)) {
    columns.push({
      id: 'share',
      header: t.share,
      hint: metricsMessages.timesHints.share,
      hideBelow: 'md',
      cell: (row) => `${Math.round(row.share * 100)}%`,
    })
  }
  return columns
}

/** Tabla de fases del ciclo; la tarjeta contenedora aporta título y totales. */
export function PhaseTable({
  summary,
  mode,
}: {
  summary: MetricsSummary
  mode: TimeMode
}) {
  const { measure } = useTimeMeasure()
  return (
    <DataTable
      columns={phaseColumns(measure)}
      rows={phaseRows(summary, measure, mode)}
      getRowId={(row) => row.phase}
    />
  )
}
