import { Button } from '@/components/ui/button'
import { SelectField, TextField } from '@/components/shared/form-fields'
import type { Option } from '@/features/catalogs'
import { EMPTY_FILTERS } from '../domain/metrics'
import { rangeForDays } from '../domain/period'
import type { Dimension, DimensionRow, MetricsFilters } from '../domain/metrics'
import { dimensionLabels, metricsMessages } from '../i18n'
import { MetricsExport } from './metrics-export'

const t = metricsMessages.filters
const quick = metricsMessages.quickRanges

export interface FilterCatalogs {
  buildings: Option[]
  teams: Option[]
  categories: Option[]
  dependencies: Option[]
  requesters: Option[]
}

const QUICK_RANGES = [
  { key: 'd7' as const, days: 7 },
  { key: 'd30' as const, days: 30 },
  { key: 'd90' as const, days: 90 },
]

const DIMENSIONS = Object.keys(dimensionLabels) as Dimension[]
const dimensionOptions = DIMENSIONS.map((value) => ({
  value,
  label: dimensionLabels[value],
}))

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
  items: Option[]
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

function QuickRanges({
  onRange,
  children,
}: {
  onRange: (days: number | null) => void
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="ghost"
        className="min-h-9"
        onClick={() => onRange(null)}
      >
        {quick.all}
      </Button>
      {QUICK_RANGES.map((item) => (
        <Button
          key={item.key}
          type="button"
          variant="outline"
          className="min-h-9"
          onClick={() => onRange(item.days)}
        >
          {quick[item.key]}
        </Button>
      ))}
      <div className="ml-auto">{children}</div>
    </div>
  )
}

function CatalogFilters({
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
        <FilterSelect
          key={field.key}
          id={`metrics-${field.key}`}
          label={field.label}
          items={field.items}
          value={filters[field.key]}
          onChange={(value) =>
            onFiltersChange({ ...filters, [field.key]: value })
          }
        />
      ))}
    </>
  )
}

interface ToolbarFormProps {
  filters: MetricsFilters
  catalogs: FilterCatalogs
  dimension: Dimension
  onFiltersChange: (filters: MetricsFilters) => void
  onDimensionChange: (dimension: Dimension) => void
}

function ToolbarForm({
  filters,
  catalogs,
  dimension,
  onFiltersChange,
  onDimensionChange,
}: ToolbarFormProps) {
  return (
    <form
      onSubmit={(event) => event.preventDefault()}
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      <TextField
        id="metrics-from"
        type="date"
        label={t.from}
        value={filters.from}
        onChange={(event) =>
          onFiltersChange({ ...filters, from: event.target.value })
        }
      />
      <TextField
        id="metrics-to"
        type="date"
        label={t.to}
        value={filters.to}
        onChange={(event) =>
          onFiltersChange({ ...filters, to: event.target.value })
        }
      />
      <SelectField
        id="metrics-dimension"
        label={t.dimension}
        options={dimensionOptions}
        value={dimension}
        onChange={(event) => {
          const next = DIMENSIONS.find((item) => item === event.target.value)
          if (next) onDimensionChange(next)
        }}
      />
      <CatalogFilters
        filters={filters}
        catalogs={catalogs}
        onFiltersChange={onFiltersChange}
      />
      <div className="flex items-end">
        <Button
          type="button"
          variant="ghost"
          className="min-h-11"
          onClick={() => onFiltersChange(EMPTY_FILTERS)}
        >
          {t.clear}
        </Button>
      </div>
    </form>
  )
}

interface MetricsToolbarProps extends ToolbarFormProps {
  rows: DimensionRow[]
  nameOf: (id: string) => string
}

/** Barra del tablero: rangos rápidos, filtros, dimensión y exportación. */
export function MetricsToolbar({
  filters,
  catalogs,
  dimension,
  rows,
  nameOf,
  onFiltersChange,
  onDimensionChange,
}: MetricsToolbarProps) {
  const setRange = (days: number | null) => {
    if (days === null) {
      onFiltersChange({ ...filters, from: '', to: '' })
    } else {
      onFiltersChange({ ...filters, ...rangeForDays(days, new Date()) })
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <QuickRanges onRange={setRange}>
        <MetricsExport rows={rows} nameOf={nameOf} />
      </QuickRanges>
      <ToolbarForm
        filters={filters}
        catalogs={catalogs}
        dimension={dimension}
        onFiltersChange={onFiltersChange}
        onDimensionChange={onDimensionChange}
      />
    </div>
  )
}
