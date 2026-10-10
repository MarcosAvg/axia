import { render, screen } from '@testing-library/react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { HintLabel } from './hint'

function renderWithProvider(node: React.ReactNode) {
  return render(<TooltipProvider>{node}</TooltipProvider>)
}

describe('HintLabel', () => {
  it('muestra el texto y el ícono de ayuda cuando hay explicación', () => {
    renderWithProvider(<HintLabel label="SLA" hint="Explicación del SLA." />)
    expect(screen.getByText('SLA')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Más información: SLA' }),
    ).toBeInTheDocument()
  })

  it('sin explicación solo muestra el texto', () => {
    renderWithProvider(<HintLabel label="SLA" />)
    expect(screen.getByText('SLA')).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
  })
})
