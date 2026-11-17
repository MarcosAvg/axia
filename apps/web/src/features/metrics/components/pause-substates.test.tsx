import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { TimeMode } from '../domain/time-mode'
import { PauseSubstates } from './pause-substates'

it.each([
  ['calendar', '2 h'],
  ['laboral', '45 min'],
  ['extra', '1 h 15 min'],
] satisfies Array<[TimeMode, string]>)(
  'muestra el acumulado en reloj %s sin cambiar el conteo',
  (mode, duration) => {
    render(
      <TooltipProvider>
        <PauseSubstates
          mode={mode}
          rows={[
            {
              id: 'paso',
              name: 'Esperando material',
              pauses: 1,
              pauseMinutes: 120,
              pauseLaborMinutes: 45,
            },
          ]}
        />
      </TooltipProvider>,
    )
    expect(screen.getByRole('cell', { name: duration })).toBeVisible()
    expect(screen.getByRole('cell', { name: '1' })).toBeVisible()
  },
)
