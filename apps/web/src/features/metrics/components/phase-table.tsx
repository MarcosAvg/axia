import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn } from '@/components/shared/data-table'
import { useTimeMeasure } from '@/components/shared/time-measure-context'
import { isRobustMeasure, type TimeMeasure } from '@/lib/time-measure'
import { formatMinutes } from '../domain/metrics'
import type { MetricsSummary } from '../domain/metrics'
import { cyclePhases, shareOf } from '../domain/visuals'
import type { CyclePhase } from '../domain/visuals'
import { metricsMessages } from '../i18n'
import { ChartCard } from './chart-card'
import { measureValue, totalInMode, type TimeMode } from '../domain/time-mode'

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
      cell: (row) => formatMinutes(row.value),
    },
  ]
  if (!isRobustMeasure(measure)) {
    columns.push({
      id: 'share',
      header: t.share,
      hideBelow: 'md',
      cell: (row) => `${Math.round(row.share * 100)}%`,
    })
  }
  return columns
}

/** Tabla de todas las fases del ciclo con la medida activa. */
export function PhaseTable({
  summary,
  mode,
}: {
  summary: MetricsSummary
  mode: TimeMode
}) {
  const { measure } = useTimeMeasure()
  const rows = phaseRows(summary, measure, mode)
  const record = summary as unknown as Record<string, number>
  const total = measureValue(record, 'total', mode, measure)
  const net =
    measure === 'total'
      ? totalInMode(summary.sumNet, summary.sumNetLabor, mode)
      : totalInMode(summary.avgNet, summary.avgNetLabor, mode)
  return (
    <ChartCard title={t.phaseTable}>
      <div className="flex flex-col gap-2">
        <DataTable
          columns={phaseColumns(measure)}
          rows={rows}
          getRowId={(row) => row.phase}
        />
        <p className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
          <span>
            {metricsMessages.kpi.total}:{' '}
            <span className="font-medium text-foreground">
              {formatMinutes(total)}
            </span>
          </span>
          {isRobustMeasure(measure) ? (
            <span>{metricsMessages.times.robustHint}</span>
          ) : (
            <span>
              {metricsMessages.kpi.net}:{' '}
              <span className="font-medium text-foreground">
                {formatMinutes(net)}
              </span>
            </span>
          )}
        </p>
      </div>
    </ChartCard>
  )
}
