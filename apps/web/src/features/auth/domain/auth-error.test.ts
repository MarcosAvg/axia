import { isInvalidCredentials } from './auth-error'

describe('isInvalidCredentials', () => {
  it('detecta credenciales inválidas por código', () => {
    expect(isInvalidCredentials({ code: 'invalid_credentials' })).toBe(true)
  })

  it('detecta credenciales inválidas por estado 400', () => {
    expect(isInvalidCredentials({ status: 400, message: 'algo' })).toBe(true)
  })

  it('detecta credenciales inválidas por mensaje', () => {
    expect(isInvalidCredentials({ message: 'Invalid login credentials' })).toBe(
      true,
    )
  })

  it('es falso para un error de red', () => {
    expect(isInvalidCredentials({ message: 'Failed to fetch' })).toBe(false)
  })

  it('es falso para un valor que no es error', () => {
    expect(isInvalidCredentials(null)).toBe(false)
    expect(isInvalidCredentials('texto')).toBe(false)
  })
})
