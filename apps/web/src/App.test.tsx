import { render, screen } from '@testing-library/react'
import { App } from '@/App'
import { messages } from '@/lib/i18n'

describe('pantalla de inicio', () => {
  it('muestra el nombre de la aplicación y la acción principal', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: messages.app.name }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: messages.home.action }),
    ).toBeInTheDocument()
  })
})
