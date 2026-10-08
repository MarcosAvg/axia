import { formatMinutes } from '../domain/metrics'
import type { AgingRow } from '../domain/metrics'
import { metricsMessages } from '../i18n'

/** Lista de tiquets pendientes por antigüedad. */
export function AgingList({
  rows,
  statusLabel,
}: {
  rows: AgingRow[]
  statusLabel: (status: string) => string
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{metricsMessages.empty}</p>
    )
  }
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((row) => (
        <li
          key={row.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
        >
          <span className="font-medium">{row.folio}</span>
          <span className="text-muted-foreground">
            {statusLabel(row.status)}
          </span>
          <span>{formatMinutes(row.ageMinutes)}</span>
        </li>
      ))}
    </ul>
  )
}
