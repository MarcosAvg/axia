import { averageOf, formatMinutes } from '../domain/metrics'
import type { DuplicateAlert, DuplicateTicket } from '../domain/metrics'
import { metricsMessages } from '../i18n'

const t = metricsMessages.duplicates

function decisionLabel(decision: string): string {
  const labels = t.decisions as Record<string, string>
  return labels[decision] ?? decision
}

/** Resumen compacto de duplicados: tiempo hasta marcarse y alertas por decisión. */
export function DuplicatesSummary({
  tickets,
  alerts,
}: {
  tickets: DuplicateTicket[]
  alerts: DuplicateAlert[]
}) {
  const avg = averageOf(tickets.map((item) => item.timeToMarkMinutes))
  return (
    <p className="text-sm text-muted-foreground">
      {t.timeToMark}:{' '}
      <span className="font-medium text-foreground">{formatMinutes(avg)}</span>
      {alerts.map((alert) => (
        <span key={alert.decision}>
          {' · '}
          {decisionLabel(alert.decision)}:{' '}
          <span className="font-medium text-foreground">
            {alert.candidates}
          </span>
        </span>
      ))}
    </p>
  )
}
