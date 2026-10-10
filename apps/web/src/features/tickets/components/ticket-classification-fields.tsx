import { SelectField } from '@/components/shared/form-fields'
import type { SelectOption } from '@/components/shared/form-fields'
import type {
  CategoryOption,
  Option,
  ProblemOption,
  SubcategoryOption,
} from '@/features/catalogs'
import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import type { CreateTicketInput } from '../schemas'
import { ticketMessages } from '../i18n'

type ClassificationField =
  'categoryId' | 'subcategoryId' | 'problemId' | 'channelId'

interface TicketClassificationFieldsProps {
  register: UseFormRegister<CreateTicketInput>
  errors: FieldErrors<CreateTicketInput>
  categories: CategoryOption[]
  subcategories: SubcategoryOption[]
  problems: ProblemOption[]
  channels: Option[]
  showChannel: boolean
}

/** Clasificación del alta: categoría, subcategoría y problema. La prioridad se
 * deriva del problema y el tipo de servicio se captura en la atención. */
export function TicketClassificationFields({
  register,
  errors,
  categories,
  subcategories,
  problems,
  channels,
  showChannel,
}: TicketClassificationFieldsProps) {
  const { fields } = ticketMessages.create
  const toOptions = (items: Option[]): SelectOption[] =>
    items.map((item) => ({ value: item.id, label: item.name }))

  const selects: {
    id: ClassificationField
    label: string
    options: SelectOption[]
  }[] = [
    {
      id: 'categoryId',
      label: fields.category,
      options: toOptions(categories),
    },
    {
      id: 'subcategoryId',
      label: fields.subcategory,
      options: toOptions(subcategories),
    },
    { id: 'problemId', label: fields.problem, options: toOptions(problems) },
  ]
  if (showChannel) {
    selects.push({
      id: 'channelId',
      label: fields.channel,
      options: toOptions(channels),
    })
  }

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
