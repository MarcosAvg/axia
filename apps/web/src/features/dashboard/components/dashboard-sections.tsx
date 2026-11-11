import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { InboxIcon } from 'lucide-react'
import { EmptyState } from '@/components/shared/empty-state'
import { TicketList } from '@/features/tickets'
import type { DashboardData } from '../hooks/use-dashboard'
import type { DashboardCapabilities } from '../domain/kpis'
import { dashboardMessages as t } from '../i18n'
import { BandejaSection } from './bandeja-section'

const PREVIEW = 5

const linkClass =
  'inline-flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground'

function activeTitle(capabilities: DashboardCapabilities): string {
  if (capabilities.isSupervisor) return t.sections.team
  if (capabilities.isAdmin) return t.sections.active
  return t.sections.myActive
}

function offerSection(
  data: DashboardData,
  capabilities: DashboardCapabilities,
): ReactNode {
  if (!capabilities.canTakeOffer || data.offerItems.length === 0) return null
  return (
    <BandejaSection
      key="offers"
      title={t.sections.offers}
      action={
        <Link to="/inbox" className={linkClass}>
          {t.viewAll}
        </Link>
      }
    >
      <TicketList items={data.offerItems.slice(0, PREVIEW)} showElapsed />
    </BandejaSection>
  )
}

function myWorkSection(
  data: DashboardData,
  capabilities: DashboardCapabilities,
): ReactNode {
  if (!capabilities.isTechnician || data.myWorkItems.length === 0) return null
  return (
    <BandejaSection
      key="my-work"
      title={t.sections.myWork}
      action={
        <Link to="/mi-trabajo" className={linkClass}>
          {t.viewAll}
        </Link>
      }
    >
      <TicketList items={data.myWorkItems} showElapsed />
    </BandejaSection>
  )
}

function activeSection(
  data: DashboardData,
  capabilities: DashboardCapabilities,
): ReactNode {
  const canSeeTeam = capabilities.isSupervisor || capabilities.isAdmin
  if (!canSeeTeam || data.activeItems.length === 0) return null
  return (
    <BandejaSection
      key="active"
      title={activeTitle(capabilities)}
      action={
        <Link to="/tickets" search={{ page: 1 }} className={linkClass}>
          {t.viewAll}
        </Link>
      }
    >
      <TicketList items={data.activeItems} showElapsed />
    </BandejaSection>
  )
}

function requesterSection(
  data: DashboardData,
  capabilities: DashboardCapabilities,
): ReactNode {
  const requesterOnly =
    !capabilities.canTakeOffer &&
    !capabilities.isTechnician &&
    !capabilities.isSupervisor &&
    !capabilities.isAdmin
  if (!requesterOnly || data.activeItems.length === 0) return null
  return (
    <BandejaSection
      key="requester-active"
      title={t.sections.myActive}
      action={
        <Link to="/tickets" search={{ page: 1 }} className={linkClass}>
          {t.viewAll}
        </Link>
      }
    >
      <TicketList items={data.activeItems} showElapsed />
    </BandejaSection>
  )
}

/** Bandejas accionables del panel, según las capacidades de la persona. */
export function DashboardSections({
  data,
  capabilities,
}: {
  data: DashboardData
  capabilities: DashboardCapabilities
}) {
  const sections = [
    offerSection(data, capabilities),
    myWorkSection(data, capabilities),
    activeSection(data, capabilities),
    requesterSection(data, capabilities),
  ].filter((section): section is ReactNode => section !== null)

  if (sections.length === 0) {
    return <EmptyState icon={InboxIcon} title={t.empty.team} />
  }
  return <>{sections}</>
}
