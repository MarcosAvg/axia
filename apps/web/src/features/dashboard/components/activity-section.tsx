import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { eventLabels } from '@/features/tickets'
import type { ActivityItem } from '../api/dashboard-api'
import { dashboardMessages as t } from '../i18n'

function eventLabel(type: string): string {
  return (eventLabels as Record<string, string>)[type] ?? type
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-MX', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
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
                className="flex items-center justify-between gap-3 py-2 text-sm"
              >
                <span className="font-medium">{item.folio || '—'}</span>
                <span className="text-muted-foreground">
                  {eventLabel(item.type)}
                </span>
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
