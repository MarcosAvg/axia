import { Button } from '@/components/ui/button'
import { AggregationToggle } from '@/components/shared/aggregation-toggle'
import { FilterChips } from '@/components/shared/filter-chips'
import type { FilterChip } from '@/components/shared/filter-chips'
import { SelectField, TextField } from '@/components/shared/form-fields'
import { messages } from '@/lib/i18n'
import type { FilterCatalogs, NamedOption } from '../domain/indicators'
import { EMPTY_FILTERS } from '../domain/metrics'
import { formatRangeLabel, rangeForDays } from '../domain/period'
import type { MetricsFilters } from '../domain/metrics'
import { metricsMessages } from '../i18n'

const t = metricsMessages.filters
const quick = metricsMessages.quickRanges

const QUICK_RANGES = [
  { key: 'd7' as const, days: 7 },
  { key: 'd30' as const, days: 30 },
  { key: 'd90' as const, days: 90 },
]

function FilterSelect({
  id,
  label,
  value,
  items,
  onChange,
}: {
  id: string
  label: string
  value: string
  items: NamedOption[]
  onChange: (value: string) => void
}) {
  return (
    <SelectField
      id={id}
      label={label}
      placeholder={t.all}
      options={items.map((item) => ({ value: item.id, label: item.name }))}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

function filterSelects(catalogs: FilterCatalogs) {
  return [
    {
      key: 'buildingId' as const,
      label: t.building,
      items: catalogs.buildings,
    },
    { key: 'teamId' as const, label: t.team, items: catalogs.teams },
    {
      key: 'categoryId' as const,
      label: t.category,
      items: catalogs.categories,
    },
    {
      key: 'dependencyId' as const,
      label: t.dependency,
      items: catalogs.dependencies,
    },
  ]
}

function QuickRanges({ onRange }: { onRange: (days: number | null) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="ghost"
        className="min-h-11"
        onClick={() => onRange(null)}
      >
        {quick.all}
      </Button>
      {QUICK_RANGES.map((item) => (
        <Button
          key={item.key}
          type="button"
          variant="outline"
          className="min-h-11"
          onClick={() => onRange(item.days)}
        >
          {quick[item.key]}
        </Button>
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

function CatalogFields({
  filters,
  catalogs,
  onFiltersChange,
}: {
  filters: MetricsFilters
  catalogs: FilterCatalogs
  onFiltersChange: (filters: MetricsFilters) => void
}) {
  return (
    <>
      {filterSelects(catalogs).map((field) => (
        <div key={field.key} className="w-44">
          <FilterSelect
            id={`metrics-${field.key}`}
            label={field.label}
            items={field.items}
            value={filters[field.key]}
            onChange={(value) =>
              onFiltersChange({ ...filters, [field.key]: value })
            }
          />
        </div>
      ))}
    </>
  )
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
  return (
    <form
      onSubmit={(event) => event.preventDefault()}
      className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4"
    >
      <QuickRanges onRange={onRange} />
      <div className="w-40">
        <TextField
          id="metrics-from"
          type="date"
          label={t.from}
          value={filters.from}
          onChange={(event) =>
            onFiltersChange({ ...filters, from: event.target.value })
          }
        />
      </div>
      <div className="w-40">
        <TextField
          id="metrics-to"
          type="date"
          label={t.to}
          value={filters.to}
          onChange={(event) =>
            onFiltersChange({ ...filters, to: event.target.value })
          }
        />
      </div>
      <CatalogFields
        filters={filters}
        catalogs={catalogs}
        onFiltersChange={onFiltersChange}
      />
      <Button
        type="button"
        variant="ghost"
        className="min-h-11"
        onClick={() => onFiltersChange(EMPTY_FILTERS)}
      >
        {t.clear}
      </Button>
    </form>
  )
}

interface MetricsToolbarProps {
  filters: MetricsFilters
  catalogs: FilterCatalogs
  onFiltersChange: (filters: MetricsFilters) => void
}

/** Barra de filtros del tablero (mismo patrón que la lista de Operación). */
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
  const chips = buildChips(filters, catalogs, onFiltersChange)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-end gap-2">
        <span className="text-sm text-muted-foreground">
          {messages.aggregation.label}
        </span>
        <AggregationToggle />
      </div>
      <ToolbarForm
        filters={filters}
        catalogs={catalogs}
        onRange={onRange}
        onFiltersChange={onFiltersChange}
      />
      <FilterChips
        items={chips}
        removeLabel={t.remove}
        clearLabel={t.clear}
        onClear={() => onFiltersChange(EMPTY_FILTERS)}
      />
    </div>
  )
}
