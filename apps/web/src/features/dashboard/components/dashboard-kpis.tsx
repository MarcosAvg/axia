import { HintLabel } from '@/components/shared/hint'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { can, canAny } from '@/features/auth'
import type { Identity } from '@/features/auth'
import { formatRate, formatScore } from '@/features/metrics'
import type { SatisfactionSummary, SlaSummary } from '@/features/metrics'
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

function technicianKpis(work: WorkSummary): Kpi[] {
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
  const { work, offers, totals, sla, satisfaction } = input
  const isAdmin = canAny(identity, [
    'catalog.manage',
    'user.manage',
    'role.manage',
    'assignment.manage',
  ])
  const isSupervisor =
    can(identity, 'ticket.take_offer') ||
    can(identity, 'ticket.assign_technician')
  const isTechnician =
    can(identity, 'ticket.start') || can(identity, 'ticket.attend')

  if (isAdmin) return adminKpis(totals, sla, satisfaction)
  if (isTechnician) return technicianKpis(work)
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
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
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
  )
}
