import type { ChangeEvent } from 'react'
import { Button } from '@/components/ui/button'
import { SelectField, TextField } from '@/components/shared/form-fields'
import type { SelectOption } from '@/components/shared/form-fields'
import type { CategoryOption, Option } from '@/features/catalogs'
import { TICKET_STATUSES } from '../domain/types'
import { statusLabels, ticketMessages } from '../i18n'
import { ticketStatusSchema } from '../schemas'
import type { TicketListSearch } from '../schemas'

const statusOptions = TICKET_STATUSES.map((status) => ({
  value: status,
  label: statusLabels[status],
}))

interface FilterSelect {
  id: string
  label: string
  options: SelectOption[]
  value: string
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void
}

function buildFilterSelects(
  value: TicketListSearch,
  buildings: Option[],
  categories: CategoryOption[],
  apply: (patch: Partial<TicketListSearch>) => void,
): FilterSelect[] {
  const { filters } = ticketMessages.list
  return [
    {
      id: 'filter-status',
      label: filters.status,
      options: statusOptions,
      value: value.status ?? '',
      onChange: (event) => {
        const parsed = ticketStatusSchema.safeParse(event.target.value)
        apply({ status: parsed.success ? parsed.data : undefined })
      },
    },
    {
      id: 'filter-building',
      label: filters.building,
      options: buildings.map((b) => ({ value: b.id, label: b.name })),
      value: value.buildingId ?? '',
      onChange: (event) =>
        apply({ buildingId: event.target.value || undefined }),
    },
    {
      id: 'filter-category',
      label: filters.category,
      options: categories.map((c) => ({ value: c.id, label: c.name })),
      value: value.categoryId ?? '',
      onChange: (event) =>
        apply({ categoryId: event.target.value || undefined }),
    },
  ]
}

interface TicketFiltersProps {
  value: TicketListSearch
  onChange: (next: TicketListSearch) => void
  buildings: Option[]
  categories: CategoryOption[]
}

export function TicketFilters({
  value,
  onChange,
  buildings,
  categories,
}: TicketFiltersProps) {
  const { filters } = ticketMessages.list

  function apply(patch: Partial<TicketListSearch>) {
    onChange({ ...value, ...patch, page: 1 })
  }

  const selects = buildFilterSelects(value, buildings, categories, apply)

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        const raw = String(data.get('search') ?? '').trim()
        apply({ search: raw || undefined })
      }}
    >
      <div className="min-w-56 flex-1">
        <TextField
          key={value.search ?? ''}
          id="filter-search"
          name="search"
          type="search"
          label={filters.search}
          defaultValue={value.search ?? ''}
        />
      </div>
      {selects.map((select) => (
        <div key={select.id} className="w-44">
          <SelectField {...select} placeholder={filters.all} />
        </div>
      ))}
      <Button type="submit" variant="secondary" className="min-h-11">
        {filters.search}
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="min-h-11"
        onClick={() => onChange({ page: 1 })}
      >
        {filters.clear}
      </Button>
    </form>
  )
}
