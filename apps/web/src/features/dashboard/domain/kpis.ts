import { formatRate, formatScore } from '@/features/metrics'
import type { SatisfactionSummary, SlaSummary } from '@/features/metrics'
import type { TicketStatus } from '@/features/tickets'
import type { WorkSummary } from './summary'

export interface DashboardTotals {
  active: number
  paused: number
  attended: number
  unassigned: number
  closed: number
}

export interface DashboardCapabilities {
  canTakeOffer: boolean
  isTechnician: boolean
  isSupervisor: boolean
  isAdmin: boolean
  canViewMetrics: boolean
}

export type DashboardKpiKey =
  | 'offers'
  | 'myWork'
  | 'inProgress'
  | 'unassigned'
  | 'attended'
  | 'paused'
  | 'active'
  | 'sla'
  | 'satisfaction'
  | 'closed'

export type DashboardKpiTarget =
  | { to: '/inbox' }
  | { to: '/mi-trabajo' }
  | { to: '/metricas' }
  | { to: '/tickets'; status?: TicketStatus }

export interface DashboardKpi {
  key: DashboardKpiKey
  value: string
  target: DashboardKpiTarget
}

interface KpiInput {
  capabilities: DashboardCapabilities
  work: WorkSummary
  offers: number
  totals: DashboardTotals
  sla: SlaSummary
  satisfaction: SatisfactionSummary
}

function requesterKpis(totals: DashboardTotals): DashboardKpi[] {
  return [
    { key: 'active', value: String(totals.active), target: { to: '/tickets' } },
    {
      key: 'attended',
      value: String(totals.attended),
      target: { to: '/tickets', status: 'attended' },
    },
    {
      key: 'paused',
      value: String(totals.paused),
      target: { to: '/tickets', status: 'paused' },
    },
    {
      key: 'closed',
      value: String(totals.closed),
      target: { to: '/tickets', status: 'closed' },
    },
  ]
}

function identityKpis(
  capabilities: DashboardCapabilities,
  work: WorkSummary,
  offers: number,
  totals: DashboardTotals,
): DashboardKpi[] {
  const kpis: DashboardKpi[] = []
  if (capabilities.canTakeOffer) {
    kpis.push({
      key: 'offers',
      value: String(offers),
      target: { to: '/inbox' },
    })
  }
  if (capabilities.isTechnician) {
    kpis.push(
      {
        key: 'myWork',
        value: String(work.total),
        target: { to: '/mi-trabajo' },
      },
      {
        key: 'inProgress',
        value: String(work.inProgress),
        target: { to: '/mi-trabajo' },
      },
    )
  }
  if (capabilities.isSupervisor || capabilities.isAdmin) {
    kpis.push({
      key: 'unassigned',
      value: String(totals.unassigned),
      target: { to: '/tickets', status: 'registered' },
    })
  }
  return kpis
}

function sharedKpis(
  capabilities: DashboardCapabilities,
  totals: DashboardTotals,
  sla: SlaSummary,
  satisfaction: SatisfactionSummary,
): DashboardKpi[] {
  const kpis: DashboardKpi[] = [
    {
      key: 'attended',
      value: String(totals.attended),
      target: { to: '/tickets', status: 'attended' },
    },
    {
      key: 'paused',
      value: String(totals.paused),
      target: { to: '/tickets', status: 'paused' },
    },
  ]
  if (capabilities.canViewMetrics) {
    kpis.push({
      key: 'sla',
      value: formatRate(sla.complianceRate),
      target: { to: '/metricas' },
    })
  }
  if (capabilities.isAdmin && capabilities.canViewMetrics) {
    kpis.push({
      key: 'satisfaction',
      value: formatScore(satisfaction.average),
      target: { to: '/metricas' },
    })
  }
  return kpis
}

function isRequesterOnly(capabilities: DashboardCapabilities): boolean {
  return (
    !capabilities.canTakeOffer &&
    !capabilities.isTechnician &&
    !capabilities.isSupervisor &&
    !capabilities.isAdmin
  )
}

/** Cifras accionables del panel, ordenadas por urgencia y capacidad. */
export function buildDashboardKpis(input: KpiInput): DashboardKpi[] {
  const { capabilities, work, offers, totals, sla, satisfaction } = input
  if (isRequesterOnly(capabilities)) return requesterKpis(totals)
  return [
    ...identityKpis(capabilities, work, offers, totals),
    ...sharedKpis(capabilities, totals, sla, satisfaction),
  ].slice(0, 6)
}
