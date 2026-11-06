import { useState } from 'react'
import type { FormEvent } from 'react'
import type { AdminTable } from '../api/admin-api'
import type { AdminField } from '../domain/catalogs'
import { initialValues, toAdminValues } from '../domain/form-values'
import type { RawValue, RawValues } from '../domain/form-values'
import { reasonParentOptions } from '../domain/reason-parents'
import type { AdminOption } from './use-admin-catalog'

interface CatalogFormInput {
  fields: AdminField[]
  row?: Record<string, unknown>
  optionsFor: (table: AdminTable) => AdminOption[]
  onSave: (values: RawValues) => void
}

/** Estado del formulario, incluidos los padres elegibles de motivos. */
export function useCatalogForm({
  fields,
  row,
  optionsFor,
  onSave,
}: CatalogFormInput) {
  const [raw, setRaw] = useState<RawValues>(() => initialValues(fields, row))
  const [invalid, setInvalid] = useState<string[]>([])
  const isReason = fields.some((field) => field.name === 'use')
  function submit(event: FormEvent) {
    event.preventDefault()
    const { values, errors } = toAdminValues(fields, raw)
    setInvalid(errors)
    if (errors.length === 0) onSave(values)
  }
  function onChange(name: string, value: RawValue) {
    setRaw((current) => ({
      ...current,
      [name]: value,
      ...(isReason && name === 'use' && current.use !== value
        ? { parent_id: '' }
        : {}),
    }))
  }
  function fieldOptions(field: AdminField) {
    const options = field.optionsTable ? optionsFor(field.optionsTable) : []
    return isReason && field.name === 'parent_id'
      ? reasonParentOptions(
          options,
          String(raw.use ?? ''),
          row?.id ? String(row.id) : undefined,
        )
      : options
  }
  return { raw, invalid, submit, onChange, fieldOptions }
}
