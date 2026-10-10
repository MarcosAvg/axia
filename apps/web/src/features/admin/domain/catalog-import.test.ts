import {
  CATALOG_IMPORT_SPECS,
  analyzeCatalog,
  matchKeyOf,
  parseBoolean,
  parseNumber,
  prepareRow,
  specByKey,
} from './catalog-import'
import type { References } from './catalog-import'

function references(): References {
  const empty: References = {
    teams: [{ id: 'team-1', label: 'Mantenimiento' }],
    buildings: [{ id: 'bld-1', label: 'Edificio Central' }],
    dependencies: [{ id: 'dep-1', label: 'Sistemas' }],
    locations: [],
    categories: [{ id: 'cat-1', label: 'Eléctrico' }],
    subcategories: [{ id: 'sub-1', label: 'Luminarias' }],
    problems: [],
    service_types: [],
    priorities: [{ id: 'pri-1', label: 'Media' }],
    channels: [],
    requesters: [],
    technicians: [],
    reasons: [
      { id: 'rea-1', label: 'Falta de material', use: 'pause' },
      { id: 'rea-2', label: 'Falta de material', use: 'rejection' },
    ],
  }
  return empty
}

describe('parseBoolean', () => {
  it('interpreta Sí/No y variantes', () => {
    expect(parseBoolean('Sí')).toBe(true)
    expect(parseBoolean('no')).toBe(false)
    expect(parseBoolean('x')).toBe(true)
    expect(parseBoolean('')).toBeNull()
  })
})

describe('parseNumber', () => {
  it('convierte números y marca inválidos', () => {
    expect(parseNumber('12')).toBe(12)
    expect(parseNumber('')).toBeNull()
    expect(parseNumber('abc')).toBeUndefined()
  })
})

describe('specs', () => {
  it('están en orden de dependencias y las referencias apuntan a especificaciones', () => {
    const keys = CATALOG_IMPORT_SPECS.map((spec) => spec.key)
    expect(keys.indexOf('teams')).toBeLessThan(keys.indexOf('categories'))
    expect(keys.indexOf('categories')).toBeLessThan(
      keys.indexOf('subcategories'),
    )
    for (const spec of CATALOG_IMPORT_SPECS) {
      for (const column of spec.columns) {
        if (column.kind === 'reference') {
          expect(() => specByKey(column.reference as never)).not.toThrow()
        }
      }
    }
  })
})

describe('prepareRow', () => {
  it('resuelve una referencia por nombre', () => {
    const row = prepareRow(
      specByKey('locations'),
      { Edificio: 'Edificio Central', Nombre: 'Planta baja', Activo: 'Sí' },
      2,
      references(),
    )
    expect(row.issues).toEqual([])
    expect(row.data.building_id).toBe('bld-1')
    expect(row.data.name).toBe('Planta baja')
    expect(row.data.active).toBe(true)
  })

  it('marca una referencia sin coincidencia', () => {
    const row = prepareRow(
      specByKey('locations'),
      { Edificio: 'No existe', Nombre: 'X' },
      2,
      references(),
    )
    expect(row.issues.some((issue) => issue.includes('Sin coincidencia'))).toBe(
      true,
    )
  })

  it('deja la clave natural opcional como nula', () => {
    const row = prepareRow(
      specByKey('requesters'),
      { 'Nombre completo': 'Ana', Contacto: 'ext. 1' },
      2,
      references(),
    )
    expect(row.issues).toEqual([])
    expect(row.data.dependency_id).toBeNull()
    expect(row.matchKey).toBe('Ana\u0001')
  })

  it('desambigua el motivo padre por uso', () => {
    const row = prepareRow(
      specByKey('reasons'),
      {
        Uso: 'Pausa',
        'Motivo padre': 'Falta de material',
        Nombre: 'Sin stock',
        'Clasificación de reloj': 'Cuenta',
      },
      2,
      references(),
    )
    expect(row.issues).toEqual([])
    expect(row.data.use).toBe('pause')
    expect(row.data.parent_id).toBe('rea-1')
    expect(row.data.clock_class).toBe('counted')
  })
})

describe('analyzeCatalog', () => {
  it('clasifica nuevas, existentes y duplicadas', () => {
    const spec = specByKey('teams')
    const existing = new Set([matchKeyOf(spec, { name: 'Mantenimiento' })])
    const analysis = analyzeCatalog(
      spec,
      [
        { Nombre: 'Mantenimiento' },
        { Nombre: 'Seguridad' },
        { Nombre: 'Seguridad' },
      ],
      references(),
      existing,
    )
    expect(analysis.inserted).toBe(1)
    expect(analysis.updated).toBe(1)
    expect(analysis.invalid).toBe(1)
    expect(analysis.total).toBe(3)
  })
})
