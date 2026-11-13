import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '@/features/auth'
import type { DistributionProfileRow } from '../domain/metrics'
import type { TimeMode } from '../domain/time-mode'
import { DistributionSubsetMenu } from './distribution-subset-menu'

const { open } = vi.hoisted(() => ({ open: vi.fn() }))

vi.mock('../drill-down-context', () => ({
  useMetricsDrillDown: () => ({ open }),
}))

const row: DistributionProfileRow = {
  phase: 'active',
  n: 10,
  total: 20,
  coverage: 0.5,
  mean: 100,
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

function renderMenu({
  profile = row,
  mode = 'calendar',
  permissions = ['ticket.view'],
}: {
  profile?: DistributionProfileRow
  mode?: TimeMode
  permissions?: string[]
} = {}) {
  return render(
    <AuthContext.Provider value={authValue(permissions)}>
      <DistributionSubsetMenu
        row={profile}
        mode={mode}
        phaseLabel="Trabajo activo"
      />
    </AuthContext.Provider>,
  )
}

async function openMenu() {
  fireEvent.pointerDown(
    screen.getByRole('button', { name: 'Ver tiquets: Trabajo activo' }),
  )
  return screen.findByRole('menu')
}

describe('DistributionSubsetMenu', () => {
  beforeEach(() => {
    open.mockClear()
  })

  it('ofrece los subconjuntos con sus umbrales', async () => {
    renderMenu()
    await openMenu()

    expect(
      screen.getByRole('menuitem', { name: 'Todos (10)' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('menuitem', { name: 'Atípicos (2 de 10)' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('menuitem', { name: 'Por encima del P90 (3 h 20 min)' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('menuitem', { name: 'Por encima del P75 (2 h 30 min)' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('menuitem', {
        name: 'En el 50% central (50 min–2 h 30 min)',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('menuitem', {
        name: 'Por debajo de la mediana (1 h 40 min)',
      }),
    ).toBeInTheDocument()
  })

  it('abre el desglose con el filtro del subconjunto elegido', async () => {
    renderMenu()
    await openMenu()

    fireEvent.click(
      screen.getByRole('menuitem', { name: /Por encima del P90/ }),
    )

    expect(open).toHaveBeenCalledWith({
      title: 'Ver tiquets · Trabajo activo · Por encima del P90 (3 h 20 min)',
      filters: {
        phase: 'active',
        timeMode: 'calendar',
        phaseMinutesMin: 200,
      },
    })
  })

  it('solo ofrece todos cuando la muestra es insuficiente', async () => {
    renderMenu({ profile: { ...row, n: 4 } })
    await openMenu()

    expect(
      screen.getByRole('menuitem', { name: 'Todos (4)' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('menuitem', { name: /Por encima del P90/ }),
    ).not.toBeInTheDocument()
  })
})

describe('DistributionSubsetMenu availability', () => {
  it('no aparece sin permiso para ver tiquets', () => {
    renderMenu({ permissions: ['metrics.view'] })

    expect(
      screen.queryByRole('button', { name: 'Ver tiquets: Trabajo activo' }),
    ).not.toBeInTheDocument()
  })

  it('no aparece con el reloj Extra', () => {
    renderMenu({ mode: 'extra' })

    expect(
      screen.queryByRole('button', { name: 'Ver tiquets: Trabajo activo' }),
    ).not.toBeInTheDocument()
  })
})
