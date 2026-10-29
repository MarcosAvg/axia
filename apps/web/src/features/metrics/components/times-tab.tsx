import type { DimensionGroup } from '../domain/dimensions'
import type { TechnicianRow, TechnicianTimeRow } from '../domain/indicators'
import type { MetricsSummary } from '../domain/metrics'
import { CycleBar } from './cycle-bar'
import { PhaseHeatmap } from './phase-heatmap'
import { PhaseTable } from './phase-table'
import { TechnicianTimes } from './technician-times'
import { TimesDimensionTable } from './times-dimension-table'

/** Tiempos: ciclo, fases, mapa de calor, dimensiones y técnicos. */
export function TimesTab({
  summary,
  groups,
  technicians,
  technicianTimes,
}: {
  summary: MetricsSummary
  groups: DimensionGroup[]
  technicians: TechnicianRow[]
  technicianTimes: TechnicianTimeRow[]
}) {
  return (
    <div className="flex flex-col gap-5">
      <CycleBar summary={summary} />
      <PhaseTable summary={summary} />
      <PhaseHeatmap groups={groups} />
      <TimesDimensionTable groups={groups} />
      <TechnicianTimes technicians={technicians} times={technicianTimes} />
    </div>
  )
}
