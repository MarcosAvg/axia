import type { AdminTable } from '../api/admin-api'
import type { AdminField } from '../domain/catalogs'
import type { RawValues } from '../domain/form-values'
import type { AdminOption } from '../hooks/use-admin-catalog'
import { useCatalogForm } from '../hooks/use-catalog-form'
import { adminMessages } from '../i18n'
import { CatalogFieldInput } from './catalog-field-input'
import { EntityForm } from './entity-form'
import { FormGroup } from './form-group'

interface CatalogFormProps {
  fields: AdminField[]
  row?: Record<string, unknown>
  optionsFor: (table: AdminTable) => AdminOption[]
  isSaving: boolean
  onSave: (values: RawValues) => void
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
  const { raw, invalid, submit, onChange, fieldOptions } = useCatalogForm({
    fields,
    row,
    optionsFor,
    onSave,
  })
  const { form } = adminMessages
  const groups = groupFields(fields)

  const renderField = (field: AdminField) => (
    <CatalogFieldInput
      key={field.name}
      field={field}
      value={raw[field.name] ?? ''}
      options={fieldOptions(field)}
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
