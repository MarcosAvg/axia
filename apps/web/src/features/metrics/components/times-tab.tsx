import type { DimensionGroup } from '../domain/dimensions'
import type {
  RequesterTimeRow,
  TechnicianRow,
  TechnicianSubjectTimeRow,
  TechnicianTimeRow,
} from '../domain/indicators'
import type { DistributionProfileRow, MetricsSummary } from '../domain/metrics'
import type { TimeMode } from '../domain/time-mode'
import { metricsMessages } from '../i18n'
import { CycleCard } from './cycle-card'
import { DistributionProfileCard } from './distribution-profile'
import { PeopleTimes } from './people-times'
import { PhaseHeatmap } from './phase-heatmap'
import { TimesDimensionTable } from './times-dimension-table'
import { TimesHeader } from './times-header'

const t = metricsMessages.times

/** Tiempos: ciclo, distribución, dimensiones y personas. */
export function TimesTab({
  summary,
  groups,
  profile,
  technicians,
  technicianTimes,
  technicianSubjectTimes,
  requesterTimes,
  mode,
}: {
  summary: MetricsSummary
  groups: DimensionGroup[]
  profile: DistributionProfileRow[]
  technicians: TechnicianRow[]
  technicianTimes: TechnicianTimeRow[]
  technicianSubjectTimes: TechnicianSubjectTimeRow[]
  requesterTimes: RequesterTimeRow[]
  mode: TimeMode
}) {
  return (
    <div className="flex flex-col gap-6">
      <TimesHeader />
      <CycleCard summary={summary} profile={profile} mode={mode} />
      <DistributionProfileCard profile={profile} />
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
