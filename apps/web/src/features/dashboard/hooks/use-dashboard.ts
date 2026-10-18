import { useQuery } from '@tanstack/react-query'
import {
  EMPTY_FILTERS,
  summarize,
  useMetricsTickets,
  useSla,
  useSatisfaction,
} from '@/features/metrics'
import type {
  MetricsSummary,
  MetricsTicket,
  SatisfactionSummary,
  SlaSummary,
} from '@/features/metrics'
import {
  ACTIVE_STATUSES,
  useMyOffers,
  useMyWork,
  useTicketsList,
} from '@/features/tickets'
import type { TicketListItem } from '@/features/tickets'
import { fetchRecentActivity } from '../api/dashboard-api'
import type { ActivityItem } from '../api/dashboard-api'
import { summarizeWork } from '../domain/summary'
import type { WorkSummary } from '../domain/summary'

const EMPTY_SLA: SlaSummary = {
  withTarget: 0,
  met: 0,
  complianceRate: null,
  avgTargetMinutes: null,
  avgResolutionMinutes: null,
}

const EMPTY_SATISFACTION: SatisfactionSummary = { average: null, ratings: 0 }

const PREVIEW = 5

interface PageLike {
  total: number
  items: TicketListItem[]
}

function or<T>(value: T | undefined, fallback: T): T {
  return value ?? fallback
}

function pageTotal(page: PageLike | undefined): number {
  return page ? page.total : 0
}

function pageItems(page: PageLike | undefined): TicketListItem[] {
  return page ? page.items : []
}

/** Actividad reciente visible para el usuario (RLS). */
function useRecentActivity() {
  return useQuery({
    queryKey: ['dashboard', 'activity'],
    queryFn: () => fetchRecentActivity(),
  })
}

export interface DashboardData {
  loading: boolean
  isError: boolean
  work: WorkSummary
  offerItems: TicketListItem[]
  activeItems: TicketListItem[]
  totals: {
    active: number
    paused: number
    attended: number
    unassigned: number
    closed: number
  }
  tickets: MetricsTicket[]
  summary: MetricsSummary
  sla: SlaSummary
  satisfaction: SatisfactionSummary
  activity: ActivityItem[]
}

/** Datos del panel: indicadores, tiquets activos y actividad (RLS limita). */
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
  const metrics = useMetricsTickets()
  const sla = useSla(EMPTY_FILTERS)
  const satisfaction = useSatisfaction(EMPTY_FILTERS)
  const activity = useRecentActivity()

  const tickets = or(metrics.data, [])
  const queries = [
    myWork,
    offers,
    active,
    paused,
    attended,
    unassigned,
    closed,
    metrics,
    sla.summary,
    satisfaction,
    activity,
  ]
  return {
    loading: queries.some((query) => query.isLoading),
    isError: queries.some((query) => query.isError),
    work: summarizeWork(myWork.data ?? []),
    offerItems: offers.data ?? [],
    activeItems: pageItems(active.data).slice(0, PREVIEW),
    totals: {
      active: pageTotal(active.data),
      paused: pageTotal(paused.data),
      attended: pageTotal(attended.data),
      unassigned: pageTotal(unassigned.data),
      closed: pageTotal(closed.data),
    },
    tickets,
    summary: summarize(tickets),
    sla: or(sla.summary.data, EMPTY_SLA),
    satisfaction: or(satisfaction.data, EMPTY_SATISFACTION),
    activity: or(activity.data, []),
  }
}
