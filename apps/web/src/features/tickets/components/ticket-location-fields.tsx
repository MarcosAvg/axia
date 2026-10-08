import { SelectField } from '@/components/shared/form-fields'
import type { SelectOption } from '@/components/shared/form-fields'
import type { Option } from '@/features/catalogs'
import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import type { CreateTicketInput } from '../schemas'
import { ticketMessages } from '../i18n'

interface TicketFieldGroupProps {
  register: UseFormRegister<CreateTicketInput>
  errors: FieldErrors<CreateTicketInput>
}

interface TicketLocationFieldsProps extends TicketFieldGroupProps {
  buildings: Option[]
  locations: Option[]
  dependencies: Option[]
}

export function TicketLocationFields({
  register,
  errors,
  buildings,
  locations,
  dependencies,
}: TicketLocationFieldsProps) {
  const { fields } = ticketMessages.create
  const selects: {
    id: 'buildingId' | 'locationId' | 'dependencyId'
    label: string
    options: SelectOption[]
  }[] = [
    {
      id: 'buildingId',
      label: fields.building,
      options: buildings.map((b) => ({ value: b.id, label: b.name })),
    },
    {
      id: 'locationId',
      label: fields.location,
      options: locations.map((l) => ({ value: l.id, label: l.name })),
    },
    {
      id: 'dependencyId',
      label: fields.dependency,
      options: dependencies.map((d) => ({ value: d.id, label: d.name })),
    },
  ]

  return (
    <fieldset className="grid gap-4 sm:grid-cols-3">
      {selects.map((select) => (
        <SelectField
          key={select.id}
          id={select.id}
          label={select.label}
          placeholder={fields.selectPlaceholder}
          options={select.options}
          error={errors[select.id]?.message}
          {...register(select.id)}
        />
      ))}
    </fieldset>
  )
}
