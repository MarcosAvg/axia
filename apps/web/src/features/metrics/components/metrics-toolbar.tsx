import { useState } from 'react'
import {
  CalendarIcon,
  ChevronDownIcon,
  SlidersHorizontalIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { FilterChips } from '@/components/shared/filter-chips'
import type { FilterChip } from '@/components/shared/filter-chips'
import type { FilterCatalogs } from '../domain/indicators'
import { EMPTY_FILTERS } from '../domain/metrics'
import {
  formatRangeLabel,
  isQuickRangeActive,
  rangeForDays,
} from '../domain/period'
import type { MetricsFilters } from '../domain/metrics'
import { metricsMessages } from '../i18n'
import {
  CatalogFilterSelect,
  DateRangeFields,
  filterSelects,
} from './metrics-filter-fields'
import type { FilterField } from './metrics-filter-fields'

const t = metricsMessages.filters
const quick = metricsMessages.quickRanges

const QUICK_RANGES = [
  { key: 'd7' as const, days: 7 },
  { key: 'd30' as const, days: 30 },
  { key: 'd90' as const, days: 90 },
]

function periodLabel(filters: MetricsFilters): string {
  if (!filters.from && !filters.to) return quick.all
  for (const item of QUICK_RANGES) {
    if (isQuickRangeActive(filters, item.days)) return quick[item.key]
  }
  if (filters.from && filters.to) {
    return formatRangeLabel(filters.from, filters.to)
  }
  return filters.from ? `${t.from} ${filters.from}` : `${t.to} ${filters.to}`
}

function QuickRange({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <Button
      type="button"
      variant={active ? 'secondary' : 'outline'}
      aria-pressed={active}
      className="min-h-11 lg:min-h-9"
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

function PeriodPanel({
  filters,
  onRange,
  onFiltersChange,
  onClose,
}: {
  filters: MetricsFilters
  onRange: (days: number | null) => void
  onFiltersChange: (filters: MetricsFilters) => void
  onClose: () => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <QuickRange
          active={isQuickRangeActive(filters, null)}
          onClick={() => {
            onRange(null)
            onClose()
          }}
        >
          {quick.all}
        </QuickRange>
        {QUICK_RANGES.map((item) => (
          <QuickRange
            key={item.key}
            active={isQuickRangeActive(filters, item.days)}
            onClick={() => {
              onRange(item.days)
              onClose()
            }}
          >
            {quick[item.key]}
          </QuickRange>
        ))}
      </div>
      <DateRangeFields filters={filters} onFiltersChange={onFiltersChange} />
      <Button
        type="button"
        variant="secondary"
        className="min-h-11 lg:min-h-9"
        onClick={onClose}
      >
        {t.done}
      </Button>
    </div>
  )
}

function PeriodPicker({
  filters,
  onRange,
  onFiltersChange,
}: {
  filters: MetricsFilters
  onRange: (days: number | null) => void
  onFiltersChange: (filters: MetricsFilters) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 lg:min-h-9"
          aria-label={`${t.period}: ${periodLabel(filters)}`}
        >
          <CalendarIcon className="size-4" />
          <span className="max-w-48 truncate">{periodLabel(filters)}</span>
          <ChevronDownIcon className="size-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" aria-label={t.period}>
        <PeriodPanel
          filters={filters}
          onRange={onRange}
          onFiltersChange={onFiltersChange}
          onClose={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  )
}

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
          })
        }
      >
        {t.clear}
      </Button>
    </div>
  )
}

function FiltersPopover({
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

function buildChips(
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

interface MetricsToolbarProps {
  filters: MetricsFilters
  catalogs: FilterCatalogs
  onFiltersChange: (filters: MetricsFilters) => void
}

/** Contexto del tablero: periodo, filtros y chips activos en una sola fila. */
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
    <div className="flex flex-wrap items-center gap-2">
      <PeriodPicker
        filters={filters}
        onRange={onRange}
        onFiltersChange={onFiltersChange}
      />
      <FiltersPopover
        filters={filters}
        catalogs={catalogs}
        onFiltersChange={onFiltersChange}
      />
      <div className="min-w-0 flex-1">
        <FilterChips
          items={buildChips(filters, catalogs, onFiltersChange)}
          removeLabel={t.remove}
          clearLabel={t.clear}
          onClear={() => onFiltersChange(EMPTY_FILTERS)}
        />
      </div>
    </div>
  )
}
