import type { ChangeEvent } from 'react'
import { FilterChips } from '@/components/shared/filter-chips'
import type { FilterChip } from '@/components/shared/filter-chips'
import { SelectField, TextField } from '@/components/shared/form-fields'
import type { SelectOption } from '@/components/shared/form-fields'
import { Button } from '@/components/ui/button'
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

type Apply = (patch: Partial<TicketListSearch>) => void

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
  apply: Apply,
): FilterSelect[] {
  return [
    {
      id: 'filter-status',
      label: list.filters.status,
      options: statusOptions,
      value: value.status ?? '',
      onChange: (event) => {
        const parsed = ticketStatusSchema.safeParse(event.target.value)
        apply({ status: parsed.success ? parsed.data : undefined })
      },
    },
    {
      id: 'filter-building',
      label: list.filters.building,
      options: buildings.map((item) => ({ value: item.id, label: item.name })),
      value: value.buildingId ?? '',
      onChange: (event) =>
        apply({ buildingId: event.target.value || undefined }),
    },
    {
      id: 'filter-category',
      label: list.filters.category,
      options: categories.map((item) => ({ value: item.id, label: item.name })),
      value: value.categoryId ?? '',
      onChange: (event) =>
        apply({ categoryId: event.target.value || undefined }),
    },
  ]
}

function buildChips(
  value: TicketListSearch,
  buildings: Option[],
  categories: CategoryOption[],
  apply: Apply,
): FilterChip[] {
  const chips: FilterChip[] = []
  if (value.search) {
    chips.push({
      key: 'search',
      label: `“${value.search}”`,
      onRemove: () => apply({ search: undefined }),
    })
  }
  if (value.status) {
    chips.push({
      key: 'status',
      label: statusLabels[value.status],
      onRemove: () => apply({ status: undefined }),
    })
  }
  if (value.buildingId) {
    chips.push({
      key: 'building',
      label: buildings.find((item) => item.id === value.buildingId)?.name ?? '',
      onRemove: () => apply({ buildingId: undefined }),
    })
  }
  if (value.categoryId) {
    chips.push({
      key: 'category',
      label:
        categories.find((item) => item.id === value.categoryId)?.name ?? '',
      onRemove: () => apply({ categoryId: undefined }),
    })
  }
  return chips
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
  function apply(patch: Partial<TicketListSearch>) {
    onChange({ ...value, ...patch, page: 1 })
  }

  const selects = buildFilterSelects(value, buildings, categories, apply)
  const chips = buildChips(value, buildings, categories, apply)

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        const raw = String(data.get('search') ?? '').trim()
        apply({ search: raw || undefined })
      }}
    >
      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
        <div className="min-w-56 flex-1">
          <TextField
            key={value.search ?? ''}
            id="filter-search"
            name="search"
            type="search"
            label={list.filters.search}
            placeholder={list.filters.searchPlaceholder}
            defaultValue={value.search ?? ''}
          />
        </div>
        {selects.map((select) => (
          <div key={select.id} className="w-44">
            <SelectField {...select} placeholder={list.filters.all} />
          </div>
        ))}
        <Button type="submit" variant="secondary" className="min-h-11">
          {list.filters.search}
        </Button>
      </div>
      <FilterChips
        items={chips}
        removeLabel={list.filters.remove}
        clearLabel={list.filters.clear}
        onClear={() => onChange({ page: 1 })}
      />
    </form>
  )
}
