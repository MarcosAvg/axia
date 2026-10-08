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
