import type { AdminField } from './catalogs'

export type RawValues = Record<string, string | number | boolean | null>

/** Valores iniciales del formulario a partir de una fila (o vacíos). */
export function initialValues(
  fields: AdminField[],
  row?: Record<string, unknown>,
): RawValues {
  const values: RawValues = {}
  for (const field of fields) {
    const current = row?.[field.name]
    if (field.kind === 'boolean') {
      values[field.name] = current === undefined ? false : Boolean(current)
    } else if (current === undefined || current === null) {
      values[field.name] = ''
    } else {
      values[field.name] =
        typeof current === 'number' ? current : String(current)
    }
  }
  return values
}

function textOf(value: RawValues[string] | undefined): string {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function valueFor(
  field: AdminField,
  raw: RawValues[string] | undefined,
): { value: string | number | boolean | null } | { error: true } {
  if (field.kind === 'boolean') return { value: Boolean(raw) }
  const text = textOf(raw)
  if (field.kind === 'number') {
    return { value: text === '' ? null : Number(text) }
  }
  if (field.required && text === '') return { error: true }
  return { value: text === '' ? null : text }
}

/** Convierte los valores del formulario a un objeto para la base; señala el campo inválido. */
export function toAdminValues(
  fields: AdminField[],
  raw: RawValues,
): {
  values: Record<string, string | number | boolean | null>
  error: string | null
} {
  const values: Record<string, string | number | boolean | null> = {}
  for (const field of fields) {
    const result = valueFor(field, raw[field.name])
    if ('error' in result) return { values: {}, error: field.name }
    values[field.name] = result.value
  }
  return { values, error: null }
}
