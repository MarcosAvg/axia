import { describe, expect, it } from 'vitest'
import { filterPermissionGroups, groupPermissions } from './access'
import type { Permission } from './access'

const permissions: Permission[] = [
  { id: 'ticket.view', description: 'Ver tiquets' },
  { id: 'ticket.create', description: 'Crear tiquets' },
  { id: 'role.manage', description: 'Administrar roles' },
]

describe('filterPermissionGroups', () => {
  it('devuelve todos los grupos sin término', () => {
    expect(
      filterPermissionGroups(groupPermissions(permissions), ''),
    ).toHaveLength(2)
  })

  it('filtra por descripción y conserva el grupo', () => {
    const result = filterPermissionGroups(
      groupPermissions(permissions),
      'crear',
    )
    expect(result).toHaveLength(1)
    expect(result[0]?.key).toBe('ticket')
    expect(result[0]?.permissions.map((item) => item.id)).toEqual([
      'ticket.create',
    ])
  })

  it('filtra por identificador', () => {
    const result = filterPermissionGroups(
      groupPermissions(permissions),
      'role.',
    )
    expect(result).toHaveLength(1)
    expect(result[0]?.permissions[0]?.id).toBe('role.manage')
  })

  it('descarta grupos sin coincidencias', () => {
    expect(
      filterPermissionGroups(groupPermissions(permissions), 'inexistente'),
    ).toEqual([])
  })
})
