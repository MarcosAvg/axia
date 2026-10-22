import type { Identity } from '@/features/auth'
import { isNavItemVisible, NAV_SECTIONS } from './nav-items'
import type { NavItem } from './nav-items'

function item(id: string): NavItem {
  const found = NAV_SECTIONS.flatMap((section) => section.items).find(
    (candidate) => candidate.id === id,
  )
  if (!found) throw new Error(`No existe el destino ${id}`)
  return found
}

function identity(
  permissions: string[],
  technicianId: string | null = null,
): Identity {
  return {
    userId: 'u1',
    fullName: 'Prueba',
    phone: null,
    active: true,
    roles: [],
    permissions: permissions.map((permission) => ({
      permission,
      scope: 'all',
    })),
    technicianId,
    timezone: 'America/Mexico_City',
    mustChangePassword: false,
  }
}

describe('isNavItemVisible', () => {
  it('muestra Mi trabajo solo con perfil de técnico', () => {
    const myWork = item('my-work')
    expect(isNavItemVisible(myWork, identity(['ticket.view']))).toBe(false)
    expect(
      isNavItemVisible(myWork, identity(['ticket.view'], 'technician-1')),
    ).toBe(true)
  })

  it('muestra Bandeja solo a quien puede tomar ofertas', () => {
    const inbox = item('inbox')
    expect(isNavItemVisible(inbox, identity(['ticket.view']))).toBe(false)
    expect(
      isNavItemVisible(
        inbox,
        identity(['ticket.view', 'ticket.assign_technician']),
      ),
    ).toBe(false)
    expect(
      isNavItemVisible(inbox, identity(['ticket.view', 'ticket.take_offer'])),
    ).toBe(true)
  })

  it('respeta el permiso específico de cada sección de administración', () => {
    const roles = item('roles')
    const users = item('users')
    const scopes = item('scopes')
    const onlyRoles = identity(['role.manage'])
    expect(isNavItemVisible(roles, onlyRoles)).toBe(true)
    expect(isNavItemVisible(users, onlyRoles)).toBe(false)
    expect(isNavItemVisible(scopes, onlyRoles)).toBe(false)
  })
})
