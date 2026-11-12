import { useId } from 'react'
import { cn } from 'cn'
import { HintIcon } from '@/components/shared/hint'
import { messages } from '@/lib/i18n'
import { TIME_MEASURES, type TimeMeasure } from '@/lib/time-measure'
import { useTimeMeasure } from './time-measure-context'

const t = messages.measure

const LABELS: Record<TimeMeasure, string> = {
  average: t.average,
  total: t.total,
  median: t.median,
  p90: t.p90,
  p95: t.p95,
  max: t.max,
}

/** Selector de la medida de tiempos del tablero. */
export function MeasureSelect({ className }: { className?: string }) {
  const id = useId()
  const { measure, setMeasure } = useTimeMeasure()
  return (
    <div
      className={cn(
        'flex items-center gap-2 text-xs text-muted-foreground',
        className,
      )}
    >
      <label htmlFor={id}>{t.label}</label>
      <HintIcon hint={t.hint} label={t.label} />
      <select
        id={id}
        value={measure}
        aria-label={t.aria}
        onChange={(event) => setMeasure(event.target.value as TimeMeasure)}
        className="h-11 rounded-lg border border-input bg-transparent px-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring lg:h-8"
      >
        {TIME_MEASURES.map((value) => (
          <option key={value} value={value}>
            {LABELS[value]}
          </option>
        ))}
      </select>
    </div>
  )
}
