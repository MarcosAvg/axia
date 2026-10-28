import { DIMENSIONS } from '../domain/dimensions'
import type { Dimension } from '../domain/dimensions'
import { dimensionLabels, metricsMessages } from '../i18n'

/** Selector compacto de dimensión, reutilizado por Distribución y Tiempos. */
export function DimensionPicker({
  value,
  onChange,
  label = metricsMessages.dimensions.viewBy,
}: {
  value: Dimension
  onChange: (dimension: Dimension) => void
  label?: string
}) {
  return (
    <label className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <span>{label}</span>
      <select
        value={value}
        aria-label={label}
        onChange={(event) => onChange(event.target.value as Dimension)}
        className="h-11 rounded-lg border border-input bg-transparent px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring lg:h-8"
      >
        {DIMENSIONS.map((dimension) => (
          <option key={dimension} value={dimension}>
            {dimensionLabels[dimension]}
          </option>
        ))}
      </select>
    </label>
  )
}
