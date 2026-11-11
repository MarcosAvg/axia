import { offerRate } from '../domain/team'
import type { RoutingSummary } from '../domain/indicators'
import { formatMinutes, formatPercent } from '../domain/metrics'
import { metricsMessages } from '../i18n'

const t = metricsMessages.routing

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-xl font-semibold tabular-nums">{value}</dd>
    </div>
  )
}

/** Ruteo y toma como cifras compactas, sin tarjetas. */
export function RoutingStats({ routing }: { routing: RoutingSummary }) {
  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={t.offers} value={String(routing.offers)} />
        <Stat label={t.taken} value={String(routing.taken)} />
        <Stat label={t.pending} value={String(routing.pendingOffers)} />
        <Stat
          label={t.takeRate}
          value={formatPercent(offerRate(routing.taken, routing.offers))}
        />
      </dl>
      <div className="flex items-center justify-between gap-3 border-t pt-2 text-xs">
        <span className="text-muted-foreground">{t.timeToTakeContinuous}</span>
        <span className="font-medium tabular-nums">
          {formatMinutes(routing.avgTimeToTakeMinutes)}
        </span>
      </div>
    </div>
  )
}
