import { ArrowDownRightIcon, ArrowUpRightIcon, MinusIcon } from 'lucide-react'
import { formatDelta } from '../domain/period'
import { metricsMessages } from '../i18n'

/**
 * Cambio contra el periodo anterior. Si `lowerIsBetter` se omite, el cambio es
 * informativo (sin color de bueno/malo).
 */
export function DeltaBadge({
  change,
  lowerIsBetter,
}: {
  change: number | null
  lowerIsBetter?: boolean
}) {
  const t = metricsMessages.delta
  if (change === null) {
    return <span className="text-xs text-muted-foreground">{t.noData}</span>
  }
  const rounded = Math.round(change * 100)
  const isGood =
    lowerIsBetter === undefined || rounded === 0
      ? undefined
      : change < 0 === lowerIsBetter
  const tone =
    isGood === undefined
      ? 'text-muted-foreground'
      : isGood
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-destructive'
  const Icon =
    rounded === 0
      ? MinusIcon
      : change > 0
        ? ArrowUpRightIcon
        : ArrowDownRightIcon
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${tone}`}>
      <Icon className="size-3.5" aria-hidden />
      {formatDelta(change)}
      <span className="text-muted-foreground">{t.vsPrevious}</span>
    </span>
  )
}
