import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { InboxIcon } from 'lucide-react'
import { EmptyState } from '@/components/shared/empty-state'
import { TicketList } from '@/features/tickets'
import type { DashboardData } from '../hooks/use-dashboard'
import { dashboardMessages as t } from '../i18n'
import { BandejaSection } from './bandeja-section'

export type DashboardRole = 'admin' | 'technician' | 'supervisor' | 'other'

const linkClass = 'text-sm text-muted-foreground hover:text-foreground'

function activeTitle(role: DashboardRole): string {
  if (role === 'supervisor') return t.sections.team
  if (role === 'admin') return t.sections.active
  return t.sections.myActive
}

/** Bandejas del panel, según el rol. */
export function DashboardSections({
  data,
  role,
}: {
  data: DashboardData
  role: DashboardRole
}) {
  const sections: ReactNode[] = []

  if (
    (role === 'admin' || role === 'supervisor') &&
    data.offerItems.length > 0
  ) {
    sections.push(
      <BandejaSection
        key="offers"
        title={t.sections.offers}
        action={
          <Link to="/inbox" className={linkClass}>
            {t.viewAll}
          </Link>
        }
      >
        <TicketList items={data.offerItems} showElapsed />
      </BandejaSection>,
    )
  }

  if (data.activeItems.length > 0) {
    sections.push(
      <BandejaSection
        key="active"
        title={activeTitle(role)}
        action={
          <Link to="/tickets" search={{ page: 1 }} className={linkClass}>
            {t.viewAll}
          </Link>
        }
      >
        <TicketList items={data.activeItems} showElapsed />
      </BandejaSection>,
    )
  }

  if (sections.length === 0) {
    return <EmptyState icon={InboxIcon} title={t.empty.team} />
  }

  return <>{sections}</>
}
