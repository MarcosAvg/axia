import { AggregationToggle } from '@/components/shared/aggregation-toggle'
import { HintLabel } from '@/components/shared/hint'
import { useTimeAggregation } from '@/components/shared/time-aggregation-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { messages } from '@/lib/i18n'
import {
  aggregationHint,
  aggregationLabel,
  timeValue,
} from '@/lib/time-aggregation'
import type { TimeAggregation } from '@/lib/time-aggregation'
import { can } from '@/features/auth'
import type { Identity } from '@/features/auth'
import {
  formatMinutes,
  formatPercent,
  formatRate,
  formatScore,
} from '@/features/metrics'
import type {
  MetricsSummary,
  SatisfactionSummary,
  SlaSummary,
} from '@/features/metrics'
import type { WorkSummary } from '../domain/summary'
import { dashboardMessages as t } from '../i18n'

interface DashboardTotals {
  active: number
  paused: number
  attended: number
  unassigned: number
  closed: number
}

interface Kpi {
  label: string
  value: string
  hint?: string
  /** Indicador de tiempo: cambia entre promedio y acumulado. */
  temporal?: boolean
}

interface KpiInput {
  work: WorkSummary
  offers: number
  totals: DashboardTotals
  summary: MetricsSummary
  sla: SlaSummary
  satisfaction: SatisfactionSummary
}

const k = t.kpi
const hints = t.kpiHints

function adminKpis(
  totals: DashboardTotals,
  sla: SlaSummary,
  satisfaction: SatisfactionSummary,
): Kpi[] {
  return [
    { label: k.active, value: String(totals.active), hint: hints.active },
    {
      label: k.unassigned,
      value: String(totals.unassigned),
      hint: hints.unassigned,
    },
    { label: k.paused, value: String(totals.paused), hint: hints.paused },
    { label: k.closed, value: String(totals.closed), hint: hints.closed },
    { label: k.sla, value: formatRate(sla.complianceRate), hint: hints.sla },
    {
      label: k.satisfaction,
      value: formatScore(satisfaction.average),
      hint: hints.satisfaction,
    },
  ]
}

function technicianKpis(
  work: WorkSummary,
  summary: MetricsSummary,
  aggregation: TimeAggregation,
): Kpi[] {
  return [
    { label: k.myWork, value: String(work.total), hint: hints.myWork },
    {
      label: k.inProgress,
      value: String(work.inProgress),
      hint: hints.inProgress,
    },
    { label: k.paused, value: String(work.paused), hint: hints.paused },
    {
      label: k.toValidate,
      value: String(work.attended),
      hint: hints.toValidate,
    },
    {
      label: aggregationLabel(k.activeTime, aggregation),
      value: formatMinutes(
        timeValue(aggregation, summary.avgActive, summary.sumActive),
      ),
      hint: aggregationHint(hints.activeTime, aggregation),
      temporal: true,
    },
    {
      label: k.firstFix,
      value: formatPercent(summary.firstTimeFixRate),
      hint: hints.firstFix,
    },
  ]
}

function supervisorKpis(
  offers: number,
  totals: DashboardTotals,
  sla: SlaSummary,
): Kpi[] {
  return [
    { label: k.offers, value: String(offers), hint: hints.offers },
    {
      label: k.unassigned,
      value: String(totals.unassigned),
      hint: hints.unassigned,
    },
    { label: k.paused, value: String(totals.paused), hint: hints.paused },
    {
      label: k.toValidate,
      value: String(totals.attended),
      hint: hints.toValidate,
    },
    { label: k.sla, value: formatRate(sla.complianceRate), hint: hints.sla },
  ]
}

function requesterKpis(totals: DashboardTotals): Kpi[] {
  return [
    { label: k.active, value: String(totals.active), hint: hints.active },
    { label: k.paused, value: String(totals.paused), hint: hints.paused },
    {
      label: k.toValidate,
      value: String(totals.attended),
      hint: hints.toValidate,
    },
    { label: k.closed, value: String(totals.closed), hint: hints.closed },
  ]
}

function buildKpis(
  identity: Identity | null,
  input: KpiInput,
  aggregation: TimeAggregation,
): Kpi[] {
  const { work, offers, totals, summary, sla, satisfaction } = input
  const isAdmin =
    can(identity, 'user.manage') || can(identity, 'catalog.manage')
  const isSupervisor =
    can(identity, 'ticket.take_offer') ||
    can(identity, 'ticket.assign_technician')
  const isTechnician =
    can(identity, 'ticket.start') || can(identity, 'ticket.attend')

  if (isAdmin) return adminKpis(totals, sla, satisfaction)
  if (isTechnician) return technicianKpis(work, summary, aggregation)
  if (isSupervisor) return supervisorKpis(offers, totals, sla)
  return requesterKpis(totals)
}

/** Tarjetas de números del usuario, según su rol. */
export function DashboardKpis({
  identity,
  ...input
}: KpiInput & { identity: Identity | null }) {
  const { aggregation } = useTimeAggregation()
  const kpis = buildKpis(identity, input, aggregation)
  const showToggle = kpis.some((kpi) => kpi.temporal)

  return (
    <div className="flex flex-col gap-3">
      {showToggle ? (
        <div className="flex items-center justify-end gap-2">
          <span className="text-sm text-muted-foreground">
            {messages.aggregation.label}
          </span>
          <AggregationToggle />
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="min-h-16">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                <HintLabel label={kpi.label} hint={kpi.hint} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
