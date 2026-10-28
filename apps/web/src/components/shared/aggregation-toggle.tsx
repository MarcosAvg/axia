import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import { messages } from '@/lib/i18n'
import { TIME_AGGREGATIONS } from '@/lib/time-aggregation'
import type { TimeAggregation } from '@/lib/time-aggregation'
import { useTimeAggregation } from './time-aggregation-context'

const t = messages.aggregation

const LABELS: Record<TimeAggregation, string> = {
  average: t.average,
  total: t.total,
}

/** Control segmentado para alternar la vista de tiempos (promedio/acumulado). */
export function AggregationToggle({ className }: { className?: string }) {
  const { aggregation, setAggregation } = useTimeAggregation()
  return (
    <div
      role="group"
      aria-label={t.aria}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-lg border bg-card p-0.5',
        className,
      )}
    >
      {TIME_AGGREGATIONS.map((value) => {
        const active = aggregation === value
        return (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={active ? 'secondary' : 'ghost'}
            aria-pressed={active}
            className="min-h-11 lg:min-h-9"
            onClick={() => setAggregation(value)}
          >
            {LABELS[value]}
          </Button>
        )
      })}
    </div>
  )
}
