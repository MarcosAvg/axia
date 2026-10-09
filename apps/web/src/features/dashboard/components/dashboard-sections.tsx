import { Link } from '@tanstack/react-router'
import { InboxIcon } from 'lucide-react'
import { EmptyState } from '@/components/shared/empty-state'
import { TicketList } from '@/features/tickets'
import type { DashboardData } from '../hooks/use-dashboard'
import { dashboardMessages as t } from '../i18n'
import { BandejaSection } from './bandeja-section'

const linkClass = 'text-sm text-muted-foreground hover:text-foreground'

/** Bandejas del panel: ofertas, mi trabajo y tiquets activos. */
export function DashboardSections({
  data,
  isSupervisor,
  isAdmin,
}: {
  data: DashboardData
  isSupervisor: boolean
  isAdmin: boolean
}) {
  const hasSection =
    data.offerItems.length > 0 ||
    data.workItems.length > 0 ||
    data.activeItems.length > 0

  if (!hasSection) {
    return <EmptyState icon={InboxIcon} title={t.empty.team} />
  }

  return (
    <>
      {data.offerItems.length > 0 ? (
        <BandejaSection
          title={t.sections.offers}
          action={
            <Link to="/inbox" className={linkClass}>
              {t.viewAll}
            </Link>
          }
        >
          <TicketList items={data.offerItems} />
        </BandejaSection>
      ) : null}

      {data.workItems.length > 0 ? (
        <BandejaSection
          title={t.sections.myWork}
          action={
            <Link to="/mi-trabajo" className={linkClass}>
              {t.viewAll}
            </Link>
          }
        >
          <TicketList items={data.workItems} />
        </BandejaSection>
      ) : null}

      {data.activeItems.length > 0 ? (
        <BandejaSection
          title={
            isSupervisor || isAdmin ? t.sections.team : t.sections.myActive
          }
          action={
            <Link to="/tickets" search={{ page: 1 }} className={linkClass}>
              {t.viewAll}
            </Link>
          }
        >
          <TicketList items={data.activeItems} />
        </BandejaSection>
      ) : null}
    </>
  )
}
