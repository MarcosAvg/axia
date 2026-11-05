import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { InstanceSettings } from '../domain/settings'
import { SettingsForm } from './settings-form'

const api = vi.hoisted(() => ({
  fetchCalendars: vi.fn(),
  fetchPriorities: vi.fn(),
}))

vi.mock('@/lib/use-unsaved-changes-guard', () => ({
  useUnsavedChangesGuard: vi.fn(),
}))

vi.mock('../api/calendar-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/calendar-api')>()),
  fetchCalendars: api.fetchCalendars,
}))

vi.mock('@/features/catalogs/api/catalogs-api', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@/features/catalogs/api/catalogs-api')
  >()),
  fetchPriorities: api.fetchPriorities,
}))

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

function makeSettings(
  overrides: Partial<InstanceSettings> = {},
): InstanceSettings {
  return {
    teamLabel: 'Equipo',
    validationPolicy: 'both',
    autoValidationDays: 3,
    claimWindowDays: 2,
    requestEvidencePolicy: 'optional',
    folioPattern: 'AX-{yyyy}-{num}',
    timezone: 'America/Mexico_City',
    defaultCalendarId: 'calendar-1',
    slaClockMode: 'calendar',
    requesterVisibleEventTypes: ['created'],
    defaultPriorityId: 'priority-1',
    duplicateWindowDays: 5,
    duplicateSimilarity: 0.8,
    duplicateShownFields: ['folio'],
    ...overrides,
  }
}

function renderForm(settings: InstanceSettings, version = 0) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const view = render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <SettingsForm
          key={version}
          settings={settings}
          isSaving={false}
          onSave={() => {}}
        />
      </TooltipProvider>
    </QueryClientProvider>,
  )
  return {
    client,
    rerender: (next: InstanceSettings, nextVersion = version + 1) =>
      view.rerender(
        <QueryClientProvider client={client}>
          <TooltipProvider>
            <SettingsForm
              key={nextVersion}
              settings={next}
              isSaving={false}
              onSave={() => {}}
            />
          </TooltipProvider>
        </QueryClientProvider>,
      ),
  }
}

describe('SettingsForm', () => {
  beforeEach(() => {
    api.fetchCalendars.mockReset()
    api.fetchPriorities.mockReset()
  })

  it('muestra el calendario y la prioridad guardados cuando llegan tarde las opciones', async () => {
    const calendars = deferred<{ id: string; name: string }[]>()
    const priorities = deferred<{ id: string; name: string }[]>()
    api.fetchCalendars.mockReturnValue(calendars.promise)
    api.fetchPriorities.mockReturnValue(priorities.promise)

    renderForm(makeSettings())

    expect(
      screen.getByLabelText('Calendario laboral por defecto'),
    ).not.toHaveValue('calendar-1')
    expect(screen.getByLabelText('Prioridad por defecto')).not.toHaveValue(
      'priority-1',
    )

    calendars.resolve([
      { id: 'calendar-1', name: 'Oficina' },
      { id: 'calendar-2', name: 'Operación' },
    ])
    priorities.resolve([
      { id: 'priority-1', name: 'Alta' },
      { id: 'priority-2', name: 'Baja' },
    ])

    await waitFor(() =>
      expect(
        screen.getByLabelText('Calendario laboral por defecto'),
      ).toHaveValue('calendar-1'),
    )
    expect(screen.getByLabelText('Prioridad por defecto')).toHaveValue(
      'priority-1',
    )
  })

  it('habilita Guardar al editar y vuelve a quedar limpio al recibir nuevos ajustes', async () => {
    api.fetchCalendars.mockResolvedValue([
      { id: 'calendar-1', name: 'Oficina' },
    ])
    api.fetchPriorities.mockResolvedValue([{ id: 'priority-1', name: 'Alta' }])

    const { rerender } = renderForm(makeSettings())
    const teamLabel = () => screen.getByLabelText('Etiqueta de equipo')
    const save = () => screen.getByRole('button', { name: 'Guardar' })

    await waitFor(() =>
      expect(
        screen.getByLabelText('Calendario laboral por defecto'),
      ).toHaveValue('calendar-1'),
    )
    expect(save()).toBeDisabled()
    fireEvent.change(teamLabel(), { target: { value: 'Equipo editado' } })
    expect(save()).toBeEnabled()

    rerender(makeSettings({ teamLabel: 'Equipo guardado' }))

    await waitFor(() => expect(teamLabel()).toHaveValue('Equipo guardado'))
    expect(save()).toBeDisabled()

    fireEvent.change(teamLabel(), { target: { value: 'Equipo otra vez' } })
    expect(save()).toBeEnabled()
  })
})
