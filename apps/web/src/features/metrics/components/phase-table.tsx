import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn } from '@/components/shared/data-table'
import { useTimeAggregation } from '@/components/shared/time-aggregation-context'
import { timeValue } from '@/lib/time-aggregation'
import type { TimeAggregation } from '@/lib/time-aggregation'
import { formatMinutes } from '../domain/metrics'
import type { MetricsSummary } from '../domain/metrics'
import { cyclePhases, shareOf } from '../domain/visuals'
import type { CyclePhase } from '../domain/visuals'
import { metricsMessages } from '../i18n'
import { ChartCard } from './chart-card'
import { modeValue, type TimeMode } from '../domain/time-mode'

const t = metricsMessages.times

interface PhaseRow {
  phase: CyclePhase
  average: number
  accumulated: number
  share: number
}

function phaseRows(
  summary: MetricsSummary,
  aggregation: TimeAggregation,
  mode: TimeMode,
): PhaseRow[] {
  const record = summary as unknown as Record<string, number>
  const value = (key: string, agg: 'average' | 'total') =>
    modeValue(record, key, mode, agg)
  const phases = (agg: 'average' | 'total') => ({
    response: value('response', agg),
    assignment: value('assignment', agg),
    pendingTake: value('pendingTake', agg),
    wait: value('wait', agg),
    active: value('active', agg),
    pause: value('pause', agg),
    dormant: value('dormant', agg),
    validation: value('validation', agg),
    claim: value('claim', agg),
    total: value('total', agg),
  })
  const average = cyclePhases(phases('average'))
  const accumulated = cyclePhases(phases('total'))
  const total = value('total', aggregation)
  const byPhase = new Map(accumulated.map((slice) => [slice.phase, slice]))
  return average.map((slice) => {
    const sum = byPhase.get(slice.phase)?.minutes ?? 0
    const shown = aggregation === 'total' ? sum : slice.minutes
    return {
      phase: slice.phase,
      average: shown,
      accumulated: sum,
      share: shareOf(shown, total),
    }
  })
}

/** Tabla de todas las fases del ciclo, con promedio y acumulado. */
export function PhaseTable({
  summary,
  mode,
}: {
  summary: MetricsSummary
  mode: TimeMode
}) {
  const { aggregation } = useTimeAggregation()
  const rows = phaseRows(summary, aggregation, mode)
  const columns: DataTableColumn<PhaseRow>[] = [
    {
      id: 'phase',
      header: t.phase,
      cell: (row) => t.phases[row.phase],
    },
    {
      id: 'average',
      header: aggregation === 'total' ? t.accumulated : t.average,
      cell: (row) =>
        formatMinutes(aggregation === 'total' ? row.accumulated : row.average),
    },
    {
      id: 'share',
      header: t.share,
      hideBelow: 'md',
      cell: (row) => `${Math.round(row.share * 100)}%`,
    },
  ]
  return (
    <ChartCard title={t.phaseTable}>
      <div className="flex flex-col gap-2">
        <DataTable
          columns={columns}
          rows={rows}
          getRowId={(row) => row.phase}
        />
        <p className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
          <span>
            {metricsMessages.kpi.total}:{' '}
            <span className="font-medium text-foreground">
              {formatMinutes(
                timeValue(aggregation, summary.avgTotal, summary.sumTotal),
              )}
            </span>
          </span>
          <span>
            {metricsMessages.kpi.net}:{' '}
            <span className="font-medium text-foreground">
              {formatMinutes(
                timeValue(aggregation, summary.avgNet, summary.sumNet),
              )}
            </span>
          </span>
        </p>
      </div>
    </ChartCard>
  )
}
