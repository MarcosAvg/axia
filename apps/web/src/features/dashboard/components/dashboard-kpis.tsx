import { cn } from 'cn'
import { ToneDot } from '@/components/shared/tone'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toneClasses, toneForIndex } from '@/lib/tones'
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
}

interface KpiInput {
  work: WorkSummary
  offers: number
  totals: DashboardTotals
  summary: MetricsSummary
  sla: SlaSummary
  satisfaction: SatisfactionSummary
}

function buildKpis(identity: Identity | null, input: KpiInput): Kpi[] {
  const { work, offers, totals, summary, sla, satisfaction } = input
  const isAdmin =
    can(identity, 'user.manage') || can(identity, 'catalog.manage')
  const isSupervisor =
    can(identity, 'ticket.take_offer') ||
    can(identity, 'ticket.assign_technician')
  const isTechnician =
    can(identity, 'ticket.start') || can(identity, 'ticket.attend')

  if (isAdmin) {
    return [
      { label: t.kpi.active, value: String(totals.active) },
      { label: t.kpi.unassigned, value: String(totals.unassigned) },
      { label: t.kpi.paused, value: String(totals.paused) },
      { label: t.kpi.closed, value: String(totals.closed) },
      { label: t.kpi.sla, value: formatRate(sla.complianceRate) },
      {
        label: t.kpi.satisfaction,
        value: formatScore(satisfaction.average),
      },
    ]
  }
  if (isTechnician) {
    return [
      { label: t.kpi.myWork, value: String(work.total) },
      { label: t.kpi.inProgress, value: String(work.inProgress) },
      { label: t.kpi.paused, value: String(work.paused) },
      { label: t.kpi.toValidate, value: String(work.attended) },
      { label: t.kpi.activeTime, value: formatMinutes(summary.avgActive) },
      {
        label: t.kpi.firstFix,
        value: formatPercent(summary.firstTimeFixRate),
      },
    ]
  }
  if (isSupervisor) {
    return [
      { label: t.kpi.offers, value: String(offers) },
      { label: t.kpi.unassigned, value: String(totals.unassigned) },
      { label: t.kpi.paused, value: String(totals.paused) },
      { label: t.kpi.toValidate, value: String(totals.attended) },
      { label: t.kpi.sla, value: formatRate(sla.complianceRate) },
    ]
  }
  return [
    { label: t.kpi.active, value: String(totals.active) },
    { label: t.kpi.paused, value: String(totals.paused) },
    { label: t.kpi.toValidate, value: String(totals.attended) },
    { label: t.kpi.closed, value: String(totals.closed) },
  ]
}

/** Tarjetas de números del usuario, según su rol. */
export function DashboardKpis({
  identity,
  ...input
}: KpiInput & { identity: Identity | null }) {
  const kpis = buildKpis(identity, input)

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {kpis.map((kpi, index) => {
        const tone = toneForIndex(index)
        return (
          <Card key={kpi.label}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <ToneDot tone={tone} />
                {kpi.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className={cn('text-2xl font-semibold', toneClasses[tone].text)}
              >
                {kpi.value}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
