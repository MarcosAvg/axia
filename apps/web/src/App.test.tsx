import { render, screen } from '@testing-library/react'
import { App } from './App'

describe('pantalla de inicio', () => {
  it('muestra el nombre de la aplicación', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Axia' })).toBeInTheDocument()
  })
})
