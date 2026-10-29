import { useState } from 'react'
import { SlidersHorizontalIcon } from 'lucide-react'
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
}

function buildFilterSelects(
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

interface FilterFieldsProps {
  value: TicketListSearch
  buildings: Option[]
  categories: CategoryOption[]
  onApply: (patch: Partial<TicketListSearch>) => void
}

function AdvancedFilterFields({
  selects,
  open,
}: {
  selects: FilterSelect[]
  open: boolean
}) {
  return (
    <div
      id="ticket-advanced-filters"
      className={open ? 'contents' : 'hidden lg:contents'}
    >
      {selects.map((select) => (
        <div key={`${select.id}:${select.value}`} className="w-full sm:w-44">
          <SelectField
            id={select.id}
            label={select.label}
            options={select.options}
            name={select.id}
            defaultValue={select.value}
            placeholder={list.filters.all}
          />
        </div>
      ))}
    </div>
  )
}

function readFilterValues(form: FormData): Partial<TicketListSearch> {
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

function FilterFields({
  value,
  buildings,
  categories,
  onApply,
}: FilterFieldsProps) {
  const [showFilters, setShowFilters] = useState(false)
  const selects = buildFilterSelects(value, buildings, categories)
  return (
    <form
      className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4"
      onSubmit={(event) => {
        event.preventDefault()
        onApply(readFilterValues(new FormData(event.currentTarget)))
        setShowFilters(false)
      }}
    >
      <div className="flex w-full items-end gap-2 lg:w-auto lg:flex-1">
        <div className="min-w-0 flex-1 lg:min-w-56">
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
        <Button
          type="button"
          variant="outline"
          className="min-h-11 lg:hidden"
          aria-expanded={showFilters}
          aria-controls="ticket-advanced-filters"
          onClick={() => setShowFilters((open) => !open)}
        >
          <SlidersHorizontalIcon />
          {list.filters.more}
        </Button>
      </div>
      <AdvancedFilterFields selects={selects} open={showFilters} />
      <Button
        type="submit"
        variant="secondary"
        className="min-h-11 w-full sm:w-auto"
      >
        {list.filters.search}
      </Button>
    </form>
  )
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

  const chips = buildChips(value, buildings, categories, apply)

  return (
    <div className="flex flex-col gap-3">
      <FilterFields
        value={value}
        buildings={buildings}
        categories={categories}
        onApply={apply}
      />
      <FilterChips
        items={chips}
        removeLabel={list.filters.remove}
        clearLabel={list.filters.clear}
        onClear={() => onChange({ page: 1 })}
      />
    </div>
  )
}
