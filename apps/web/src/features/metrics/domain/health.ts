import type { DimensionGroup } from './dimensions'
import { rowsByDimension } from './dimensions'
import type { SatisfactionSummary, SlaSummary } from './metrics'
import type { MetricsSummary } from './metrics-summary'

export interface HealthSnapshot {
  tickets: number
  active: number
  unassigned: number
  paused: number
  closed: number
  sla: number | null
  satisfaction: number | null
  firstFix: number
}

type HealthInput = {
  summary: Pick<
    MetricsSummary,
    'tickets' | 'open' | 'closed' | 'firstTimeFixRate'
  >
  groups: DimensionGroup[]
  sla: Pick<SlaSummary, 'complianceRate'>
  satisfaction: Pick<SatisfactionSummary, 'average'>
}

/** Cifras de la franja de salud, derivadas del resumen y de los estados. */
export function healthSnapshot(input: HealthInput): HealthSnapshot {
  const statuses = new Map(
    rowsByDimension(input.groups, 'status').map((row) => [row.id, row.tickets]),
  )
  const count = (status: string) => statuses.get(status) ?? 0
  return {
    tickets: input.summary.tickets,
    active: input.summary.open,
    unassigned: count('registered') + count('with_supervisor'),
    paused: count('paused'),
    closed: input.summary.closed,
    sla: input.sla.complianceRate,
    satisfaction: input.satisfaction.average,
    firstFix: input.summary.firstTimeFixRate,
  }
}
