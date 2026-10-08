import { toTicketError } from './errors'

describe('toTicketError', () => {
  it('mapea permiso insuficiente', () => {
    expect(toTicketError({ code: '42501' }).kind).toBe('permission')
  })

  it('mapea transición inválida', () => {
    expect(toTicketError({ code: 'P0001' }).kind).toBe('invalid-state')
  })

  it('mapea conflicto de unicidad', () => {
    expect(toTicketError({ code: '23505' }).kind).toBe('conflict')
  })

  it('mapea validación', () => {
    expect(toTicketError({ code: '22023' }).kind).toBe('validation')
  })

  it('mapea no encontrado', () => {
    expect(toTicketError({ code: 'P0002' }).kind).toBe('not-found')
  })

  it('cae en desconocido', () => {
    expect(toTicketError(new Error('red')).kind).toBe('unknown')
    expect(toTicketError(null).kind).toBe('unknown')
  })
})
