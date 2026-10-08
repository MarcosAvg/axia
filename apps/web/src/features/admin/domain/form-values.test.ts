import type { AdminField } from './catalogs'
import { initialValues, toAdminValues } from './form-values'

const fields: AdminField[] = [
  { name: 'name', label: 'Nombre', kind: 'text', required: true },
  { name: 'active', label: 'Activo', kind: 'boolean' },
  { name: 'position', label: 'Orden', kind: 'number' },
  {
    name: 'team_id',
    label: 'Equipo',
    kind: 'select-table',
    optionsTable: 'teams',
  },
]

describe('initialValues', () => {
  it('deja los textos vacíos y los booleanos en falso', () => {
    const values = initialValues(fields)
    expect(values.name).toBe('')
    expect(values.active).toBe(false)
  })

  it('copia los valores de una fila', () => {
    const values = initialValues(fields, {
      name: 'Equipo A',
      active: true,
      position: 3,
      team_id: 't1',
    })
    expect(values.active).toBe(true)
    expect(values.position).toBe(3)
    expect(values.team_id).toBe('t1')
  })
})

describe('toAdminValues', () => {
  it('señala el campo obligatorio vacío', () => {
    const result = toAdminValues(fields, {
      name: '   ',
      active: true,
      position: '',
      team_id: '',
    })
    expect(result.error).toBe('name')
  })

  it('convierte números y vacíos a null', () => {
    const result = toAdminValues(fields, {
      name: 'Ana',
      active: true,
      position: '5',
      team_id: '',
    })
    expect(result.error).toBeNull()
    expect(result.values.position).toBe(5)
    expect(result.values.team_id).toBeNull()
    expect(result.values.active).toBe(true)
  })
})
