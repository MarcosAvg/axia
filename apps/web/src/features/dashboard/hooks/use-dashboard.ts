import { useQuery } from '@tanstack/react-query'
import { can } from '@/features/auth'
import type { Identity } from '@/features/auth'
import {
  EMPTY_FILTERS,
  EMPTY_SUMMARY,
  useMetricsSummary,
  useSla,
  useSatisfaction,
} from '@/features/metrics'
import type {
  MetricsSummary,
  SatisfactionSummary,
  SlaSummary,
  VolumePoint,
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
  volume: VolumePoint[]
  summary: MetricsSummary
  sla: SlaSummary
  satisfaction: SatisfactionSummary
  activity: ActivityItem[]
}

/** Datos del panel: indicadores, tiquets activos y actividad según el rol. */
export function useDashboardData(identity: Identity | null): DashboardData {
  const userId = identity?.userId
  const canViewOffers = can(identity, 'ticket.take_offer')
  const canViewMetrics = can(identity, 'metrics.view')
  const myWork = useMyWork(userId, Boolean(identity?.technicianId))
  const offers = useMyOffers(userId, canViewOffers)
  const active = useTicketsList({ statuses: ACTIVE_STATUSES }, 1)
  const paused = useTicketsList({ statuses: ['paused'] }, 1)
  const attended = useTicketsList({ statuses: ['attended'] }, 1)
  const unassigned = useTicketsList(
    { statuses: ['registered', 'with_supervisor'] },
    1,
  )
  const closed = useTicketsList({ statuses: ['closed'] }, 1)
  const metrics = useMetricsSummary(EMPTY_FILTERS, { compact: true })
  const sla = useSla(EMPTY_FILTERS, canViewMetrics)
  const satisfaction = useSatisfaction(EMPTY_FILTERS, canViewMetrics)
  const activity = useRecentActivity()

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
    volume: or(metrics.data?.volume, []),
    summary: or(metrics.data?.summary, EMPTY_SUMMARY),
    sla: or(sla.summary.data, EMPTY_SLA),
    satisfaction: or(satisfaction.data, EMPTY_SATISFACTION),
    activity: or(activity.data, []),
  }
}
