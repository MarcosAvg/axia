import { Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatMinutes } from '@/features/metrics'
import type { AgingRow } from '@/features/metrics'
import { statusLabels } from '@/features/tickets'
import { dashboardMessages as t } from '../i18n'

/** Tiquets más antiguos que requieren atención. */
export function AttentionSection({ rows }: { rows: AgingRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t.attention.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.attention.empty}</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {rows.map((row) => (
              <li key={row.id}>
                <Link
                  to="/tickets/$ticketId"
                  params={{ ticketId: row.id }}
                  className="flex items-center justify-between gap-3 py-2 text-sm hover:underline"
                >
                  <span className="font-medium">{row.folio}</span>
                  <span className="text-muted-foreground">
                    {statusLabels[row.status as keyof typeof statusLabels] ??
                      row.status}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatMinutes(row.ageMinutes)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
