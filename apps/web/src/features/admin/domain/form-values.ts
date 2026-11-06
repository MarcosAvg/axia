import type { AdminField } from './catalogs'

export type RawValue = string | number | boolean | null | string[]
export type RawValues = Record<string, RawValue>

function initialValue(field: AdminField, current: unknown): RawValue {
  if (field.kind === 'multiselect-fixed') {
    return Array.isArray(current) ? current.map(String) : []
  }
  if (field.kind === 'boolean') {
    return current === undefined
      ? (field.defaultValue ?? false)
      : Boolean(current)
  }
  if (current === undefined || current === null) {
    return field.defaultValue ?? ''
  }
  return typeof current === 'number' ? current : String(current)
}

/** Valores iniciales del formulario a partir de una fila (o vacíos). */
export function initialValues(
  fields: AdminField[],
  row?: Record<string, unknown>,
): RawValues {
  const values: RawValues = {}
  for (const field of fields) {
    values[field.name] = initialValue(field, row?.[field.name])
  }
  return values
}

function textOf(value: RawValue | undefined): string {
  if (value === null || value === undefined) return ''
  if (Array.isArray(value)) return value.join(',')
  return String(value).trim()
}

function multiValue(
  field: AdminField,
  raw: RawValue | undefined,
): { value: RawValue } | { invalid: true } {
  const list = Array.isArray(raw) ? raw.map(String) : []
  if (field.required && list.length === 0) return { invalid: true }
  return { value: list }
}

function numberValue(
  field: AdminField,
  text: string,
): { value: RawValue } | { invalid: true } {
  if (text === '') {
    return {
      value: typeof field.defaultValue === 'number' ? field.defaultValue : null,
    }
  }
  const parsed = Number(text)
  if (!Number.isFinite(parsed)) return { invalid: true }
  return { value: parsed }
}

function textValue(
  field: AdminField,
  text: string,
): { value: RawValue } | { invalid: true } {
  if (field.required && text === '') return { invalid: true }
  return { value: text === '' ? null : text }
}

function valueFor(
  field: AdminField,
  raw: RawValue | undefined,
): { value: RawValue } | { invalid: true } {
  if (field.kind === 'multiselect-fixed') return multiValue(field, raw)
  if (field.kind === 'boolean') return { value: Boolean(raw) }
  const text = textOf(raw)
  if (field.kind === 'number' || field.kind === 'minutes') {
    return numberValue(field, text)
  }
  return textValue(field, text)
}

/** Convierte el formulario a un objeto para la base y lista los campos inválidos. */
export function toAdminValues(
  fields: AdminField[],
  raw: RawValues,
): {
  values: RawValues
  errors: string[]
} {
  const values: RawValues = {}
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
