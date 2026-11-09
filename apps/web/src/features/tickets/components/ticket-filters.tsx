import { FilterChips } from '@/components/shared/filter-chips'
import type { FilterChip } from '@/components/shared/filter-chips'
import { TextField } from '@/components/shared/form-fields'
import { Button } from '@/components/ui/button'
import { useMediaQuery } from '@/lib/use-media-query'
import { statusLabels, ticketMessages } from '../i18n'
import type { TicketListSearch } from '../schemas'
import {
  buildPrimarySelects,
  FilterSelectFields,
  readFilterValues,
} from './ticket-filter-fields'
import type {
  FilterFieldsProps,
  TicketFilterCatalogs,
} from './ticket-filter-fields'
import { MobileFilterFields } from './ticket-filters-mobile'
import { MoreFilters } from './ticket-filters-more'

const list = ticketMessages.list

type Apply = (patch: Partial<TicketListSearch>) => void

function nameOf(items: { id: string; name: string }[], id: string): string {
  return items.find((item) => item.id === id)?.name ?? ''
}

interface ChipEntry {
  key: string
  value: unknown
  label: string
  patch: Partial<TicketListSearch>
}

function statusChips(value: TicketListSearch): ChipEntry[] {
  return [
    {
      key: 'search',
      value: value.search,
      label: `“${value.search ?? ''}”`,
      patch: { search: undefined },
    },
    {
      key: 'status',
      value: value.status,
      label: value.status ? statusLabels[value.status] : '',
      patch: { status: undefined },
    },
  ]
}

function classificationChips(
  value: TicketListSearch,
  catalogs: TicketFilterCatalogs,
): ChipEntry[] {
  return [
    {
      key: 'building',
      value: value.buildingId,
      label: nameOf(catalogs.buildings, value.buildingId ?? ''),
      patch: { buildingId: undefined },
    },
    {
      key: 'category',
      value: value.categoryId,
      label: nameOf(catalogs.categories, value.categoryId ?? ''),
      patch: { categoryId: undefined },
    },
    {
      key: 'team',
      value: value.teamId,
      label: nameOf(catalogs.teams, value.teamId ?? ''),
      patch: { teamId: undefined },
    },
    {
      key: 'priority',
      value: value.priorityId,
      label: nameOf(catalogs.priorities, value.priorityId ?? ''),
      patch: { priorityId: undefined },
    },
    {
      key: 'dependency',
      value: value.dependencyId,
      label: nameOf(catalogs.dependencies, value.dependencyId ?? ''),
      patch: { dependencyId: undefined },
    },
    {
      key: 'service-type',
      value: value.serviceTypeId,
      label: nameOf(catalogs.serviceTypes, value.serviceTypeId ?? ''),
      patch: { serviceTypeId: undefined },
    },
  ]
}

function peopleChips(
  value: TicketListSearch,
  catalogs: TicketFilterCatalogs,
): ChipEntry[] {
  return [
    {
      key: 'requester',
      value: value.requesterId,
      label:
        catalogs.requesters.find((item) => item.id === value.requesterId)
          ?.fullName ?? '',
      patch: { requesterId: undefined },
    },
    {
      key: 'technician',
      value: value.technicianId,
      label:
        catalogs.technicians.find((item) => item.id === value.technicianId)
          ?.fullName ?? '',
      patch: { technicianId: undefined },
    },
  ]
}

function dateAndFlagChips(value: TicketListSearch): ChipEntry[] {
  return [
    {
      key: 'from',
      value: value.from,
      label: `${list.filters.from} ${value.from ?? ''}`,
      patch: { from: undefined },
    },
    {
      key: 'to',
      value: value.to,
      label: `${list.filters.to} ${value.to ?? ''}`,
      patch: { to: undefined },
    },
    {
      key: 'unrouted',
      value: value.unrouted,
      label: list.filters.unrouted,
      patch: { unrouted: undefined },
    },
    {
      key: 'possible-duplicate',
      value: value.possibleDuplicate,
      label: list.filters.possibleDuplicate,
      patch: { possibleDuplicate: undefined },
    },
  ]
}

function buildChips(
  value: TicketListSearch,
  catalogs: TicketFilterCatalogs,
  apply: Apply,
): FilterChip[] {
  return [
    ...statusChips(value),
    ...classificationChips(value, catalogs),
    ...peopleChips(value, catalogs),
    ...dateAndFlagChips(value),
  ]
    .filter((entry) => Boolean(entry.value))
    .map((entry) => ({
      key: entry.key,
      label: entry.label,
      onRemove: () => apply(entry.patch),
    }))
}

function DesktopFilterFields({
  value,
  catalogs,
  onApply,
  showStatus = true,
}: FilterFieldsProps) {
  const selects = buildPrimarySelects(value, catalogs, showStatus)

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
      <form
        className="flex min-w-0 flex-1 flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          onApply(
            readFilterValues(new FormData(event.currentTarget), 'primary'),
          )
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
      <MoreFilters value={value} catalogs={catalogs} onApply={onApply} />
    </div>
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
  catalogs: TicketFilterCatalogs
  showStatus?: boolean
}

export function TicketFilters({
  value,
  onChange,
  catalogs,
  showStatus,
}: TicketFiltersProps) {
  function apply(patch: Partial<TicketListSearch>) {
    onChange({ ...value, ...patch, page: 1 })
  }

  const chips = buildChips(value, catalogs, apply)

  return (
    <div className="flex flex-col gap-3">
      <FilterFields
        value={value}
        catalogs={catalogs}
        onApply={apply}
        showStatus={showStatus}
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
