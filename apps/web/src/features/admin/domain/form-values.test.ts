import type { AdminField } from './catalogs'
import { reasonsCatalog } from './catalogs-reasons'
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

const fieldsWithDefaults: AdminField[] = [
  { name: 'active', label: 'Activo', kind: 'boolean', defaultValue: true },
  { name: 'position', label: 'Orden', kind: 'number', defaultValue: 0 },
]

const multiField: AdminField[] = [
  {
    name: 'attachment_required_types',
    label: 'Tipos',
    kind: 'multiselect-fixed',
    required: true,
    options: [
      { value: 'application/pdf', label: 'PDF' },
      { value: 'image/jpeg', label: 'JPEG' },
    ],
  },
]

describe('initialValues', () => {
  it('deja los textos vacíos y los booleanos en falso', () => {
    const values = initialValues(fields)
    expect(values.name).toBe('')
    expect(values.active).toBe(false)
  })

  it('usa los valores por defecto de los campos nuevos', () => {
    const values = initialValues(fieldsWithDefaults)
    expect(values.active).toBe(true)
    expect(values.position).toBe(0)
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

  it('precarga los arreglos de un multiselect', () => {
    const values = initialValues(multiField, {
      attachment_required_types: ['application/pdf', 'image/jpeg'],
    })
    expect(values.attachment_required_types).toEqual([
      'application/pdf',
      'image/jpeg',
    ])
  })
})

describe('toAdminValues', () => {
  it('señala los campos obligatorios vacíos', () => {
    const result = toAdminValues(fields, {
      name: '   ',
      active: true,
      position: '',
      team_id: '',
    })
    expect(result.errors).toEqual(['name'])
  })

  it('usa el número por defecto cuando el campo está vacío', () => {
    const result = toAdminValues(fieldsWithDefaults, {
      active: true,
      position: '',
    })
    expect(result.errors).toEqual([])
    expect(result.values.position).toBe(0)
  })

  it('señala un número inválido', () => {
    const result = toAdminValues(fields, {
      name: 'Ana',
      active: true,
      position: 'no-es-número',
      team_id: '',
    })
    expect(result.errors).toEqual(['position'])
  })

  it('convierte números y vacíos a null', () => {
    const result = toAdminValues(fields, {
      name: 'Ana',
      active: true,
      position: '5',
      team_id: '',
    })
    expect(result.errors).toEqual([])
    expect(result.values.position).toBe(5)
    expect(result.values.team_id).toBeNull()
    expect(result.values.active).toBe(true)
  })

  it('convierte el multiselect en un arreglo y exige al menos uno', () => {
    expect(
      toAdminValues(multiField, {
        attachment_required_types: ['application/pdf'],
      }),
    ).toMatchObject({
      errors: [],
      values: { attachment_required_types: ['application/pdf'] },
    })
    expect(
      toAdminValues(multiField, { attachment_required_types: [] }).errors,
    ).toEqual(['attachment_required_types'])
  })
})

it('crea motivos operativos activos sin marcar opciones adicionales', () => {
  const raw = {
    ...initialValues(reasonsCatalog.fields),
    use: 'pause',
    name: 'Material',
    clock_class: 'counted',
  }
  expect(toAdminValues(reasonsCatalog.fields, raw)).toMatchObject({
    errors: [],
    values: { active: true, parent_id: null },
  })
})
