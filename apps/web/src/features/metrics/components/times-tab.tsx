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
import { CycleBar } from './cycle-bar'
import { DistributionProfileCard } from './distribution-profile'
import { PeopleTimes } from './people-times'
import { PhaseHeatmap } from './phase-heatmap'
import { PhaseTable } from './phase-table'
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
      <div className="flex flex-col gap-4">
        <CycleBar summary={summary} mode={mode} />
        <PhaseTable summary={summary} mode={mode} />
      </div>
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
