import type { DimensionGroup } from '../domain/dimensions'
import type {
  RequesterTimeRow,
  TechnicianRow,
  TechnicianSubjectTimeRow,
  TechnicianTimeRow,
} from '../domain/indicators'
import type { MetricsSummary } from '../domain/metrics'
import type { TimeMode } from '../domain/time-mode'
import { formatMinutes } from '../domain/metrics'
import { metricsMessages } from '../i18n'
import { ChartCard } from './chart-card'
import { CycleBar } from './cycle-bar'
import { PeopleTimes } from './people-times'
import { PhaseHeatmap } from './phase-heatmap'
import { PhaseTable } from './phase-table'
import { TimesDimensionTable } from './times-dimension-table'
import { TimesHeader } from './times-header'

const t = metricsMessages.times

function percentileRows(summary: MetricsSummary) {
  const phases = t.phases
  return [
    {
      key: 'total',
      label: metricsMessages.kpi.total,
      p50: summary.p50Total,
      p90: summary.p90Total,
    },
    {
      key: 'response',
      label: phases.response,
      p50: summary.p50Response,
      p90: summary.p90Response,
    },
    {
      key: 'active',
      label: phases.active,
      p50: summary.p50Active,
      p90: summary.p90Active,
    },
    {
      key: 'validation',
      label: phases.validation,
      p50: summary.p50Validation,
      p90: summary.p90Validation,
    },
    {
      key: 'claim',
      label: phases.claim,
      p50: summary.p50Claim,
      p90: summary.p90Claim,
    },
    {
      key: 'resolution',
      label: metricsMessages.kpi.resolution,
      p50: summary.p50Resolution,
      p90: summary.p90Resolution,
    },
  ]
}

function PercentilesCard({ summary }: { summary: MetricsSummary }) {
  const rows = percentileRows(summary)
  return (
    <ChartCard title={t.percentiles} hint={t.percentilesHint}>
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <div
            key={row.key}
            className="flex items-center justify-between gap-3"
          >
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="tabular-nums">
              {formatMinutes(row.p50)} / {formatMinutes(row.p90)}
            </dd>
          </div>
        ))}
      </dl>
    </ChartCard>
  )
}

/** Tiempos: ciclo, dimensiones y personas. */
export function TimesTab({
  summary,
  groups,
  technicians,
  technicianTimes,
  technicianSubjectTimes,
  requesterTimes,
  mode,
}: {
  summary: MetricsSummary
  groups: DimensionGroup[]
  technicians: TechnicianRow[]
  technicianTimes: TechnicianTimeRow[]
  technicianSubjectTimes: TechnicianSubjectTimeRow[]
  requesterTimes: RequesterTimeRow[]
  mode: TimeMode
}) {
  return (
    <div className="flex flex-col gap-6">
      <TimesHeader />
      <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
        <CycleBar summary={summary} mode={mode} />
        <PhaseTable summary={summary} mode={mode} />
      </div>
      <PercentilesCard summary={summary} />
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-medium">{t.dimensionSection}</h2>
        <PhaseHeatmap groups={groups} mode={mode} />
        <TimesDimensionTable groups={groups} mode={mode} />
      </section>
      <PeopleTimes
        technicians={technicians}
        technicianTimes={technicianTimes}
        technicianSubjectTimes={technicianSubjectTimes}
        requesterTimes={requesterTimes}
        mode={mode}
      />
    </div>
  )
}
