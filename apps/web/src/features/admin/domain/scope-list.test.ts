import {
  filterDesignations,
  filterSupervisorScopes,
  groupDesignations,
} from './scope-list'
import type { SupervisorScope } from './access'

const scopes: SupervisorScope[] = [
  { id: 's1', userId: 'u1', teamId: 't1', active: true, buildingIds: ['b1'] },
  { id: 's2', userId: 'u2', teamId: 't2', active: true, buildingIds: [] },
]

describe('filterSupervisorScopes', () => {
  it('filtra por el texto del ámbito', () => {
    const label = (scope: SupervisorScope) =>
      scope.userId === 'u1' ? 'Luis · Mantenimiento' : 'Ana · Seguridad'
    expect(filterSupervisorScopes(scopes, label, 'seguridad')).toEqual([
      scopes[1],
    ])
    expect(filterSupervisorScopes(scopes, label, '  ')).toHaveLength(2)
  })
})

describe('groupDesignations', () => {
  it('agrupa las categorías por técnico', () => {
    const grouped = groupDesignations([
      { technicianId: 'tec1', categoryId: 'c1' },
      { technicianId: 'tec1', categoryId: 'c2' },
      { technicianId: 'tec2', categoryId: 'c3' },
    ])
    expect(grouped).toEqual([
      { technicianId: 'tec1', categoryIds: ['c1', 'c2'] },
      { technicianId: 'tec2', categoryIds: ['c3'] },
    ])
  })
})

describe('filterDesignations', () => {
  it('filtra por el texto de la designación', () => {
    const designations = [
      { technicianId: 'tec1', categoryIds: ['c1'] },
      { technicianId: 'tec2', categoryIds: [] },
    ]
    const label = (d: { technicianId: string }) =>
      d.technicianId === 'tec1' ? 'Luis · Eléctrico' : 'Ana · Limpieza'
    expect(filterDesignations(designations, label, 'eléctrico')).toEqual([
      designations[0],
    ])
    expect(filterDesignations(designations, label, '')).toHaveLength(2)
  })
})
