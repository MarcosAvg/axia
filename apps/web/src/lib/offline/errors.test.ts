import { isNetworkError } from './errors'

describe('isNetworkError', () => {
  it('reconoce un TypeError de fetch', () => {
    expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true)
  })

  it('reconoce el mensaje de fallo de red en un objeto', () => {
    expect(isNetworkError({ message: 'NetworkError when ...' })).toBe(true)
    expect(isNetworkError(new Error('fetch failed'))).toBe(true)
    expect(isNetworkError(new Error('Load failed'))).toBe(true)
  })

  it('no confunde un error de dominio con uno de red', () => {
    expect(
      isNetworkError({ code: 'P0001', message: 'El tiquet ya cambió' }),
    ).toBe(false)
    expect(isNetworkError(new Error('Permiso insuficiente'))).toBe(false)
  })
})

it('distingue indisponibilidad del servidor de un conflicto de negocio', async () => {
  const { isRetryableOutboxError, OutboxError } = await import('./errors')
  expect(isRetryableOutboxError({ status: 503 })).toBe(true)
  expect(
    isRetryableOutboxError(new OutboxError('Error interno', 'internal_error')),
  ).toBe(true)
  expect(isRetryableOutboxError({ status: 409 })).toBe(false)
})
