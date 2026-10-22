import {
  isInvalidCredentials,
  lockoutMinutes,
  lockoutSeconds,
} from './auth-error'

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

describe('lockoutMinutes', () => {
  it('lee los segundos de espera del error de bloqueo', () => {
    const error = {
      code: 'account_locked',
      details: { retryAfterSeconds: 90 },
    }
    expect(lockoutSeconds(error)).toBe(90)
    expect(lockoutMinutes(error)).toBe(2)
  })

  it('ignora otros errores', () => {
    expect(lockoutSeconds({ code: 'invalid_credentials' })).toBeNull()
    expect(lockoutMinutes({ code: 'account_locked', details: {} })).toBeNull()
  })
})
