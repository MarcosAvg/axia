import { useState } from 'react'
import type { FormEvent } from 'react'
import type { AdminTable } from '../api/admin-api'
import type { AdminField } from '../domain/catalogs'
import { initialValues, toAdminValues } from '../domain/form-values'
import type { RawValues } from '../domain/form-values'
import type { AdminOption } from '../hooks/use-admin-catalog'
import { adminMessages } from '../i18n'
import { CatalogFieldInput } from './catalog-field-input'
import { EntityForm } from './entity-form'
import { FormGroup } from './form-group'

interface CatalogFormProps {
  fields: AdminField[]
  row?: Record<string, unknown>
  optionsFor: (table: AdminTable) => AdminOption[]
  isSaving: boolean
  onSave: (values: Record<string, string | number | boolean | null>) => void
  onCancel: () => void
}

function groupFields(fields: AdminField[]) {
  return {
    data: fields.filter(
      (field) =>
        field.kind !== 'boolean' &&
        field.kind !== 'number' &&
        field.kind !== 'minutes',
    ),
    values: fields.filter(
      (field) => field.kind === 'number' || field.kind === 'minutes',
    ),
    booleans: fields.filter((field) => field.kind === 'boolean'),
  }
}

/** Formulario de alta/edición de un registro de catálogo. */
export function CatalogForm({
  fields,
  row,
  optionsFor,
  isSaving,
  onSave,
  onCancel,
}: CatalogFormProps) {
  const [raw, setRaw] = useState<RawValues>(() => initialValues(fields, row))
  const [invalid, setInvalid] = useState<string[]>([])
  const { form } = adminMessages
  const groups = groupFields(fields)

  function submit(event: FormEvent) {
    event.preventDefault()
    const { values, errors } = toAdminValues(fields, raw)
    setInvalid(errors)
    if (errors.length === 0) onSave(values)
  }

  const onChange = (name: string, value: string | number | boolean) =>
    setRaw((current) => ({ ...current, [name]: value }))

  const renderField = (field: AdminField) => (
    <CatalogFieldInput
      key={field.name}
      field={field}
      value={raw[field.name] ?? ''}
      options={field.optionsTable ? optionsFor(field.optionsTable) : []}
      error={invalid.includes(field.name) ? form.required : undefined}
      onChange={(value) => onChange(field.name, value)}
    />
  )

  return (
    <EntityForm onSubmit={submit} onCancel={onCancel} isSaving={isSaving}>
      {groups.data.length > 0 ? (
        <FormGroup title={form.dataSection}>
          <div className="grid gap-4 sm:grid-cols-2">
            {groups.data.map(renderField)}
          </div>
        </FormGroup>
      ) : null}
      {groups.values.length > 0 || groups.booleans.length > 0 ? (
        <FormGroup title={form.optionsSection}>
          {groups.values.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {groups.values.map(renderField)}
            </div>
          ) : null}
          {groups.booleans.length > 0 ? (
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              {groups.booleans.map(renderField)}
            </div>
          ) : null}
        </FormGroup>
      ) : null}
    </EntityForm>
  )
}
