import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { ThemeProvider } from '@/components/shared/theme-provider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthContext, authMessages } from '@/features/auth'
import type { AuthContextValue } from '@/features/auth'
import { adminMessages } from '@/features/admin'
import { messages } from '@/lib/i18n'
import { routeTree } from '@/routeTree.gen'

const noopAsync = () => Promise.resolve()

function makeAuthValue(
  overrides: Partial<AuthContextValue> = {},
): AuthContextValue {
  return {
    status: 'signed-out',
    session: null,
    identity: null,
    isIdentityLoading: false,
    signIn: noopAsync,
    signOut: noopAsync,
    refreshIdentity: noopAsync,
    ...overrides,
  }
}

const administrator = {
  userId: 'a1',
  fullName: 'Admin Demo',
  phone: null,
  active: true,
  roles: ['administrator'],
  permissions: [
    { permission: 'user.manage', scope: 'all' as const },
    { permission: 'catalog.manage', scope: 'all' as const },
  ],
  timezone: 'America/Mexico_City',
}

const supervisor = {
  userId: 'a2',
  fullName: 'Supervisor Demo',
  phone: null,
  active: true,
  roles: ['supervisor'],
  permissions: [{ permission: 'ticket.view', scope: 'buildings' as const }],
  timezone: 'America/Mexico_City',
}

function renderAtPath(path: string, auth: AuthContextValue) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  })

  render(
    <QueryClientProvider client={new QueryClient()}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthContext.Provider value={auth}>
            <RouterProvider router={router} />
          </AuthContext.Provider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  )
}

describe('enrutado y sesión', () => {
  it('sin sesión, "/" redirige a la pantalla de acceso', async () => {
    renderAtPath('/', makeAuthValue())

    expect(
      await screen.findByText(authMessages.login.title),
    ).toBeInTheDocument()
  })

  it('con sesión, "/" muestra el panel con el nombre y sus números', async () => {
    renderAtPath(
      '/',
      makeAuthValue({ status: 'signed-in', identity: administrator }),
    )

    expect(await screen.findByText(/Hola, Admin Demo/)).toBeInTheDocument()
    expect(screen.getByText('Sin asignar')).toBeInTheDocument()
  })

  it('con permiso, "/admin" muestra la administración', async () => {
    renderAtPath(
      '/admin',
      makeAuthValue({ status: 'signed-in', identity: administrator }),
    )

    expect(await screen.findByText(adminMessages.subtitle)).toBeInTheDocument()
  })

  it('sin el permiso, "/admin" avisa que no hay acceso', async () => {
    renderAtPath(
      '/admin',
      makeAuthValue({ status: 'signed-in', identity: supervisor }),
    )

    expect(
      await screen.findByText(authMessages.forbidden.title),
    ).toBeInTheDocument()
  })

  it('muestra "no encontrado" en una ruta inexistente', async () => {
    renderAtPath('/ruta-que-no-existe', makeAuthValue())

    expect(await screen.findByText(messages.notFound.title)).toBeInTheDocument()
  })
})
