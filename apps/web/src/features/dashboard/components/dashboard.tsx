import { Link } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { can, useAuth } from '@/features/auth'
import type { Identity } from '@/features/auth'
import { useDashboardData } from '../hooks/use-dashboard'
import { dashboardMessages as t } from '../i18n'
import { ActivitySection } from './activity-section'
import { DashboardCharts } from './dashboard-charts'
import { DashboardKpis } from './dashboard-kpis'
import { DashboardSections } from './dashboard-sections'
import type { DashboardRole } from './dashboard-sections'

function dashboardRole(identity: Identity | null): DashboardRole {
  if (can(identity, 'user.manage') || can(identity, 'catalog.manage')) {
    return 'admin'
  }
  if (can(identity, 'ticket.start') || can(identity, 'ticket.attend')) {
    return 'technician'
  }
  if (
    can(identity, 'ticket.take_offer') ||
    can(identity, 'ticket.assign_technician')
  ) {
    return 'supervisor'
  }
  return 'other'
}

function QuickActions({ canCreate }: { canCreate: boolean }) {
  const { identity } = useAuth()
  return (
    <div className="flex flex-wrap items-center gap-2">
      {canCreate ? (
        <Button asChild className="min-h-11">
          <Link to="/tickets/nuevo">
            <PlusIcon />
            {t.actions.newTicket}
          </Link>
        </Button>
      ) : null}
      <Button asChild variant="outline" className="min-h-11">
        <Link to="/tickets" search={{ page: 1 }}>
          {t.actions.tickets}
        </Link>
      </Button>
      {can(identity, 'metrics.view') ? (
        <Button asChild variant="outline" className="min-h-11">
          <Link to="/metricas">{t.actions.metrics}</Link>
        </Button>
      ) : null}
      {can(identity, 'catalog.manage') ? (
        <Button asChild variant="outline" className="min-h-11">
          <Link to="/admin">{t.actions.admin}</Link>
        </Button>
      ) : null}
    </div>
  )
}

/** Panel de inicio: indicadores, tiquets activos y actividad del usuario. */
export function Dashboard() {
  const { identity } = useAuth()
  const data = useDashboardData(identity?.userId)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`${t.greeting}${identity ? `, ${identity.fullName}` : ''}`}
        description={t.subtitle}
        actions={<QuickActions canCreate={can(identity, 'ticket.create')} />}
      />
      <DashboardKpis
        identity={identity}
        work={data.work}
        offers={data.offerItems.length}
        totals={data.totals}
        summary={data.summary}
        sla={data.sla}
        satisfaction={data.satisfaction}
      />
      <DashboardCharts tickets={data.tickets} />
      <ActivitySection items={data.activity} />
      <DashboardSections data={data} role={dashboardRole(identity)} />
    </div>
  )
}
