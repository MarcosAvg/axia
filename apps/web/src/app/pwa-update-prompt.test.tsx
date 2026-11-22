import { act, fireEvent, render, screen } from '@testing-library/react'
import { PwaUpdatePrompt } from './pwa-update-prompt'

const mock = vi.hoisted(() => ({
  register: vi.fn(),
  activate: vi.fn(async () => {}),
}))

vi.mock('virtual:pwa-register/react', () => ({ useRegisterSW: mock.register }))

type RegistrationOptions = {
  onRegisteredSW: (url: string, registration: ServiceWorkerRegistration) => void
}

function renderPrompt({ offlineReady = false, needRefresh = false } = {}) {
  mock.register.mockReturnValue({
    offlineReady: [offlineReady],
    needRefresh: [needRefresh],
    updateServiceWorker: mock.activate,
  })
  render(<PwaUpdatePrompt />)
  return mock.register.mock.calls[0]?.[0] as RegistrationOptions
}

beforeEach(() => vi.clearAllMocks())

it('solo ofrece actualizar si hay una nueva copia web instalada en espera', () => {
  const options = renderPrompt({ needRefresh: true })
  act(() =>
    options.onRegisteredSW('/sw.js', {
      waiting: null,
    } as ServiceWorkerRegistration),
  )
  expect(screen.queryByRole('button', { name: 'Actualizar' })).toBeNull()
  act(() =>
    options.onRegisteredSW('/sw.js', {
      waiting: {},
    } as ServiceWorkerRegistration),
  )
  fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }))
  expect(mock.activate).toHaveBeenCalledOnce()
})

it('anuncia una actualización aplicada en otra pestaña aunque el aviso inicial se haya cerrado', () => {
  const workers = Object.assign(new EventTarget(), { controller: {} })
  vi.stubGlobal('navigator', { onLine: true, serviceWorker: workers })
  try {
    renderPrompt({ offlineReady: true })
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByRole('status')).toBeNull()
    act(() => {
      workers.controller = {}
      workers.dispatchEvent(new Event('controllerchange'))
    })
    expect(screen.getByRole('button', { name: 'Actualizar' })).toBeVisible()
  } finally {
    vi.unstubAllGlobals()
  }
})
