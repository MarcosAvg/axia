import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { TimeMode } from '../domain/time-mode'
import { TechnicianTimes } from './technician-times'

it.each([
  ['calendar', '2 h'],
  ['laboral', '45 min'],
  ['extra', '1 h 15 min'],
] satisfies Array<[TimeMode, string]>)(
  'conserva el conteo de participación de un auxiliar en reloj %s',
  (mode, duration) => {
    render(
      <TooltipProvider>
        <TechnicianTimes
          technicians={[
            {
              technicianId: 'aux',
              name: 'Técnico auxiliar',
              tickets: 4,
              leaderCount: 0,
              auxiliaryCount: 4,
              participationMinutes: 120,
              participationLaborMinutes: 45,
              participationExtraMinutes: 75,
              assignedCount: 0,
            },
          ]}
          times={[]}
          subjectTimes={[
            {
              technicianId: 'aux',
              name: 'Técnico auxiliar',
              attributedTickets: 2,
              activeMinutes: 30,
              activeLaborMinutes: 15,
              pauseMinutes: 0,
              pauseLaborMinutes: 0,
              waitMinutes: 0,
              waitLaborMinutes: 0,
            },
          ]}
          mode={mode}
        />
      </TooltipProvider>,
    )

    const row = within(screen.getByRole('row', { name: /Técnico auxiliar/ }))
    expect(row.getByRole('cell', { name: '4' })).toBeVisible()
    expect(row.getByRole('cell', { name: duration })).toBeVisible()
    expect(row.getAllByRole('cell')).toHaveLength(7)
    expect(row.getByRole('cell', { name: '0' })).toBeVisible()
    expect(row.getAllByRole('cell', { name: '—' })).toHaveLength(2)
    expect(
      row.getByRole('cell', {
        name: mode === 'calendar' ? '30 min' : '15 min',
      }),
    ).toBeVisible()
    fireEvent.click(row.getByRole('button', { name: 'Técnico auxiliar' }))
    const detail = within(
      screen.getByRole('dialog', { name: 'Técnico auxiliar' }),
    )
    expect(detail.getByText('Pausa acumulada')).toBeVisible()
    expect(detail.getByText('Espera de inicio acumulada')).toBeVisible()
    expect(detail.getByText('Sin tiempos de tiquets liderados.')).toBeVisible()
  },
)
