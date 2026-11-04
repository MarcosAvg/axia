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
  fixedDependencyId?: string
  fixedDependencyName?: string | null
  disabled: boolean
  needsRequester: boolean
}

function placeSelects(
  buildings: Option[],
  locations: Option[],
): {
  id: 'buildingId' | 'locationId'
  label: string
  options: SelectOption[]
}[] {
  const { fields } = ticketMessages.create
  return [
    {
      id: 'buildingId',
      label: fields.building,
      options: buildings.map((building) => ({
        value: building.id,
        label: building.name,
      })),
    },
    {
      id: 'locationId',
      label: fields.location,
      options: locations.map((location) => ({
        value: location.id,
        label: location.name,
      })),
    },
  ]
}

function PlaceSelects({
  register,
  errors,
  buildings,
  locations,
  disabled,
}: Pick<
  TicketLocationFieldsProps,
  'register' | 'errors' | 'buildings' | 'locations' | 'disabled'
>) {
  const { fields } = ticketMessages.create
  return (
    <>
      {placeSelects(buildings, locations).map((select) => (
        <SelectField
          key={select.id}
          id={select.id}
          label={select.label}
          placeholder={fields.selectPlaceholder}
          options={select.options}
          error={errors[select.id]?.message}
          disabled={disabled}
          {...register(select.id)}
        />
      ))}
    </>
  )
}

function FixedDependency({
  name,
  error,
}: {
  name: string | null | undefined
  error?: string
}) {
  const { fields } = ticketMessages.create
  return (
    <div className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{fields.dependency}</span>
      <span className="text-muted-foreground">{name ?? '—'}</span>
      <span className="text-xs text-muted-foreground">
        {fields.dependencyFromRequester}
      </span>
      {error ? (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      ) : null}
    </div>
  )
}

function DependencySelect({
  register,
  errors,
  dependencies,
  disabled,
}: Pick<
  TicketLocationFieldsProps,
  'register' | 'errors' | 'dependencies' | 'disabled'
>) {
  const { fields } = ticketMessages.create
  return (
    <SelectField
      id="dependencyId"
      label={fields.dependency}
      placeholder={fields.selectPlaceholder}
      options={dependencies.map((dependency) => ({
        value: dependency.id,
        label: dependency.name,
      }))}
      error={errors.dependencyId?.message}
      disabled={disabled}
      {...register('dependencyId')}
    />
  )
}

export function TicketLocationFields({
  register,
  errors,
  buildings,
  locations,
  dependencies,
  fixedDependencyId,
  fixedDependencyName,
  disabled,
  needsRequester,
}: TicketLocationFieldsProps) {
  const { fields } = ticketMessages.create
  return (
    <>
      <fieldset className="grid gap-4 sm:grid-cols-3">
        <PlaceSelects
          register={register}
          errors={errors}
          buildings={buildings}
          locations={locations}
          disabled={disabled}
        />
        {fixedDependencyId ? (
          <FixedDependency
            name={fixedDependencyName}
            error={errors.dependencyId?.message}
          />
        ) : (
          <DependencySelect
            register={register}
            errors={errors}
            dependencies={dependencies}
            disabled={disabled}
          />
        )}
      </fieldset>
      {needsRequester ? (
        <p className="text-xs text-muted-foreground">
          {fields.locationNeedsRequester}
        </p>
      ) : null}
    </>
  )
}
