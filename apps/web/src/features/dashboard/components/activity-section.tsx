import { Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ToneDot } from '@/components/shared/tone'
import { eventLabels } from '@/features/tickets'
import { formatDateTime } from '@/lib/format'
import { toneForId } from '@/lib/tones'
import type { ActivityItem } from '../api/dashboard-api'
import { dashboardMessages as t } from '../i18n'

function eventLabel(type: string): string {
  return (eventLabels as Record<string, string>)[type] ?? type
}

/** Últimos eventos visibles para el usuario. */
export function ActivitySection({ items }: { items: ActivityItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t.activity.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.activity.empty}</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-1 py-2 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <div className="flex flex-wrap items-center gap-x-2">
                    <Link
                      to="/tickets/$ticketId"
                      params={{ ticketId: item.ticketId }}
                      className="inline-flex min-h-11 items-center font-medium text-primary hover:underline"
                    >
                      {item.folio || '—'}
                    </Link>
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <ToneDot tone={toneForId(item.type)} />
                      {eventLabel(item.type)}
                    </span>
                  </div>
                  {item.actorName ? (
                    <span className="text-xs text-muted-foreground">
                      {item.actorName}
                    </span>
                  ) : null}
                </div>
                <time
                  dateTime={item.occurredAt}
                  className="text-xs text-muted-foreground"
                >
                  {formatDateTime(item.occurredAt)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
