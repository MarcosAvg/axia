import { Link } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { PlusIcon } from 'lucide-react'
import { ErrorAlert } from '@/components/shared/async-state'
import { PageHeader } from '@/components/shared/page-header'
import { ButtonGrid } from '@/components/shared/button-grid'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
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
    <ButtonGrid>
      {canCreate ? (
        <Button asChild className="col-span-2 min-h-11">
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
    </ButtonGrid>
  )
}

function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  )
}

/** Panel de inicio: indicadores, tiquets activos y actividad del usuario. */
export function Dashboard() {
  const { identity } = useAuth()
  const data = useDashboardData(identity?.userId)
  const queryClient = useQueryClient()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`${t.greeting}${identity ? `, ${identity.fullName}` : ''}`}
        description={t.subtitle}
        actions={<QuickActions canCreate={can(identity, 'ticket.create')} />}
      />
      {data.isError ? (
        <ErrorAlert
          message={t.error}
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                void queryClient.invalidateQueries()
              }}
            >
              {t.retry}
            </Button>
          }
        />
      ) : null}
      {data.loading ? (
        <DashboardLoading />
      ) : (
        <>
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
        </>
      )}
    </div>
  )
}
