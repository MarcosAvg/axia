import { loginSchema, parseIdentity, profileSchema } from './schemas'

describe('loginSchema', () => {
  it('acepta un correo y una contraseña válidos', () => {
    const result = loginSchema.safeParse({
      email: 'persona@axia.test',
      password: 'secreta',
    })
    expect(result.success).toBe(true)
  })

  it('rechaza un correo inválido', () => {
    const result = loginSchema.safeParse({
      email: 'no-es-correo',
      password: 'x',
    })
    expect(result.success).toBe(false)
  })

  it('rechaza una contraseña vacía', () => {
    const result = loginSchema.safeParse({
      email: 'persona@axia.test',
      password: '',
    })
    expect(result.success).toBe(false)
  })
})

describe('profileSchema', () => {
  it('recorta el nombre y admite teléfono vacío', () => {
    const result = profileSchema.safeParse({ fullName: '  Ana  ', phone: '' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.fullName).toBe('Ana')
    }
  })

  it('rechaza un nombre vacío', () => {
    expect(profileSchema.safeParse({ fullName: '   ' }).success).toBe(false)
  })
})

describe('parseIdentity', () => {
  const respuesta = {
    user_id: 'u1',
    profile: {
      id: 'u1',
      full_name: 'Ana Pérez',
      phone: 'ext. 100',
      active: true,
    },
    roles: ['requester'],
    permissions: [{ permission: 'ticket.view', scope: 'own' }],
    timezone: 'America/Mexico_City',
  }

  it('convierte la respuesta de me() en una identidad', () => {
    const identity = parseIdentity(respuesta)
    expect(identity).toEqual({
      userId: 'u1',
      fullName: 'Ana Pérez',
      phone: 'ext. 100',
      active: true,
      roles: ['requester'],
      permissions: [{ permission: 'ticket.view', scope: 'own' }],
      timezone: 'America/Mexico_City',
    })
  })

  it('lanza si el usuario no tiene perfil', () => {
    expect(() => parseIdentity({ ...respuesta, profile: null })).toThrow()
  })

  it('lanza si un permiso trae un ámbito desconocido', () => {
    expect(() =>
      parseIdentity({
        ...respuesta,
        permissions: [{ permission: 'ticket.view', scope: 'galaxia' }],
      }),
    ).toThrow()
  })
})
