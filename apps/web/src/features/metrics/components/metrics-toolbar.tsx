import { useState } from 'react'
import { ChevronDownIcon, SlidersHorizontalIcon } from 'lucide-react'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import { AggregationToggle } from '@/components/shared/aggregation-toggle'
import { FilterChips } from '@/components/shared/filter-chips'
import type { FilterChip } from '@/components/shared/filter-chips'
import { messages } from '@/lib/i18n'
import type { FilterCatalogs } from '../domain/indicators'
import { EMPTY_FILTERS } from '../domain/metrics'
import { formatRangeLabel, rangeForDays } from '../domain/period'
import type { MetricsFilters } from '../domain/metrics'
import { metricsMessages } from '../i18n'
import {
  CatalogFilterSelect,
  DateRangeFields,
  QuickRanges,
  filterSelects,
} from './metrics-filter-fields'
import type { FilterField } from './metrics-filter-fields'

const t = metricsMessages.filters

function CatalogFilterButton({
  activeCount,
  open,
  onToggle,
}: {
  activeCount: number
  open: boolean
  onToggle: () => void
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className="min-h-11"
      aria-expanded={open}
      aria-controls={open ? 'metrics-catalog-filters' : undefined}
      onClick={onToggle}
    >
      <SlidersHorizontalIcon className="size-4" />
      {t.title}
      {activeCount > 0 ? (
        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-secondary px-1.5 text-xs text-secondary-foreground">
          {activeCount}
        </span>
      ) : null}
      <ChevronDownIcon
        className={cn('size-4 transition-transform', open && 'rotate-180')}
      />
    </Button>
  )
}

function CatalogFilterPanel({
  fields,
  filters,
  onFiltersChange,
}: {
  fields: FilterField[]
  filters: MetricsFilters
  onFiltersChange: (filters: MetricsFilters) => void
}) {
  return (
    <div
      id="metrics-catalog-filters"
      className="grid gap-3 border-t pt-3 sm:grid-cols-2 lg:grid-cols-4"
    >
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
    </div>
  )
}

function buildChips(
  filters: MetricsFilters,
  catalogs: FilterCatalogs,
  onFiltersChange: (filters: MetricsFilters) => void,
): FilterChip[] {
  const chips: FilterChip[] = []
  const update = (patch: Partial<MetricsFilters>) =>
    onFiltersChange({ ...filters, ...patch })
  if (filters.from || filters.to) {
    const range =
      filters.from && filters.to
        ? formatRangeLabel(filters.from, filters.to)
        : filters.from || filters.to
    chips.push({
      key: 'range',
      label: `${t.range}: ${range}`,
      onRemove: () => update({ from: '', to: '' }),
    })
  }
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

function ToolbarForm({
  filters,
  catalogs,
  onRange,
  onFiltersChange,
}: {
  filters: MetricsFilters
  catalogs: FilterCatalogs
  onRange: (days: number | null) => void
  onFiltersChange: (filters: MetricsFilters) => void
}) {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const fields = filterSelects(catalogs)
  const activeCatalogs = fields.filter((field) => filters[field.key]).length

  return (
    <form
      onSubmit={(event) => event.preventDefault()}
      className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:p-4"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <QuickRanges filters={filters} onRange={onRange} />
          <DateRangeFields
            filters={filters}
            onFiltersChange={onFiltersChange}
          />
          <CatalogFilterButton
            activeCount={activeCatalogs}
            open={filtersOpen}
            onToggle={() => setFiltersOpen((open) => !open)}
          />
        </div>
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <span className="text-xs text-muted-foreground">
            {messages.aggregation.label}
          </span>
          <AggregationToggle />
        </div>
      </div>
      {filtersOpen ? (
        <CatalogFilterPanel
          fields={fields}
          filters={filters}
          onFiltersChange={onFiltersChange}
        />
      ) : null}
      <FilterChips
        items={buildChips(filters, catalogs, onFiltersChange)}
        removeLabel={t.remove}
        clearLabel={t.clear}
        onClear={() => onFiltersChange(EMPTY_FILTERS)}
      />
    </form>
  )
}

interface MetricsToolbarProps {
  filters: MetricsFilters
  catalogs: FilterCatalogs
  onFiltersChange: (filters: MetricsFilters) => void
}

/** Barra de filtros del tablero (contexto compacto). */
export function MetricsToolbar({
  filters,
  catalogs,
  onFiltersChange,
}: MetricsToolbarProps) {
  const onRange = (days: number | null) => {
    if (days === null) {
      onFiltersChange({ ...filters, from: '', to: '' })
    } else {
      onFiltersChange({ ...filters, ...rangeForDays(days, new Date()) })
    }
  }

  return (
    <ToolbarForm
      filters={filters}
      catalogs={catalogs}
      onRange={onRange}
      onFiltersChange={onFiltersChange}
    />
  )
}
