import { useId } from 'react'
import { HintIcon } from '@/components/shared/hint'
import { DIMENSIONS } from '../domain/dimensions'
import type { Dimension } from '../domain/dimensions'
import { dimensionLabels, metricsMessages } from '../i18n'

/** Selector compacto de dimensión, reutilizado por Distribución y Tiempos. */
export function DimensionPicker({
  value,
  onChange,
  label = metricsMessages.dimensions.viewBy,
  dimensions = DIMENSIONS,
  hint = metricsMessages.filterHints.dimension,
}: {
  value: Dimension
  onChange: (dimension: Dimension) => void
  label?: string
  dimensions?: Dimension[]
  hint?: string
}) {
  const id = useId()
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <label htmlFor={id}>{label}</label>
      <HintIcon hint={hint} label={label} />
      <select
        id={id}
        value={value}
        aria-label={label}
        onChange={(event) => onChange(event.target.value as Dimension)}
        className="h-11 rounded-lg border border-input bg-transparent px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring lg:h-8"
      >
        {dimensions.map((dimension) => (
          <option key={dimension} value={dimension}>
            {dimensionLabels[dimension]}
          </option>
        ))}
      </select>
    </div>
  )
}
