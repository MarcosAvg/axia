// Especificaciones de importación de catálogos (claves coinciden con `catalog_import_specs`).

import { adminMessages } from '../i18n'

export type CatalogKey =
  | 'teams'
  | 'buildings'
  | 'dependencies'
  | 'locations'
  | 'categories'
  | 'subcategories'
  | 'problems'
  | 'service_types'
  | 'priorities'
  | 'channels'
  | 'requesters'
  | 'technicians'
  | 'reasons'

export type CellValue = string | number | boolean | null

type ColumnKind = 'text' | 'number' | 'boolean' | 'reference' | 'fixed'

export interface ImportColumn {
  key: string
  header: string
  kind: ColumnKind
  required?: boolean
  reference?: CatalogKey
  options?: { value: string; label: string }[]
}

export interface ImportSpec {
  key: CatalogKey
  title: string
  headings: string[]
  columns: ImportColumn[]
  match: string[]
}

export interface ReferenceRow {
  id: string
  label: string
  /** Nombre con la ruta de padres; desambigua etiquetas repetidas. */
  path?: string
  /** Solo motivos: el uso, para desambiguar el padre. */
  use?: string
}

export type References = Record<CatalogKey, ReferenceRow[]>

/** Filas crudas por catálogo, tal como se leen de un XLSX. */
export type CatalogSheetRows = Partial<
  Record<CatalogKey, Record<string, unknown>[]>
>

const reasonUseOptions = Object.entries(adminMessages.reasonUse).map(
  ([value, label]) => ({ value, label }),
)
const clockClassOptions = Object.entries(adminMessages.clockClass).map(
  ([value, label]) => ({ value, label }),
)

const text = (key: string, header: string, required = false): ImportColumn => ({
  key,
  header,
  kind: 'text',
  required,
})
const number = (key: string, header: string): ImportColumn => ({
  key,
  header,
  kind: 'number',
})
const boolean = (key: string, header: string): ImportColumn => ({
  key,
  header,
  kind: 'boolean',
})
const reference = (
  key: string,
  header: string,
  to: CatalogKey,
  required = false,
): ImportColumn => ({ key, header, kind: 'reference', reference: to, required })
const fixed = (
  key: string,
  header: string,
  options: { value: string; label: string }[],
  required = false,
): ImportColumn => ({ key, header, kind: 'fixed', options, required })

const active = boolean('active', 'Activo')

function spec(
  key: CatalogKey,
  title: string,
  columns: ImportColumn[],
  match: string[],
): ImportSpec {
  return { key, title, headings: columns.map((c) => c.header), columns, match }
}

/** Catálogos importables, en orden de dependencias. */
export const CATALOG_IMPORT_SPECS: ImportSpec[] = [
  spec('teams', 'Equipos', [text('name', 'Nombre', true), active], ['name']),
  spec(
    'buildings',
    'Edificios',
    [text('name', 'Nombre', true), active],
    ['name'],
  ),
  spec(
    'dependencies',
    'Dependencias',
    [text('name', 'Nombre', true), active],
    ['name'],
  ),
  spec(
    'categories',
    'Categorías',
    [
      reference('team_id', 'Equipo', 'teams', true),
      text('name', 'Nombre', true),
      active,
    ],
    ['team_id', 'name'],
  ),
  spec(
    'subcategories',
    'Subcategorías',
    [
      reference('category_id', 'Categoría', 'categories', true),
      text('name', 'Nombre', true),
      active,
    ],
    ['category_id', 'name'],
  ),
  spec(
    'priorities',
    'Prioridades',
    [
      text('name', 'Nombre', true),
      number('position', 'Orden'),
      number('target_minutes', 'Tiempo objetivo (min)'),
      active,
    ],
    ['name'],
  ),
  spec(
    'problems',
    'Problemas',
    [
      reference('subcategory_id', 'Subcategoría', 'subcategories', true),
      text('name', 'Nombre', true),
      reference('default_priority_id', 'Prioridad por defecto', 'priorities'),
      active,
    ],
    ['subcategory_id', 'name'],
  ),
  spec(
    'service_types',
    'Tipos de servicio',
    [
      text('name', 'Nombre', true),
      number('target_minutes', 'Tiempo objetivo (min)'),
      active,
    ],
    ['name'],
  ),
  spec(
    'channels',
    'Canales',
    [
      text('name', 'Nombre', true),
      boolean('is_platform', 'Canal de plataforma'),
      active,
    ],
    ['name'],
  ),
  spec(
    'locations',
    'Ubicaciones',
    [
      reference('building_id', 'Edificio', 'buildings', true),
      text('name', 'Nombre', true),
      active,
    ],
    ['building_id', 'name'],
  ),
  spec(
    'requesters',
    'Solicitantes',
    [
      text('full_name', 'Nombre completo', true),
      text('contact', 'Contacto'),
      reference('dependency_id', 'Dependencia', 'dependencies'),
      active,
    ],
    ['full_name', 'dependency_id'],
  ),
  spec(
    'technicians',
    'Técnicos',
    [
      text('full_name', 'Nombre completo', true),
      reference('team_id', 'Equipo', 'teams', true),
      active,
    ],
    ['full_name', 'team_id'],
  ),
  spec(
    'reasons',
    'Motivos',
    [
      fixed('use', 'Uso', reasonUseOptions, true),
      reference('parent_id', 'Motivo padre', 'reasons'),
      text('name', 'Nombre', true),
      number('position', 'Orden'),
      boolean('requires_note', 'Exige nota'),
      boolean('allows_estimated_date', 'Admite fecha estimada'),
      fixed('clock_class', 'Clasificación de reloj', clockClassOptions, true),
      active,
    ],
    ['use', 'parent_id', 'name'],
  ),
]

export function specByKey(key: CatalogKey): ImportSpec {
  const found = CATALOG_IMPORT_SPECS.find((item) => item.key === key)
  if (!found) throw new Error(`Catálogo desconocido: ${key}`)
  return found
}
