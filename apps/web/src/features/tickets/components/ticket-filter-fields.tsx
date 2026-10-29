import { SelectField } from '@/components/shared/form-fields'
import type { SelectOption } from '@/components/shared/form-fields'
import type { CategoryOption, Option } from '@/features/catalogs'
import { TICKET_STATUSES } from '../domain/types'
import { statusLabels, ticketMessages } from '../i18n'
import { ticketStatusSchema } from '../schemas'
import type { TicketListSearch } from '../schemas'

const list = ticketMessages.list
const statusOptions = TICKET_STATUSES.map((status) => ({
  value: status,
  label: statusLabels[status],
}))

export interface FilterSelect {
  id: string
  label: string
  options: SelectOption[]
  value: string
}

export interface FilterFieldsProps {
  value: TicketListSearch
  buildings: Option[]
  categories: CategoryOption[]
  onApply: (patch: Partial<TicketListSearch>) => void
}

export function buildFilterSelects(
  value: TicketListSearch,
  buildings: Option[],
  categories: CategoryOption[],
): FilterSelect[] {
  return [
    {
      id: 'filter-status',
      label: list.filters.status,
      options: statusOptions,
      value: value.status ?? '',
    },
    {
      id: 'filter-building',
      label: list.filters.building,
      options: buildings.map((item) => ({ value: item.id, label: item.name })),
      value: value.buildingId ?? '',
    },
    {
      id: 'filter-category',
      label: list.filters.category,
      options: categories.map((item) => ({ value: item.id, label: item.name })),
      value: value.categoryId ?? '',
    },
  ]
}

export function readFilterValues(form: FormData): Partial<TicketListSearch> {
  const raw = String(form.get('search') ?? '').trim()
  const status = ticketStatusSchema.safeParse(form.get('filter-status'))
  const buildingId = String(form.get('filter-building') ?? '')
  const categoryId = String(form.get('filter-category') ?? '')
  return {
    search: raw || undefined,
    status: status.success ? status.data : undefined,
    buildingId: buildingId || undefined,
    categoryId: categoryId || undefined,
  }
}

export function readSelectValues(form: FormData): Partial<TicketListSearch> {
  const status = ticketStatusSchema.safeParse(form.get('filter-status'))
  const buildingId = String(form.get('filter-building') ?? '')
  const categoryId = String(form.get('filter-category') ?? '')
  return {
    status: status.success ? status.data : undefined,
    buildingId: buildingId || undefined,
    categoryId: categoryId || undefined,
  }
}

export function FilterSelectFields({
  selects,
  className = 'w-full',
}: {
  selects: FilterSelect[]
  className?: string
}) {
  return selects.map((select) => (
    <div key={`${select.id}:${select.value}`} className={className}>
      <SelectField
        id={select.id}
        label={select.label}
        options={select.options}
        name={select.id}
        defaultValue={select.value}
        placeholder={list.filters.all}
      />
    </div>
  ))
}
