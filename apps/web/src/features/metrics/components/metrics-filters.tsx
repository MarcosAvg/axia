import { ChevronDownIcon, SlidersHorizontalIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import type { FilterChip } from '@/components/shared/filter-chips'
import type { FilterCatalogs } from '../domain/indicators'
import type { MetricsFilters } from '../domain/metrics'
import { metricsMessages } from '../i18n'
import { CatalogFilterSelect, filterSelects } from './metrics-filter-fields'
import type { FilterField } from './metrics-filter-fields'

const t = metricsMessages.filters

function FiltersPanel({
  fields,
  filters,
  activeCount,
  onFiltersChange,
}: {
  fields: FilterField[]
  filters: MetricsFilters
  activeCount: number
  onFiltersChange: (filters: MetricsFilters) => void
}) {
  return (
    <div className="grid gap-3">
      {fields.map((field) => (
        <CatalogFilterSelect
          key={field.key}
          field={field}
          value={filters[field.key]}
          onChange={(value) =>
            onFiltersChange({ ...filters, [field.key]: value })
          }
        />
      ))}
      <Button
        type="button"
        variant="ghost"
        className="min-h-11 lg:min-h-9"
        disabled={activeCount === 0}
        onClick={() =>
          onFiltersChange({
            ...filters,
            buildingId: '',
            teamId: '',
            categoryId: '',
            dependencyId: '',
            outcome: '',
          })
        }
      >
        {t.clear}
      </Button>
    </div>
  )
}

export function FiltersPopover({
  filters,
  catalogs,
  onFiltersChange,
}: {
  filters: MetricsFilters
  catalogs: FilterCatalogs
  onFiltersChange: (filters: MetricsFilters) => void
}) {
  const fields = filterSelects(catalogs)
  const activeCount = fields.filter((field) => filters[field.key]).length
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="min-h-11 lg:min-h-9">
          <SlidersHorizontalIcon className="size-4" />
          {t.title}
          {activeCount > 0 ? (
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-secondary px-1.5 text-xs text-secondary-foreground">
              {activeCount}
            </span>
          ) : null}
          <ChevronDownIcon className="size-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        id="metrics-catalog-filters"
        className="w-80"
        aria-label={t.title}
      >
        <FiltersPanel
          fields={fields}
          filters={filters}
          activeCount={activeCount}
          onFiltersChange={onFiltersChange}
        />
      </PopoverContent>
    </Popover>
  )
}

export function buildChips(
  filters: MetricsFilters,
  catalogs: FilterCatalogs,
  onFiltersChange: (filters: MetricsFilters) => void,
): FilterChip[] {
  const chips: FilterChip[] = []
  const update = (patch: Partial<MetricsFilters>) =>
    onFiltersChange({ ...filters, ...patch })
  for (const field of filterSelects(catalogs)) {
    const value = filters[field.key]
    if (!value) continue
    const name = field.items.find((item) => item.id === value)?.name ?? value
    chips.push({
      key: field.key,
      label: name,
      onRemove: () => update({ [field.key]: '' }),
    })
  }
  return chips
}
