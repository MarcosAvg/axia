import { cn } from 'cn'
import { HintLabel } from '@/components/shared/hint'
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
  hint?: string
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

function technicianKpis(work: WorkSummary, summary: MetricsSummary): Kpi[] {
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
      label: k.activeTime,
      value: formatMinutes(summary.avgActive),
      hint: hints.activeTime,
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

function buildKpis(identity: Identity | null, input: KpiInput): Kpi[] {
  const { work, offers, totals, summary, sla, satisfaction } = input
  const isAdmin =
    can(identity, 'user.manage') || can(identity, 'catalog.manage')
  const isSupervisor =
    can(identity, 'ticket.take_offer') ||
    can(identity, 'ticket.assign_technician')
  const isTechnician =
    can(identity, 'ticket.start') || can(identity, 'ticket.attend')

  if (isAdmin) return adminKpis(totals, sla, satisfaction)
  if (isTechnician) return technicianKpis(work, summary)
  if (isSupervisor) return supervisorKpis(offers, totals, sla)
  return requesterKpis(totals)
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
                <HintLabel label={kpi.label} hint={kpi.hint} />
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
