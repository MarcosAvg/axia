import { SelectField, TextField } from '@/components/shared/form-fields'
import type { FilterCatalogs, NamedOption } from '../domain/indicators'
import type { MetricsFilters } from '../domain/metrics'
import { metricsMessages } from '../i18n'

const t = metricsMessages.filters

export type FilterField = {
  key: 'buildingId' | 'teamId' | 'categoryId' | 'dependencyId'
  label: string
  items: NamedOption[]
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
      className="min-h-11 lg:min-h-9"
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

export function filterSelects(catalogs: FilterCatalogs): FilterField[] {
  return [
    {
      key: 'buildingId',
      label: t.building,
      items: catalogs.buildings,
    },
    { key: 'teamId', label: t.team, items: catalogs.teams },
    {
      key: 'categoryId',
      label: t.category,
      items: catalogs.categories,
    },
    {
      key: 'dependencyId',
      label: t.dependency,
      items: catalogs.dependencies,
    },
  ]
}

export function DateRangeFields({
  filters,
  onFiltersChange,
}: {
  filters: MetricsFilters
  onFiltersChange: (filters: MetricsFilters) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <TextField
        id="metrics-from"
        type="date"
        label={t.from}
        value={filters.from}
        className="min-h-11 lg:min-h-9"
        onChange={(event) =>
          onFiltersChange({ ...filters, from: event.target.value })
        }
      />
      <TextField
        id="metrics-to"
        type="date"
        label={t.to}
        value={filters.to}
        className="min-h-11 lg:min-h-9"
        onChange={(event) =>
          onFiltersChange({ ...filters, to: event.target.value })
        }
      />
    </div>
  )
}

export function CatalogFilterSelect({
  field,
  value,
  onChange,
}: {
  field: FilterField
  value: string
  onChange: (value: string) => void
}) {
  return (
    <FilterSelect
      id={`metrics-${field.key}`}
      label={field.label}
      items={field.items}
      value={value}
      onChange={onChange}
    />
  )
}
