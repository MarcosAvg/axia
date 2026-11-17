import { fireEvent, render, screen } from '@testing-library/react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { EMPTY_SUMMARY } from '../domain/metrics'
import { CycleComposition } from './cycle-composition'

it('muestra el tiempo y porcentaje de la fase del modo laboral', async () => {
  render(
    <TooltipProvider>
      <CycleComposition
        summary={{
          ...EMPTY_SUMMARY,
          avgTotalLabor: 60,
          avgActiveLabor: 30,
          avgPauseLabor: 30,
        }}
        measure="average"
        mode="laboral"
      />
    </TooltipProvider>,
  )
  fireEvent.focus(screen.getByRole('button', { name: /Trabajo activo/ }))
  expect(await screen.findByRole('tooltip')).toHaveTextContent(
    'Trabajo activo: 30 min (50%)',
  )
})
