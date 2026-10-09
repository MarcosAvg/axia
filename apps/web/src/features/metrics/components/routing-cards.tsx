import type { RoutingSummary } from '../domain/indicators'
import { formatMinutes } from '../domain/metrics'
import { metricsMessages } from '../i18n'
import { KpiGrid } from './metrics-kpis'
import type { Kpi } from './metrics-kpis'

/** Ofertas, pendientes, tomadas y tiempo medio hasta la toma. */
export function RoutingCards({ routing }: { routing: RoutingSummary }) {
  const t = metricsMessages.routing
  const cards: Kpi[] = [
    { label: t.offers, value: String(routing.offers) },
    { label: t.pending, value: String(routing.pendingOffers) },
    { label: t.taken, value: String(routing.taken) },
    { label: t.timeToTake, value: formatMinutes(routing.avgTimeToTakeMinutes) },
  ]
  return <KpiGrid cards={cards} columns={4} />
}
