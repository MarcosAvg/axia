import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { SelectField, TextField } from '@/components/shared/form-fields'
import type { AdminField } from '../domain/catalogs'
import {
  TARGET_UNITS,
  amountFor,
  deriveTargetUnit,
  minutesFrom,
} from '../domain/target'
import type { TargetUnit } from '../domain/target'
import type { AdminOption } from '../hooks/use-admin-catalog'
import { adminMessages } from '../i18n'

interface CatalogFieldInputProps {
  field: AdminField
  value: string | number | boolean | null
  options: AdminOption[]
  error?: string
  onChange: (value: string | number | boolean) => void
}

const unitLabels = adminMessages.targetUnits
const unitOptions = TARGET_UNITS.map((value) => ({
  value,
  label: unitLabels[value],
}))

function toMinutes(value: CatalogFieldInputProps['value']): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function MinutesField({
  field,
  value,
  error,
  onChange,
}: CatalogFieldInputProps) {
  const minutes = toMinutes(value)
  const [unit, setUnit] = useState<TargetUnit>(() => deriveTargetUnit(minutes))
  const [amount, setAmount] = useState(() =>
    amountFor(minutes, deriveTargetUnit(minutes)),
  )

  function update(nextAmount: string, nextUnit: TargetUnit) {
    setAmount(nextAmount)
    setUnit(nextUnit)
    const result = minutesFrom(nextAmount, nextUnit)
    onChange(result === null ? '' : String(result))
  }

  return (
    <div className="flex flex-wrap items-start gap-2">
      <div className="min-w-32 flex-1">
        <TextField
          id={`field-${field.name}`}
          type="number"
          label={field.label}
          value={amount}
          error={error}
          onChange={(event) => update(event.target.value, unit)}
        />
      </div>
      <div className="w-32">
        <SelectField
          id={`field-${field.name}-unit`}
          label={adminMessages.fields.target_unit}
          options={unitOptions}
          value={unit}
          onChange={(event) => update(amount, event.target.value as TargetUnit)}
        />
      </div>
    </div>
  )
}

function BooleanField({ field, value, onChange }: CatalogFieldInputProps) {
  const id = `field-${field.name}`
  return (
    <div className="flex min-h-11 items-center gap-2">
      <Checkbox
        id={id}
        checked={Boolean(value)}
        onCheckedChange={(checked) => onChange(checked === true)}
      />
      <label htmlFor={id} className="text-sm">
        {field.label}
      </label>
    </div>
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
  if (props.field.kind === 'minutes') return <MinutesField {...props} />
  if (
    props.field.kind === 'select-table' ||
    props.field.kind === 'select-fixed'
  ) {
    return <SelectInput {...props} />
  }
  return <PlainInput {...props} />
}
