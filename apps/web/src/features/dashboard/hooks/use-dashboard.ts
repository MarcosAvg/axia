import { useQuery } from '@tanstack/react-query'
import {
  EMPTY_FILTERS,
  openAging,
  summarize,
  useMetricsTickets,
  useSla,
  useSatisfaction,
} from '@/features/metrics'
import type {
  AgingRow,
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
import { countByStatus, summarizeWork } from '../domain/summary'
import type { StatusCount, WorkSummary } from '../domain/summary'

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
  tickets: MetricsTicket[]
  summary: MetricsSummary
  statusCounts: StatusCount[]
  attention: AgingRow[]
  sla: SlaSummary
  satisfaction: SatisfactionSummary
  activity: ActivityItem[]
}

/** Datos del panel: números, bandejas y métricas del usuario (RLS limita). */
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
    tickets,
    summary: summarize(tickets),
    statusCounts: countByStatus(tickets),
    attention: openAging(tickets, new Date()).slice(0, PREVIEW),
    sla: or(sla.summary.data, EMPTY_SLA),
    satisfaction: or(satisfaction.data, EMPTY_SATISFACTION),
    activity: or(activity.data, []),
  }
}
