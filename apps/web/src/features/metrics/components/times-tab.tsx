import type { Dimension, DimensionGroup } from '../domain/dimensions'
import type { MetricsSummary } from '../domain/metrics'
import { CycleBar } from './cycle-bar'
import { DimensionExplorer } from './dimension-explorer'

/** Tiempos: composición del ciclo y desglose por dimensión. */
export function TimesTab({
  summary,
  groups,
  nameOf,
}: {
  summary: MetricsSummary
  groups: DimensionGroup[]
  nameOf: (dimension: Dimension, id: string) => string
}) {
  return (
    <div className="flex flex-col gap-5">
      <CycleBar summary={summary} />
      <DimensionExplorer groups={groups} nameOf={nameOf} variant="times" />
    </div>
  )
}
