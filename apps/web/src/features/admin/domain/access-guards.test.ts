import { describe, expect, it } from 'vitest'
import type { Profile, Role, UserRole } from './access'
import {
  activeAdminIds,
  canDeactivateProfile,
  canDeleteProfile,
  canDeactivateRole,
  canEditRolePermissions,
  canRemoveUserRole,
  guardMessage,
  isAdminRole,
} from './access-guards'

const adminRole: Role = {
  id: 'role-admin',
  name: 'administrator',
  label: 'Administrador',
  active: true,
}
const supervisorRole: Role = {
  id: 'role-supervisor',
  name: 'supervisor',
  label: 'Supervisor',
  active: true,
}
const roles = [adminRole, supervisorRole]

const rosa: Profile = {
  id: 'user-rosa',
  fullName: 'Rosa Delgado',
  phone: null,
  active: true,
}
const sergio: Profile = {
  id: 'user-sergio',
  fullName: 'Sergio Ramírez',
  phone: null,
  active: true,
}
const ana: Profile = {
  id: 'user-ana',
  fullName: 'Ana Pérez',
  phone: null,
  active: true,
}
const profiles = [rosa, sergio, ana]

const rosaAdmin: UserRole = { userId: rosa.id, roleId: adminRole.id }
const sergioAdmin: UserRole = { userId: sergio.id, roleId: adminRole.id }
const anaSupervisor: UserRole = { userId: ana.id, roleId: supervisorRole.id }

describe('activeAdminIds', () => {
  it('cuenta solo cuentas activas con el rol administrativo activo', () => {
    const assignments = [rosaAdmin, sergioAdmin, anaSupervisor]
    expect(activeAdminIds(profiles, roles, assignments)).toEqual(
      new Set([rosa.id, sergio.id]),
    )
  })

  it('ignora roles administrativos inactivos y cuentas inactivas', () => {
    const inactiveAdmin = { ...adminRole, active: false }
    const inactiveRosa = { ...rosa, active: false }
    expect(
      activeAdminIds(
        [inactiveRosa, sergio],
        [inactiveAdmin, supervisorRole],
        [rosaAdmin, sergioAdmin],
      ),
    ).toEqual(new Set())
  })
})

const base = { profiles, roles, currentUserId: rosa.id }

describe('canDeactivateProfile', () => {
  it('bloquea desactivarse a uno mismo', () => {
    expect(
      canDeactivateProfile(rosa, { ...base, assignments: [rosaAdmin] }),
    ).toEqual({ allowed: false, reason: 'self-deactivate' })
  })

  it('bloquea desactivar al último administrador', () => {
    expect(
      canDeactivateProfile(sergio, { ...base, assignments: [sergioAdmin] }),
    ).toEqual({ allowed: false, reason: 'last-admin' })
  })

  it('permite desactivar a un administrador si queda otro', () => {
    expect(
      canDeactivateProfile(sergio, {
        ...base,
        assignments: [rosaAdmin, sergioAdmin],
      }),
    ).toEqual({ allowed: true })
  })

  it('permite desactivar a alguien sin rol administrativo', () => {
    expect(
      canDeactivateProfile(ana, { ...base, assignments: [rosaAdmin] }),
    ).toEqual({ allowed: true })
  })
})

describe('canDeleteProfile', () => {
  it('bloquea eliminar la propia cuenta', () => {
    expect(
      canDeleteProfile(rosa, { ...base, assignments: [rosaAdmin] }),
    ).toEqual({ allowed: false, reason: 'self-delete' })
  })

  it('bloquea eliminar al último administrador', () => {
    expect(
      canDeleteProfile(sergio, { ...base, assignments: [sergioAdmin] }),
    ).toEqual({ allowed: false, reason: 'last-admin' })
  })

  it('permite eliminar a alguien sin rol administrativo', () => {
    expect(
      canDeleteProfile(ana, { ...base, assignments: [rosaAdmin] }),
    ).toEqual({ allowed: true })
  })
})

describe('canRemoveUserRole', () => {
  it('bloquea quitar el último rol administrativo activo', () => {
    expect(
      canRemoveUserRole(rosa.id, adminRole, {
        ...base,
        assignments: [rosaAdmin],
      }),
    ).toEqual({ allowed: false, reason: 'last-admin' })
  })

  it('permite quitar el rol administrativo si queda otro administrador', () => {
    expect(
      canRemoveUserRole(rosa.id, adminRole, {
        ...base,
        assignments: [rosaAdmin, sergioAdmin],
      }),
    ).toEqual({ allowed: true })
  })

  it('no bloquea roles que no son administrativos', () => {
    expect(
      canRemoveUserRole(ana.id, supervisorRole, {
        ...base,
        assignments: [anaSupervisor],
      }),
    ).toEqual({ allowed: true })
  })
})

describe('rol administrativo', () => {
  it('identifica y protege el rol admin', () => {
    expect(isAdminRole(adminRole)).toBe(true)
    expect(canDeactivateRole(adminRole)).toEqual({
      allowed: false,
      reason: 'admin-role',
    })
    expect(canEditRolePermissions(adminRole)).toBe(false)
  })

  it('permite editar roles no administrativos', () => {
    expect(canDeactivateRole(supervisorRole)).toEqual({ allowed: true })
    expect(canEditRolePermissions(supervisorRole)).toBe(true)
  })
})

describe('guardMessage', () => {
  it('traduce cada motivo', () => {
    expect(guardMessage('self-deactivate')).toContain('propia cuenta')
    expect(guardMessage('self-delete')).toContain('propia cuenta')
    expect(guardMessage('last-admin')).toContain('administradores')
    expect(guardMessage('admin-role')).toContain('protegido')
  })
})
