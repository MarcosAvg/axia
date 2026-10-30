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
      values[field.name] =
        current === undefined ? (field.defaultValue ?? false) : Boolean(current)
    } else if (current === undefined || current === null) {
      values[field.name] = field.defaultValue ?? ''
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
): { value: string | number | boolean | null } | { invalid: true } {
  if (field.kind === 'boolean') return { value: Boolean(raw) }
  const text = textOf(raw)
  if (field.kind === 'number' || field.kind === 'minutes') {
    if (text === '') {
      return {
        value:
          typeof field.defaultValue === 'number' ? field.defaultValue : null,
      }
    }
    const parsed = Number(text)
    if (!Number.isFinite(parsed)) return { invalid: true }
    return { value: parsed }
  }
  if (field.required && text === '') return { invalid: true }
  return { value: text === '' ? null : text }
}

/** Convierte el formulario a un objeto para la base y lista los campos inválidos. */
export function toAdminValues(
  fields: AdminField[],
  raw: RawValues,
): {
  values: Record<string, string | number | boolean | null>
  errors: string[]
} {
  const values: Record<string, string | number | boolean | null> = {}
  const errors: string[] = []
  for (const field of fields) {
    const result = valueFor(field, raw[field.name])
    if ('invalid' in result) {
      errors.push(field.name)
      continue
    }
    values[field.name] = result.value
  }
  return { values, errors }
}
