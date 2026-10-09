import { Button } from '@/components/ui/button'
import { SelectField, TextField } from '@/components/shared/form-fields'
import type { Option } from '@/features/catalogs'
import { EMPTY_FILTERS } from '../domain/metrics'
import type { MetricsFilters as Filters } from '../domain/metrics'
import { metricsMessages } from '../i18n'

const t = metricsMessages.filters

export interface FilterCatalogs {
  buildings: Option[]
  teams: Option[]
  categories: Option[]
  dependencies: Option[]
}

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

/** Filtros del tablero: rango de fechas y dimensiones. */
export function MetricsFilters({
  filters,
  catalogs,
  onChange,
}: {
  filters: Filters
  catalogs: FilterCatalogs
  onChange: (filters: Filters) => void
}) {
  return (
    <form
      onSubmit={(event) => event.preventDefault()}
      className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <TextField
        id="metrics-from"
        type="date"
        label={t.from}
        value={filters.from}
        onChange={(event) => onChange({ ...filters, from: event.target.value })}
      />
      <TextField
        id="metrics-to"
        type="date"
        label={t.to}
        value={filters.to}
        onChange={(event) => onChange({ ...filters, to: event.target.value })}
      />
      {filterSelects(catalogs).map((field) => (
        <FilterSelect
          key={field.key}
          id={`metrics-${field.key}`}
          label={field.label}
          items={field.items}
          value={filters[field.key]}
          onChange={(value) => onChange({ ...filters, [field.key]: value })}
        />
      ))}
      <div className="flex items-end">
        <Button
          type="button"
          variant="ghost"
          className="min-h-11"
          onClick={() => onChange(EMPTY_FILTERS)}
        >
          {t.clear}
        </Button>
      </div>
    </form>
  )
}
