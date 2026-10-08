import { SelectField, TextField } from '@/components/shared/form-fields'
import type { AdminField } from '../domain/catalogs'
import type { AdminOption } from '../hooks/use-admin-catalog'
import { adminMessages } from '../i18n'

interface CatalogFieldInputProps {
  field: AdminField
  value: string | number | boolean | null
  options: AdminOption[]
  error?: string
  onChange: (value: string | number | boolean) => void
}

function BooleanField({ field, value, onChange }: CatalogFieldInputProps) {
  return (
    <label className="flex min-h-11 items-center gap-2 text-sm">
      <input
        type="checkbox"
        className="size-5"
        checked={Boolean(value)}
        onChange={(event) => onChange(event.target.checked)}
      />
      {field.label}
    </label>
  )
}

function SelectInput({
  field,
  value,
  options,
  error,
  onChange,
}: CatalogFieldInputProps) {
  const selectOptions =
    field.kind === 'select-fixed'
      ? (field.options ?? [])
      : options.map((option) => ({ value: option.id, label: option.label }))
  return (
    <SelectField
      id={`field-${field.name}`}
      label={field.label}
      placeholder={adminMessages.actions.selectPlaceholder}
      options={selectOptions}
      value={value === null || value === undefined ? '' : String(value)}
      error={error}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

function PlainInput({ field, value, error, onChange }: CatalogFieldInputProps) {
  return (
    <TextField
      id={`field-${field.name}`}
      label={field.label}
      type={field.kind === 'number' ? 'number' : 'text'}
      value={value === null || value === undefined ? '' : String(value)}
      error={error}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

/** Campo de un formulario de catálogo, según el tipo declarado en la configuración. */
export function CatalogFieldInput(props: CatalogFieldInputProps) {
  if (props.field.kind === 'boolean') return <BooleanField {...props} />
  if (
    props.field.kind === 'select-table' ||
    props.field.kind === 'select-fixed'
  ) {
    return <SelectInput {...props} />
  }
  return <PlainInput {...props} />
}
