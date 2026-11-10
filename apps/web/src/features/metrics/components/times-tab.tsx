import type { DimensionGroup } from '../domain/dimensions'
import type {
  RequesterTimeRow,
  TechnicianRow,
  TechnicianSubjectTimeRow,
  TechnicianTimeRow,
} from '../domain/indicators'
import type { MetricsSummary } from '../domain/metrics'
import { ChartCard } from './chart-card'
import { formatMinutes } from '../domain/metrics'
import { metricsMessages } from '../i18n'
import { CycleBar } from './cycle-bar'
import { PhaseHeatmap } from './phase-heatmap'
import { PhaseTable } from './phase-table'
import { RequesterTimes } from './requester-times'
import { TechnicianTimes } from './technician-times'
import { TimesDimensionTable } from './times-dimension-table'
import type { TimeMode } from '../domain/time-mode'

function percentileRows(summary: MetricsSummary) {
  const phases = metricsMessages.times.phases
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
    <ChartCard
      title={metricsMessages.times.percentiles}
      hint={metricsMessages.times.percentilesHint}
    >
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
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

/** Tiempos: ciclo, fases, mapa de calor, dimensiones y técnicos. */
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
      <CycleBar summary={summary} mode={mode} />
      <PhaseTable summary={summary} mode={mode} />
      <PercentilesCard summary={summary} />
      <PhaseHeatmap groups={groups} />
      <TimesDimensionTable groups={groups} mode={mode} />
      <TechnicianTimes
        technicians={technicians}
        times={technicianTimes}
        subjectTimes={technicianSubjectTimes}
      />
      <RequesterTimes rows={requesterTimes} />
    </div>
  )
}
