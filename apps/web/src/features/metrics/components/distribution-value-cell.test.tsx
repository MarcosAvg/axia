import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '@/features/auth'
import type { DistributionColumn } from '../domain/distribution-drill-down'
import type { DistributionProfileRow } from '../domain/metrics'
import type { TimeMode } from '../domain/time-mode'
import { DistributionValueCell } from './distribution-value-cell'

const { open } = vi.hoisted(() => ({ open: vi.fn() }))

vi.mock('../drill-down-context', () => ({
  useMetricsDrillDown: () => ({ open }),
}))

const row: DistributionProfileRow = {
  phase: 'active',
  n: 10,
  total: 20,
  coverage: 0.5,
  mean: 120,
  median: 100,
  p25: 50,
  p75: 150,
  p90: 200,
  p95: 220,
  max: 300,
  lowerFence: -100,
  upperFence: 300,
  outliers: 2,
  outlierRate: 0.2,
}

function authValue(permissions = ['ticket.view']): AuthContextValue {
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

function renderCell({
  column = 'p90',
  mode = 'calendar',
  enough = true,
  alwaysShow = false,
  children = '3 h 20 min',
  permissions = ['ticket.view'],
}: {
  column?: DistributionColumn
  mode?: TimeMode
  enough?: boolean
  alwaysShow?: boolean
  children?: string
  permissions?: string[]
} = {}) {
  return render(
    <AuthContext.Provider value={authValue(permissions)}>
      <DistributionValueCell
        row={row}
        mode={mode}
        column={column}
        phaseLabel="Trabajo activo"
        enough={enough}
        alwaysShow={alwaysShow}
      >
        {children}
      </DistributionValueCell>
    </AuthContext.Provider>,
  )
}

describe('DistributionValueCell', () => {
  beforeEach(() => {
    open.mockClear()
  })

  it('abre el subconjunto del valor con su inverso', () => {
    renderCell()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Ver tiquets · Trabajo activo · Hasta el P90 (≤ 3 h 20 min)',
      }),
    )

    expect(open).toHaveBeenCalledWith({
      title: 'Ver tiquets · Trabajo activo · Hasta el P90 (≤ 3 h 20 min)',
      filters: {
        phase: 'active',
        timeMode: 'calendar',
        phaseMinutesMax: 200,
      },
      alternate: {
        title:
          'Ver tiquets · Trabajo activo · Por encima del P90 (> 3 h 20 min)',
        filters: {
          phase: 'active',
          timeMode: 'calendar',
          phaseMinutesAbove: 200,
        },
      },
    })
  })

  it('oculta el valor sin muestra suficiente', () => {
    renderCell({ enough: false })

    expect(screen.getByText('—')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Hasta el P90/ }),
    ).not.toBeInTheDocument()
  })

  it('muestra la media sin muestra suficiente pero sin abrirla', () => {
    renderCell({
      column: 'mean',
      enough: false,
      alwaysShow: true,
      children: '2 h',
    })

    expect(screen.getByText('2 h')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Hasta la media/ }),
    ).not.toBeInTheDocument()
  })

  it('muestra el valor como texto cuando el reloj no tiene desglose', () => {
    renderCell({ mode: 'extra' })

    expect(screen.getByText('3 h 20 min')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('muestra el valor como texto sin permiso para ver tiquets', () => {
    renderCell({ permissions: ['metrics.view'] })

    expect(screen.getByText('3 h 20 min')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
