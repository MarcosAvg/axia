import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { can } from '@/features/auth'
import type { Identity } from '@/features/auth'
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
  value: number
}

function buildKpis(
  identity: Identity | null,
  work: WorkSummary,
  offers: number,
  totals: DashboardTotals,
): Kpi[] {
  const isAdmin =
    can(identity, 'user.manage') || can(identity, 'catalog.manage')
  const isSupervisor =
    can(identity, 'ticket.take_offer') ||
    can(identity, 'ticket.assign_technician')
  const isTechnician =
    can(identity, 'ticket.start') || can(identity, 'ticket.attend')

  if (isAdmin) {
    return [
      { label: t.kpi.active, value: totals.active },
      { label: t.kpi.unassigned, value: totals.unassigned },
      { label: t.kpi.paused, value: totals.paused },
      { label: t.kpi.closed, value: totals.closed },
    ]
  }
  if (isTechnician) {
    return [
      { label: t.kpi.myWork, value: work.total },
      { label: t.kpi.inProgress, value: work.inProgress },
      { label: t.kpi.paused, value: work.paused },
      { label: t.kpi.toValidate, value: work.attended },
    ]
  }
  if (isSupervisor) {
    return [
      { label: t.kpi.offers, value: offers },
      { label: t.kpi.active, value: totals.active },
      { label: t.kpi.paused, value: totals.paused },
      { label: t.kpi.toValidate, value: totals.attended },
    ]
  }
  return [
    { label: t.kpi.active, value: totals.active },
    { label: t.kpi.paused, value: totals.paused },
    { label: t.kpi.toValidate, value: totals.attended },
    { label: t.kpi.closed, value: totals.closed },
  ]
}

/** Tarjetas de números del usuario, según su rol. */
export function DashboardKpis({
  identity,
  work,
  offers,
  totals,
}: {
  identity: Identity | null
  work: WorkSummary
  offers: number
  totals: DashboardTotals
}) {
  const kpis = buildKpis(identity, work, offers, totals)

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label}>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {kpi.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{kpi.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
