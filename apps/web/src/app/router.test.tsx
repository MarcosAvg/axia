import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { messages } from '@/lib/i18n'
import { routeTree } from '@/routeTree.gen'

function renderAtPath(path: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  })

  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

describe('enrutado', () => {
  it('renderiza la pantalla de inicio en "/"', async () => {
    renderAtPath('/')

    expect(
      await screen.findByRole('heading', { name: messages.app.name }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: messages.home.action }),
    ).toBeInTheDocument()
  })

  it('muestra "no encontrado" en una ruta inexistente', async () => {
    renderAtPath('/ruta-que-no-existe')

    expect(await screen.findByText(messages.notFound.title)).toBeInTheDocument()
  })
})
