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
): PhaseRow[] {
  const pick = (average: number, total: number) =>
    timeValue(aggregation, average, total)
  const average = cyclePhases({
    response: summary.avgResponse,
    assignment: summary.avgAssignment,
    reassignment: summary.avgReassignment,
    wait: summary.avgWait,
    active: summary.avgActive,
    pause: summary.avgPause,
    validation: summary.avgValidation,
    claim: summary.avgClaim,
    total: summary.avgTotal,
  })
  const accumulated = cyclePhases({
    response: summary.sumResponse,
    assignment: summary.sumAssignment,
    reassignment: summary.sumReassignment,
    wait: summary.sumWait,
    active: summary.sumActive,
    pause: summary.sumPause,
    validation: summary.sumValidation,
    claim: summary.sumClaim,
    total: summary.sumTotal,
  })
  const total = pick(summary.avgTotal, summary.sumTotal)
  const byPhase = new Map(accumulated.map((slice) => [slice.phase, slice]))
  return average.map((slice) => {
    const sum = byPhase.get(slice.phase)?.minutes ?? 0
    return {
      phase: slice.phase,
      average: pick(slice.minutes, sum),
      accumulated: sum,
      share: shareOf(pick(slice.minutes, sum), total),
    }
  })
}

/** Tabla de todas las fases del ciclo, con promedio y acumulado. */
export function PhaseTable({ summary }: { summary: MetricsSummary }) {
  const { aggregation } = useTimeAggregation()
  const rows = phaseRows(summary, aggregation)
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
