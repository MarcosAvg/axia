import { formatMinutes } from '@/features/metrics'
import type { TicketDetailWithTimes } from '../domain/types'
import { cycleMessages } from '../i18n-cycle'
import { CYCLE_PHASES } from './ticket-cycle-phases'

type CycleTimes = TicketDetailWithTimes['cycleTimes']

function share(minutes: number, total: number): string {
  if (!(total > 0)) return '0%'
  return `${Math.min(100, Math.max(0, (minutes / total) * 100))}%`
}

/** Barra apilada con la composición de las fases de un tiquet. */
export function TicketCycleChart({ times }: { times: CycleTimes }) {
  const slices = CYCLE_PHASES.map((phase) => ({
    ...phase,
    minutes: times[phase.key],
  })).filter((phase) => phase.minutes > 0)
  if (slices.length === 0 || times.total <= 0) return null
  const label = `${cycleMessages.chart}: ${slices
    .map((slice) => `${slice.label} ${formatMinutes(slice.minutes)}`)
    .join(', ')}`
  return (
    <div
      role="img"
      aria-label={label}
      className="flex h-10 w-full overflow-hidden rounded-lg bg-muted"
    >
      {slices.map((slice) => (
        <span
          key={slice.key}
          className="h-full"
          style={{
            width: share(slice.minutes, times.total),
            background: slice.color,
          }}
        />
      ))}
    </div>
  )
}
