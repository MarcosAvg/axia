import { HintIcon } from '@/components/shared/hint'
import { useTimeMeasure } from '@/components/shared/time-measure-context'
import { isRobustMeasure } from '@/lib/time-measure'
import { formatMinutes } from '../domain/metrics'
import type { DistributionProfileRow, MetricsSummary } from '../domain/metrics'
import { measureValue, totalInMode, type TimeMode } from '../domain/time-mode'
import { metricsMessages } from '../i18n'
import { ChartCard } from './chart-card'
import { CycleComposition } from './cycle-composition'
import { PhaseRangeChart } from './phase-range-chart'
import { PhaseTable } from './phase-table'

const t = metricsMessages.times
const k = metricsMessages.kpi

/** Ciclo y fases: composición con promedio/acumulado o rango con medidas robustas. */
export function CycleCard({
  summary,
  profile,
  mode,
}: {
  summary: MetricsSummary
  profile: DistributionProfileRow[]
  mode: TimeMode
}) {
  const { measure } = useTimeMeasure()
  const robust = isRobustMeasure(measure)
  const record = summary as unknown as Record<string, number>
  const total = measureValue(record, 'total', mode, measure)
  const net =
    measure === 'total'
      ? totalInMode(summary.sumNet, summary.sumNetLabor, mode)
      : totalInMode(summary.avgNet, summary.avgNetLabor, mode)
  return (
    <ChartCard
      title={robust ? t.phaseProfile : t.cycleAndPhases}
      hint={
        robust
          ? metricsMessages.chartHints.phaseProfile
          : metricsMessages.chartHints.cycle
      }
    >
      <div className="flex flex-col gap-3">
        {robust ? (
          <PhaseRangeChart profile={profile} measure={measure} />
        ) : (
          <CycleComposition summary={summary} measure={measure} mode={mode} />
        )}
        {robust ? null : <PhaseTable summary={summary} mode={mode} />}
        <p className="flex flex-wrap gap-x-6 gap-y-1 border-t pt-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            {k.total}
            <HintIcon hint={metricsMessages.timesHints.total} label={k.total} />
            <span className="font-medium text-foreground">
              {formatMinutes(total)}
            </span>
          </span>
          {robust ? (
            <span>{t.robustHint}</span>
          ) : (
            <span className="inline-flex items-center gap-1">
              {k.net}
              <HintIcon hint={metricsMessages.timesHints.net} label={k.net} />
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
