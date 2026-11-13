import { render, screen } from '@testing-library/react'
import { AuthContext, type AuthContextValue } from '@/features/auth'
import { MetricsDrillDownProvider } from '../drill-down-context'
import { EMPTY_FILTERS } from '../domain/metrics'
import { MetricCount } from './metric-count'

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

function renderCount(permissions: string[], disabled = false) {
  return render(
    <AuthContext.Provider value={authValue(permissions)}>
      <MetricsDrillDownProvider filters={EMPTY_FILTERS}>
        <MetricCount
          title="Ver tiquets"
          filters={{ status: 'paused' }}
          disabled={disabled}
        >
          7
        </MetricCount>
      </MetricsDrillDownProvider>
    </AuthContext.Provider>,
  )
}

describe('MetricCount', () => {
  it('abre el desglose cuando la persona puede ver tiquets', () => {
    renderCount(['ticket.view'])
    expect(
      screen.getByRole('button', { name: 'Ver tiquets' }),
    ).toBeInTheDocument()
  })

  it('deja el número como texto sin permiso de tiquets', () => {
    renderCount(['metrics.view'])
    expect(
      screen.queryByRole('button', { name: 'Ver tiquets' }),
    ).not.toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  it('no ofrece el desglose cuando el indicador está vacío', () => {
    renderCount(['ticket.view'], true)
    expect(
      screen.queryByRole('button', { name: 'Ver tiquets' }),
    ).not.toBeInTheDocument()
  })
})
