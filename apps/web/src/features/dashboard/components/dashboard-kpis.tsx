import { Link } from '@tanstack/react-router'
import { cn } from 'cn'
import { HintLabel } from '@/components/shared/hint'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { SatisfactionSummary, SlaSummary } from '@/features/metrics'
import type {
  DashboardCapabilities,
  DashboardKpiKey,
  DashboardKpiTarget,
  DashboardTotals,
} from '../domain/kpis'
import { buildDashboardKpis } from '../domain/kpis'
import type { WorkSummary } from '../domain/summary'
import { dashboardMessages as t } from '../i18n'

const k = t.kpi
const hints = t.kpiHints

const COPY: Record<DashboardKpiKey, { label: string; hint: string }> = {
  offers: { label: k.offers, hint: hints.offers },
  myWork: { label: k.myWork, hint: hints.myWork },
  inProgress: { label: k.inProgress, hint: hints.inProgress },
  unassigned: { label: k.unassigned, hint: hints.unassigned },
  attended: { label: k.toValidate, hint: hints.toValidate },
  paused: { label: k.paused, hint: hints.paused },
  active: { label: k.active, hint: hints.active },
  sla: { label: k.sla, hint: hints.sla },
  satisfaction: { label: k.satisfaction, hint: hints.satisfaction },
  closed: { label: k.closed, hint: hints.closed },
}

function KpiLink({
  target,
  children,
}: {
  target: DashboardKpiTarget
  children: React.ReactNode
}) {
  const className =
    'block h-full rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring'
  if (target.to === '/tickets') {
    return (
      <Link
        to="/tickets"
        search={{ status: target.status, page: 1 }}
        className={className}
      >
        {children}
      </Link>
    )
  }
  return (
    <Link to={target.to} className={className}>
      {children}
    </Link>
  )
}

/** Tarjetas de números accionables del panel, según capacidades. */
export function DashboardKpis({
  capabilities,
  work,
  offers,
  totals,
  sla,
  satisfaction,
}: {
  capabilities: DashboardCapabilities
  work: WorkSummary
  offers: number
  totals: DashboardTotals
  sla: SlaSummary
  satisfaction: SatisfactionSummary
}) {
  const kpis = buildDashboardKpis({
    capabilities,
    work,
    offers,
    totals,
    sla,
    satisfaction,
  })
  const columns =
    kpis.length >= 6
      ? 'xl:grid-cols-6'
      : kpis.length === 5
        ? 'xl:grid-cols-5'
        : 'xl:grid-cols-4'
  return (
    <div className={cn('grid grid-cols-2 gap-3 lg:grid-cols-3', columns)}>
      {kpis.map((kpi) => {
        const copy = COPY[kpi.key]
        return (
          <KpiLink key={kpi.key} target={kpi.target}>
            <Card className="h-full transition-colors hover:bg-muted/30">
              <CardHeader className="min-h-16">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  <HintLabel label={copy.label} hint={copy.hint} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums">
                  {kpi.value}
                </p>
              </CardContent>
            </Card>
          </KpiLink>
        )
      })}
    </div>
  )
}
