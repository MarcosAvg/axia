import { averageOf, formatMinutes } from '../domain/metrics'
import type { DuplicateAlert, DuplicateTicket } from '../domain/metrics'
import { metricsMessages } from '../i18n'
import { MetricCard } from './metric-card'

const t = metricsMessages.duplicates

function decisionLabel(decision: string): string {
  const labels = t.decisions as Record<string, string>
  return labels[decision] ?? decision
}

/** KPIs de duplicados: tiempo hasta marcarse y alertas por decisión. */
export function DuplicatesSummary({
  tickets,
  alerts,
}: {
  tickets: DuplicateTicket[]
  alerts: DuplicateAlert[]
}) {
  const avg = averageOf(tickets.map((item) => item.timeToMarkMinutes))
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <MetricCard label={t.timeToMark} value={formatMinutes(avg)} />
      {alerts.map((alert) => (
        <MetricCard
          key={alert.decision}
          label={decisionLabel(alert.decision)}
          value={String(alert.candidates)}
        />
      ))}
    </div>
  )
}
