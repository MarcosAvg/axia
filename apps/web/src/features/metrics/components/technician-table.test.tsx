import { render, screen } from '@testing-library/react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthContext, type AuthContextValue } from '@/features/auth'
import { MetricsDrillDownProvider } from '../drill-down-context'
import type { TechnicianRow } from '../domain/indicators'
import { EMPTY_FILTERS } from '../domain/metrics'
import { TechnicianTable } from './technician-table'

function authValue(permissions: string[]): AuthContextValue {
  return {
    status: 'signed-in',
    session: null,
    identity: {
      userId: 'user-1',
      username: 'demo',
      fullName: 'Demo',
      roles: [],
      permissions: permissions.map((permission) => ({
        permission,
        scope: 'all',
      })),
    },
    isIdentityLoading: false,
    isOfflineSession: false,
    signIn: async () => undefined,
    signOut: async () => undefined,
    refreshIdentity: async () => undefined,
  } as unknown as AuthContextValue
}

const ROWS: TechnicianRow[] = [
  {
    technicianId: 'tech-1',
    name: 'Ana López',
    tickets: 3,
    leaderCount: 2,
    auxiliaryCount: 1,
    participationMinutes: 120,
    participationLaborMinutes: 60,
    participationExtraMinutes: 60,
    assignedCount: 2,
  },
]

function renderTable() {
  return render(
    <AuthContext.Provider value={authValue(['metrics.view', 'ticket.view'])}>
      <TooltipProvider>
        <MetricsDrillDownProvider filters={EMPTY_FILTERS}>
          <TechnicianTable rows={ROWS} mode="calendar" />
        </MetricsDrillDownProvider>
      </TooltipProvider>
    </AuthContext.Provider>,
  )
}

function headers() {
  return screen
    .getAllByRole('columnheader')
    .map((cell) => cell.textContent?.trim())
}

describe('TechnicianTable', () => {
  it('deja tiquets, líder, auxiliar y participación sin fuera de horario ni asignados', () => {
    renderTable()
    expect(headers()).toEqual([
      'Técnico',
      'Tiquets',
      'Como líder',
      'Como auxiliar',
      'Participación',
    ])
  })
})
