import { FilterChips } from '@/components/shared/filter-chips'
import type { FilterChip } from '@/components/shared/filter-chips'
import { TextField } from '@/components/shared/form-fields'
import { Button } from '@/components/ui/button'
import type { CategoryOption, Option } from '@/features/catalogs'
import { useMediaQuery } from '@/lib/use-media-query'
import { statusLabels, ticketMessages } from '../i18n'
import type { TicketListSearch } from '../schemas'
import {
  buildFilterSelects,
  FilterSelectFields,
  readFilterValues,
} from './ticket-filter-fields'
import type { FilterFieldsProps } from './ticket-filter-fields'
import { MobileFilterFields } from './ticket-filters-mobile'

const list = ticketMessages.list

type Apply = (patch: Partial<TicketListSearch>) => void

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

function DesktopFilterFields({
  value,
  buildings,
  categories,
  onApply,
}: FilterFieldsProps) {
  const selects = buildFilterSelects(value, buildings, categories)

  return (
    <form
      className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4"
      onSubmit={(event) => {
        event.preventDefault()
        onApply(readFilterValues(new FormData(event.currentTarget)))
      }}
    >
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
      <FilterSelectFields selects={selects} className="w-44" />
      <Button type="submit" variant="secondary" className="min-h-11">
        {list.filters.search}
      </Button>
    </form>
  )
}

function FilterFields(props: FilterFieldsProps) {
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  return isDesktop ? (
    <DesktopFilterFields {...props} />
  ) : (
    <MobileFilterFields {...props} />
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
