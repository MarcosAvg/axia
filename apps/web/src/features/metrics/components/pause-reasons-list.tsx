import type { PauseReasonRow } from '../domain/metrics'
import { metricsMessages } from '../i18n'
import { MetricCount } from './metric-count'

const t = metricsMessages.quality

/** Motivos de pausa con acceso a los tiquets que los componen. */
export function PauseReasonsList({ rows }: { rows: PauseReasonRow[] }) {
  if (rows.length === 0) return null
  const sorted = [...rows].sort((left, right) => right.pauses - left.pauses)
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-medium text-muted-foreground">
        {t.pausesTab}
      </h3>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {sorted.map((row) => (
          <li key={row.reasonId} className="inline-flex items-baseline gap-1.5">
            <MetricCount
              title={`${metricsMessages.drillDown.label} · ${row.reasonName}`}
              filters={{ pauseReasonId: row.reasonId }}
            >
              {row.reasonName}
            </MetricCount>
            <MetricCount
              title={`${metricsMessages.drillDown.label} · ${row.reasonName}`}
              filters={{ pauseReasonId: row.reasonId }}
              disabled={row.pauses === 0}
              className="tabular-nums text-muted-foreground"
            >
              {row.pauses}
            </MetricCount>
          </li>
        ))}
      </ul>
    </div>
  )
}
