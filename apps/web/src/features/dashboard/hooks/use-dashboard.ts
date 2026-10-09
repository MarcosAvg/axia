import {
  ACTIVE_STATUSES,
  useMyOffers,
  useMyWork,
  useTicketsList,
} from '@/features/tickets'
import type { TicketListItem } from '@/features/tickets'
import { summarizeWork } from '../domain/summary'
import type { WorkSummary } from '../domain/summary'

export interface DashboardData {
  work: WorkSummary
  offerItems: TicketListItem[]
  workItems: TicketListItem[]
  activeItems: TicketListItem[]
  totals: {
    active: number
    paused: number
    attended: number
    unassigned: number
    closed: number
  }
}

const PREVIEW = 5

interface PageLike {
  total: number
  items: TicketListItem[]
}

function pageTotal(page: PageLike | undefined): number {
  return page ? page.total : 0
}

function pageItems(page: PageLike | undefined): TicketListItem[] {
  return page ? page.items : []
}

/** Datos del panel: números y bandejas del usuario (RLS ya limita lo que ve). */
export function useDashboardData(userId: string | undefined): DashboardData {
  const myWork = useMyWork(userId)
  const offers = useMyOffers(userId)
  const active = useTicketsList({ statuses: ACTIVE_STATUSES }, 1)
  const paused = useTicketsList({ statuses: ['paused'] }, 1)
  const attended = useTicketsList({ statuses: ['attended'] }, 1)
  const unassigned = useTicketsList(
    { statuses: ['registered', 'with_supervisor'] },
    1,
  )
  const closed = useTicketsList({ statuses: ['closed'] }, 1)

  return {
    work: summarizeWork(myWork.data ?? []),
    offerItems: offers.data ?? [],
    workItems: myWork.data ?? [],
    activeItems: pageItems(active.data).slice(0, PREVIEW),
    totals: {
      active: pageTotal(active.data),
      paused: pageTotal(paused.data),
      attended: pageTotal(attended.data),
      unassigned: pageTotal(unassigned.data),
      closed: pageTotal(closed.data),
    },
  }
}
