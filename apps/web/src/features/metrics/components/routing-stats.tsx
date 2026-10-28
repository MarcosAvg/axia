import type { RoutingSummary } from '../domain/indicators'
import { formatMinutes } from '../domain/metrics'
import { metricsMessages } from '../i18n'

const t = metricsMessages.routing

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="text-xl font-semibold tabular-nums">{value}</dd>
    </div>
  )
}

/** Ruteo y toma como cifras compactas, sin tarjetas. */
export function RoutingStats({ routing }: { routing: RoutingSummary }) {
  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-3 gap-3">
        <Stat label={t.offers} value={String(routing.offers)} />
        <Stat label={t.taken} value={String(routing.taken)} />
        <Stat label={t.pending} value={String(routing.pendingOffers)} />
      </dl>
      <div className="flex items-center justify-between gap-3 border-t pt-2 text-xs">
        <span className="text-muted-foreground">{t.timeToTake}</span>
        <span className="font-medium tabular-nums">
          {formatMinutes(routing.avgTimeToTakeMinutes)}
        </span>
      </div>
    </div>
  )
}
