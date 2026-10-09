import { DIMENSIONS } from '../domain/dimensions'
import type { Dimension, DimensionGroup } from '../domain/dimensions'
import { DimensionSection } from './dimension-section'
import type { DimensionVariant } from './dimension-section'

/** Rejilla con una sección por dimensión. */
export function DimensionSections({
  groups,
  nameOf,
  variant,
  withChart = false,
}: {
  groups: DimensionGroup[]
  nameOf: (dimension: Dimension, id: string) => string
  variant: DimensionVariant
  withChart?: boolean
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {DIMENSIONS.map((dimension) => (
        <DimensionSection
          key={dimension}
          dimension={dimension}
          groups={groups}
          nameOf={nameOf}
          variant={variant}
          withChart={withChart}
        />
      ))}
    </div>
  )
}
