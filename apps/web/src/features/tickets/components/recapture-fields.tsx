import { SelectField, TextAreaField } from '@/components/shared/form-fields'
import type { SelectOption } from '@/components/shared/form-fields'
import type {
  CategoryOption,
  Option,
  ProblemOption,
  ReasonOption,
  SubcategoryOption,
} from '@/features/catalogs'
import type { RecaptureValues } from '../domain/recapture'
import { ticketMessages } from '../i18n'

interface RecaptureCatalogs {
  buildings: Option[]
  locations: Option[]
  dependencies: Option[]
  categories: CategoryOption[]
  subcategories: SubcategoryOption[]
  problems: ProblemOption[]
  serviceTypes: Option[]
  priorities: Option[]
  reasons: ReasonOption[]
}

interface RecaptureFieldsProps extends RecaptureCatalogs {
  values: RecaptureValues
  onChange: (name: keyof RecaptureValues, value: string) => void
}

const toOptions = (items: Option[]): SelectOption[] =>
  items.map((item) => ({ value: item.id, label: item.name }))

function RecaptureSelects({
  values,
  onChange,
  buildings,
  locations,
  dependencies,
  categories,
  subcategories,
  problems,
  serviceTypes,
  priorities,
  reasons,
}: RecaptureFieldsProps) {
  const { create, actionFields } = ticketMessages
  const field = create.fields
  const selects: {
    id: keyof RecaptureValues
    label: string
    options: SelectOption[]
  }[] = [
    { id: 'buildingId', label: field.building, options: toOptions(buildings) },
    { id: 'locationId', label: field.location, options: toOptions(locations) },
    {
      id: 'dependencyId',
      label: field.dependency,
      options: toOptions(dependencies),
    },
    { id: 'categoryId', label: field.category, options: toOptions(categories) },
    {
      id: 'subcategoryId',
      label: field.subcategory,
      options: toOptions(subcategories),
    },
    { id: 'problemId', label: field.problem, options: toOptions(problems) },
    {
      id: 'serviceTypeId',
      label: field.serviceType,
      options: toOptions(serviceTypes),
    },
    { id: 'priorityId', label: field.priority, options: toOptions(priorities) },
    { id: 'reasonId', label: actionFields.reason, options: toOptions(reasons) },
  ]

  return (
    <>
      {selects.map((select) => (
        <SelectField
          key={select.id}
          id={`recapture-${select.id}`}
          label={select.label}
          placeholder={field.selectPlaceholder}
          options={select.options}
          value={values[select.id]}
          onChange={(event) => onChange(select.id, event.target.value)}
        />
      ))}
    </>
  )
}

/** Campos de la recaptura: la captura del tiquet más el motivo. */
export function RecaptureFields(props: RecaptureFieldsProps) {
  const { actionFields, create } = ticketMessages
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <RecaptureSelects {...props} />
      <TextAreaField
        id="recapture-description"
        label={create.fields.description}
        rows={3}
        value={props.values.description}
        onChange={(event) => props.onChange('description', event.target.value)}
        className="sm:col-span-2"
      />
      <TextAreaField
        id="recapture-note"
        label={actionFields.note}
        rows={2}
        value={props.values.note}
        onChange={(event) => props.onChange('note', event.target.value)}
        className="sm:col-span-2"
      />
    </div>
  )
}
