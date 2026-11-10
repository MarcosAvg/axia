import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { can, useAuth } from '@/features/auth'
import { formatDateTime } from '@/lib/format'
import type { TicketTimeAlert } from '../domain/types'
import { useTimeAlerts } from '../hooks/use-tickets'
import { eventLabels, ticketMessages } from '../i18n'
import { EventTimeDialog } from './event-time-dialog'

function skewText(skewMs: number | null): string {
  if (skewMs === null) return ticketMessages.timeAlerts.unknown
  return ticketMessages.timeAlerts.skew(Math.round(Math.abs(skewMs) / 60_000))
}

/** Aviso de acciones con hora no verificada y acceso a su corrección. */
export function TimeAlertBanner({ ticketId }: { ticketId: string }) {
  const { identity } = useAuth()
  const alerts = useTimeAlerts(ticketId)
  const [selected, setSelected] = useState<TicketTimeAlert | null>(null)
  const items = alerts.data ?? []
  if (items.length === 0) return null

  const canAdjust = can(identity, 'time.record_manual')

  return (
    <section className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
      <h3 className="text-sm font-medium">{ticketMessages.timeAlerts.title}</h3>
      <p className="text-sm text-muted-foreground">
        {ticketMessages.timeAlerts.help}
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {items.map((alert) => (
          <li
            key={alert.id}
            className="flex flex-wrap items-center gap-2 text-sm"
          >
            <span className="font-medium">{eventLabels[alert.eventType]}</span>
            <span className="text-muted-foreground">
              {formatDateTime(alert.occurredAt)}
            </span>
            <span className="text-xs text-muted-foreground">
              {skewText(alert.clientClockSkewMs)}
            </span>
            {canAdjust ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11"
                onClick={() => setSelected(alert)}
              >
                {ticketMessages.timeAlerts.correct}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      {selected ? (
        <EventTimeDialog
          ticketId={ticketId}
          item={{
            id: selected.eventId,
            occurredAt: selected.occurredAt,
            suggestedOccurredAt: selected.suggestedOccurredAt,
          }}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </section>
  )
}
