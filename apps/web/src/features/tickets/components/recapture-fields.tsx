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
import { RequiredAttachmentField } from './required-attachment-field'

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
  fixedDependencyId?: string | null
  fixedDependencyName?: string | null
}

interface RecaptureFieldsProps extends RecaptureCatalogs {
  values: RecaptureValues
  onChange: (name: keyof RecaptureValues, value: string) => void
  attachmentTypes: string[]
  attachment: File | null
  onAttachmentChange: (file: File | null) => void
  attachmentError?: string | null
  attachmentInstructions?: string | null
  isUploadingAttachment: boolean
  attachmentProgress: number
}

const toOptions = (items: Option[]): SelectOption[] =>
  items.map((item) => ({ value: item.id, label: item.name }))

type RecaptureSelectData = {
  id: keyof RecaptureValues
  label: string
  options: SelectOption[]
}

function placeSelectData(
  { buildings, locations }: Pick<RecaptureCatalogs, 'buildings' | 'locations'>,
  field: typeof ticketMessages.create.fields,
): RecaptureSelectData[] {
  return [
    { id: 'buildingId', label: field.building, options: toOptions(buildings) },
    { id: 'locationId', label: field.location, options: toOptions(locations) },
  ]
}

function classificationSelectData(
  {
    categories,
    subcategories,
    problems,
    serviceTypes,
    priorities,
    reasons,
  }: Pick<
    RecaptureCatalogs,
    | 'categories'
    | 'subcategories'
    | 'problems'
    | 'serviceTypes'
    | 'priorities'
    | 'reasons'
  >,
  field: typeof ticketMessages.create.fields,
  reasonLabel: string,
): RecaptureSelectData[] {
  return [
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
    { id: 'reasonId', label: reasonLabel, options: toOptions(reasons) },
  ]
}

function FixedDependency({ name }: { name: string | null | undefined }) {
  const { fields } = ticketMessages.create
  return (
    <div className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{fields.dependency}</span>
      <span className="text-muted-foreground">{name ?? '—'}</span>
      <span className="text-xs text-muted-foreground">
        {fields.dependencyFromRequester}
      </span>
    </div>
  )
}

function RecaptureSelects(props: RecaptureFieldsProps) {
  const { create, actionFields } = ticketMessages
  const field = create.fields
  const render = (select: RecaptureSelectData) => (
    <SelectField
      key={select.id}
      id={`recapture-${select.id}`}
      label={select.label}
      placeholder={field.selectPlaceholder}
      options={select.options}
      value={props.values[select.id]}
      onChange={(event) => props.onChange(select.id, event.target.value)}
    />
  )
  return (
    <>
      {placeSelectData(props, field).map(render)}
      {props.fixedDependencyId ? (
        <FixedDependency name={props.fixedDependencyName} />
      ) : (
        render({
          id: 'dependencyId',
          label: field.dependency,
          options: toOptions(props.dependencies),
        })
      )}
      {classificationSelectData(props, field, actionFields.reason).map(render)}
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
      <div className="sm:col-span-2">
        <RequiredAttachmentField
          types={props.attachmentTypes}
          file={props.attachment}
          error={props.attachmentError ?? undefined}
          hint={props.attachmentInstructions}
          onChange={props.onAttachmentChange}
        />
        {props.isUploadingAttachment ? (
          <p className="text-sm text-muted-foreground" role="status">
            {ticketMessages.create.attachmentUploading}{' '}
            {props.attachmentProgress}%
          </p>
        ) : null}
      </div>
    </div>
  )
}
