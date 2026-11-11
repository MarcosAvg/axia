import { describe, expect, it } from 'vitest'
import type { SatisfactionSummary, SlaSummary } from '@/features/metrics'
import type { WorkSummary } from './summary'
import { buildDashboardKpis, type DashboardCapabilities } from './kpis'

const work: WorkSummary = {
  total: 8,
  inProgress: 3,
  paused: 2,
  attended: 1,
}

const totals = {
  active: 12,
  paused: 4,
  attended: 3,
  unassigned: 5,
  closed: 20,
}

const sla: SlaSummary = {
  withTarget: 10,
  met: 8,
  complianceRate: 0.8,
  avgTargetMinutes: 60,
  avgResolutionMinutes: 50,
}

const satisfaction: SatisfactionSummary = { average: 4.5, ratings: 12 }

const admin: DashboardCapabilities = {
  canTakeOffer: true,
  isTechnician: false,
  isSupervisor: true,
  isAdmin: true,
  canViewMetrics: true,
}

const technician: DashboardCapabilities = {
  canTakeOffer: false,
  isTechnician: true,
  isSupervisor: false,
  isAdmin: false,
  canViewMetrics: false,
}

const requester: DashboardCapabilities = {
  canTakeOffer: false,
  isTechnician: false,
  isSupervisor: false,
  isAdmin: false,
  canViewMetrics: false,
}

function keys(capabilities: DashboardCapabilities) {
  return buildDashboardKpis({
    capabilities,
    work,
    offers: 2,
    totals,
    sla,
    satisfaction,
  }).map((kpi) => kpi.key)
}

describe('buildDashboardKpis', () => {
  it('compone la bandeja del administrador con atención y métricas', () => {
    expect(keys(admin)).toEqual([
      'offers',
      'unassigned',
      'attended',
      'paused',
      'sla',
      'satisfaction',
    ])
  })

  it('muestra el trabajo propio al técnico', () => {
    expect(keys(technician)).toEqual([
      'myWork',
      'inProgress',
      'attended',
      'paused',
    ])
  })

  it('mantiene una bandeja simple para el solicitante', () => {
    expect(keys(requester)).toEqual(['active', 'attended', 'paused', 'closed'])
  })

  it('combina ofertas y trabajo propio cuando la persona tiene ambos roles', () => {
    const result = keys({
      ...technician,
      canTakeOffer: true,
      isSupervisor: true,
      canViewMetrics: true,
    })
    expect(result).toContain('offers')
    expect(result).toContain('myWork')
    expect(result).toHaveLength(6)
  })

  it('enlaza cada cifra con su bandeja', () => {
    const result = buildDashboardKpis({
      capabilities: admin,
      work,
      offers: 2,
      totals,
      sla,
      satisfaction,
    })
    expect(result.find((kpi) => kpi.key === 'offers')?.target).toEqual({
      to: '/inbox',
    })
    expect(result.find((kpi) => kpi.key === 'paused')?.target).toEqual({
      to: '/tickets',
      status: 'paused',
    })
    expect(result.find((kpi) => kpi.key === 'sla')?.target).toEqual({
      to: '/metricas',
    })
  })
})
