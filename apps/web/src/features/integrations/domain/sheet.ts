// Normalización de la hoja de origen (funciones puras). Los nombres de columna de la fuente
// viven aquí porque este feature está aislado del núcleo (docs/integraciones-y-migracion.md).

export interface SheetRow {
  externalId: string | null
  platformId: string | null
  building: string | null
  location: string | null
  dependency: string | null
  category: string | null
  subcategory: string | null
  problem: string | null
  description: string | null
  serviceType: string | null
  priority: string | null
  technician: string | null
  channel: string | null
  status: string | null
  contact: string | null
  extension: string | null
  reportedAt: string | null
  assignedAt: string | null
  finishedAt: string | null
}

/** Quita acentos, espacios sobrantes y mayúsculas para comparar cabeceras. */
export function normalizeLabel(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

const HEADER_ALIASES: Record<keyof SheetRow, string[]> = {
  externalId: ['ID'],
  platformId: ['ID DE ORIGEN', 'ID ATENDA'],
  building: ['EDIFICIO'],
  location: ['UBICACION'],
  dependency: ['DEPENDENCIA'],
  category: ['CATEGORIA'],
  subcategory: ['SUBCATEGORIA'],
  problem: ['PROBLEMA'],
  description: ['DESCRIPCION'],
  serviceType: ['TIPO DE SERVICIO'],
  priority: ['PRIORIDAD'],
  technician: ['TECNICO DE MTTO'],
  channel: ['PLATAFORMA'],
  status: ['ESTATUS'],
  contact: ['CONTACTO'],
  extension: ['EXTENSION', 'EXTENCION'],
  reportedAt: ['FECHA Y HORA DE REPORTE'],
  assignedAt: ['ASIGNACION DE TRABAJO'],
  finishedAt: ['FINALIZACION DE TRABAJO'],
}

const HEADER_BY_LABEL = new Map<string, keyof SheetRow>()
for (const [key, labels] of Object.entries(HEADER_ALIASES) as [
  keyof SheetRow,
  string[],
][]) {
  for (const label of labels) HEADER_BY_LABEL.set(normalizeLabel(label), key)
}

function text(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const trimmed = String(value).trim()
  return trimmed === '' ? null : trimmed
}

/** Marcadores de "sin dato" de la fuente. */
export function isNoData(value: string | null): boolean {
  if (value === null) return true
  const normalized = normalizeLabel(value)
  return normalized === 'NO ATENDIDO' || normalized === 'NO CONTABILIZADO'
}

const MONTHS: Record<string, number> = {
  ENE: 1,
  FEB: 2,
  MAR: 3,
  ABR: 4,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AGO: 8,
  SEP: 9,
  OCT: 10,
  NOV: 11,
  DIC: 12,
}

interface Parts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

function matchParts(value: string): Parts | null {
  const match = value.match(
    /(\d{1,2})\/([a-záéíóú]{3,})\/(\d{4})(?:\s*-\s*\[?(\d{1,2}):(\d{2})(?::(\d{2}))?\]?)?/i,
  )
  if (!match) return null
  const month = MONTHS[normalizeLabel(match[2] ?? '').slice(0, 3)]
  if (!month) return null
  return {
    day: Number(match[1]),
    month,
    year: Number(match[3]),
    hour: match[4] ? Number(match[4]) : 0,
    minute: match[5] ? Number(match[5]) : 0,
    second: match[6] ? Number(match[6]) : 0,
  }
}

function zoneOffsetMinutes(date: Date, timeZone: string): number {
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date)
  const get = (type: string) =>
    Number(formatted.find((part) => part.type === type)?.value ?? '0')
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour') % 24,
    get('minute'),
    get('second'),
  )
  return (asUtc - date.getTime()) / 60000
}

/** Convierte la fecha local de la hoja (en la zona configurada) a un instante UTC ISO. */
export function parseSourceDate(
  value: string | null,
  timeZone: string,
): string | null {
  if (isNoData(value)) return null
  const parts = matchParts(value as string)
  if (!parts) return null
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  )
  const offset = zoneOffsetMinutes(new Date(asUtc), timeZone)
  return new Date(asUtc - offset * 60000).toISOString()
}

/** Normaliza una fila cruda a las columnas canónicas (texto sin interpretar). */
export function canonicalRow(raw: Record<string, unknown>): SheetRow {
  const result = {} as SheetRow
  const byKey = new Map<keyof SheetRow, unknown>()
  for (const [header, value] of Object.entries(raw)) {
    const key = HEADER_BY_LABEL.get(normalizeLabel(header))
    if (key) byKey.set(key, value)
  }
  for (const key of Object.keys(HEADER_ALIASES) as (keyof SheetRow)[]) {
    result[key] = text(byKey.get(key))
  }
  return result
}
