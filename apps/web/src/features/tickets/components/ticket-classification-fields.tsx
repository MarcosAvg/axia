import { useWatch } from 'react-hook-form'
import type { UseFormReturn } from 'react-hook-form'
import { SelectField, TextField } from '@/components/shared/form-fields'
import type { SelectOption } from '@/components/shared/form-fields'
import { useProblemSearchCatalog } from '@/features/catalogs'
import type {
  CategoryOption,
  Option,
  ProblemOption,
  ProblemSearchOption,
  SubcategoryOption,
} from '@/features/catalogs'
import type { CreateTicketInput } from '../schemas'
import { ticketMessages } from '../i18n'
import { TicketProblemSearch } from './ticket-problem-search'

type ClassificationField =
  'categoryId' | 'subcategoryId' | 'problemId' | 'channelId'
type ClassificationSelect = {
  id: ClassificationField
  label: string
  options: SelectOption[]
}

interface TicketClassificationFieldsProps {
  form: UseFormReturn<CreateTicketInput>
  categories: CategoryOption[]
  subcategories: SubcategoryOption[]
  problems: ProblemOption[]
  channels: Option[]
  showChannel: boolean
  platformChannelName?: string | null
}

function toOptions(items: Option[], selected?: Option): SelectOption[] {
  const options = items.map((item) => ({ value: item.id, label: item.name }))
  if (selected && !items.some(({ id }) => id === selected.id)) {
    options.push({ value: selected.id, label: selected.name })
  }
  return options
}

function classificationOptions(
  props: TicketClassificationFieldsProps,
  selected?: ProblemSearchOption,
): ClassificationSelect[] {
  const { fields } = ticketMessages.create
  const subcategory = selected
    ? { id: selected.subcategoryId, name: selected.subcategoryName }
    : undefined
  const selects: ClassificationSelect[] = [
    {
      id: 'categoryId',
      label: fields.category,
      options: toOptions(
        props.categories,
        selected
          ? {
              id: selected.categoryId,
              name: selected.categoryName,
            }
          : undefined,
      ),
    },
    {
      id: 'subcategoryId',
      label: fields.subcategory,
      options: toOptions(props.subcategories, subcategory),
    },
    {
      id: 'problemId',
      label: fields.problem,
      options: toOptions(props.problems, selected),
    },
  ]
  if (props.showChannel)
    selects.push({
      id: 'channelId',
      label: fields.channel,
      options: toOptions(props.channels),
    })
  return selects
}

function ClassificationSelectField({
  select,
  form,
  value,
}: {
  select: ClassificationSelect
  form: UseFormReturn<CreateTicketInput>
  value: string
}) {
  const registration = form.register(select.id)
  return (
    <SelectField
      id={select.id}
      label={select.label}
      placeholder={ticketMessages.create.fields.selectPlaceholder}
      options={select.options}
      error={form.formState.errors[select.id]?.message}
      {...registration}
      value={value}
      onChange={(event) => {
        void registration.onChange(event)
        if (select.id === 'categoryId')
          form.setValue('subcategoryId', '', { shouldDirty: true })
        if (select.id === 'categoryId' || select.id === 'subcategoryId') {
          form.setValue('problemId', '', { shouldDirty: true })
        }
      }}
    />
  )
}

/** Clasificación manual y búsqueda global del problema durante el alta. */
export function TicketClassificationFields(
  props: TicketClassificationFieldsProps,
) {
  const { form, platformChannelName } = props
  const { fields, platformChannelConfiguration } = ticketMessages.create
  const values = useWatch({ control: form.control })
  const search = useProblemSearchCatalog()
  const selected = search.data?.find(
    (problem) => problem.id === values.problemId,
  )
  const selects = classificationOptions(props, selected)

  function selectProblem(problem: ProblemSearchOption) {
    const options = { shouldDirty: true, shouldTouch: true }
    form.setValue('categoryId', problem.categoryId, options)
    form.setValue('subcategoryId', problem.subcategoryId, options)
    form.setValue('problemId', problem.id, options)
    void form.trigger(['categoryId', 'subcategoryId', 'problemId'])
  }

  return (
    <div className="space-y-4">
      <TicketProblemSearch
        problems={search.data ?? []}
        isLoading={search.isPending}
        isError={search.isError}
        onRetry={() => {
          void search.refetch()
        }}
        onSelect={selectProblem}
      />
      <fieldset className="grid gap-4 sm:grid-cols-3">
        {selects.map((select) => (
          <ClassificationSelectField
            key={select.id}
            select={select}
            form={form}
            value={values[select.id] ?? ''}
          />
        ))}
        {platformChannelName !== undefined ? (
          <TextField
            id="platform-channel"
            label={fields.channel}
            value={platformChannelName ?? ''}
            error={
              platformChannelName === null
                ? platformChannelConfiguration
                : undefined
            }
            readOnly
          />
        ) : null}
      </fieldset>
    </div>
  )
}
