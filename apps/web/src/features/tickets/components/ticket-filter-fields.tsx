import { SelectField } from '@/components/shared/form-fields'
import type { SelectOption } from '@/components/shared/form-fields'
import type { Option } from '@/features/catalogs'
import type { TicketFilterCatalogs } from '../domain/filter-catalogs'
import { TICKET_STATUSES } from '../domain/types'

export type { TicketFilterCatalogs } from '../domain/filter-catalogs'
import { statusLabels, ticketMessages } from '../i18n'
import { ticketStatusSchema } from '../schemas'
import type { TicketListSearch } from '../schemas'

const list = ticketMessages.list
const statusOptions = TICKET_STATUSES.map((status) => ({
  value: status,
  label: statusLabels[status],
}))

export type FilterMode = 'primary' | 'secondary' | 'all'

export interface FilterSelect {
  id: string
  label: string
  options: SelectOption[]
  value: string
}

export interface FilterFieldsProps {
  value: TicketListSearch
  catalogs: TicketFilterCatalogs
  onApply: (patch: Partial<TicketListSearch>) => void
  /** El tablero expresa el estado en columnas y no necesita el filtro. */
  showStatus?: boolean
}

function optionList(items: Option[]): SelectOption[] {
  return items.map((item) => ({ value: item.id, label: item.name }))
}

export function buildPrimarySelects(
  value: TicketListSearch,
  catalogs: TicketFilterCatalogs,
  showStatus = true,
): FilterSelect[] {
  const selects: FilterSelect[] = []
  if (showStatus) {
    selects.push({
      id: 'filter-status',
      label: list.filters.status,
      options: statusOptions,
      value: value.status ?? '',
    })
  }
  selects.push(
    {
      id: 'filter-building',
      label: list.filters.building,
      options: optionList(catalogs.buildings),
      value: value.buildingId ?? '',
    },
    {
      id: 'filter-category',
      label: list.filters.category,
      options: optionList(catalogs.categories),
      value: value.categoryId ?? '',
    },
  )
  return selects
}

export function buildSecondarySelects(
  value: TicketListSearch,
  catalogs: TicketFilterCatalogs,
): FilterSelect[] {
  return [
    {
      id: 'filter-team',
      label: list.filters.team,
      options: optionList(catalogs.teams),
      value: value.teamId ?? '',
    },
    {
      id: 'filter-priority',
      label: list.filters.priority,
      options: optionList(catalogs.priorities),
      value: value.priorityId ?? '',
    },
    {
      id: 'filter-requester',
      label: list.filters.requester,
      options: catalogs.requesters.map((item) => ({
        value: item.id,
        label: item.fullName,
      })),
      value: value.requesterId ?? '',
    },
    {
      id: 'filter-technician',
      label: list.filters.technician,
      options: catalogs.technicians.map((item) => ({
        value: item.id,
        label: item.fullName,
      })),
      value: value.technicianId ?? '',
    },
    {
      id: 'filter-dependency',
      label: list.filters.dependency,
      options: optionList(catalogs.dependencies),
      value: value.dependencyId ?? '',
    },
    {
      id: 'filter-service-type',
      label: list.filters.serviceType,
      options: optionList(catalogs.serviceTypes),
      value: value.serviceTypeId ?? '',
    },
  ]
}

export function buildFilterSelects(
  value: TicketListSearch,
  catalogs: TicketFilterCatalogs,
  showStatus = true,
): FilterSelect[] {
  return [
    ...buildPrimarySelects(value, catalogs, showStatus),
    ...buildSecondarySelects(value, catalogs),
  ]
}

function textValue(form: FormData, name: string): string | undefined {
  const value = String(form.get(name) ?? '').trim()
  return value || undefined
}

function readPrimary(form: FormData): Partial<TicketListSearch> {
  const patch: Partial<TicketListSearch> = {}
  if (form.has('search')) {
    patch.search = textValue(form, 'search')
  }
  if (form.has('filter-status')) {
    const status = ticketStatusSchema.safeParse(form.get('filter-status'))
    patch.status = status.success ? status.data : undefined
  }
  if (form.has('filter-building')) {
    patch.buildingId = textValue(form, 'filter-building')
  }
  if (form.has('filter-category')) {
    patch.categoryId = textValue(form, 'filter-category')
  }
  return patch
}

function readSecondary(form: FormData): Partial<TicketListSearch> {
  return {
    teamId: textValue(form, 'filter-team'),
    priorityId: textValue(form, 'filter-priority'),
    requesterId: textValue(form, 'filter-requester'),
    technicianId: textValue(form, 'filter-technician'),
    dependencyId: textValue(form, 'filter-dependency'),
    serviceTypeId: textValue(form, 'filter-service-type'),
    from: textValue(form, 'filter-from'),
    to: textValue(form, 'filter-to'),
    unrouted: form.get('filter-unrouted') === 'on' ? true : undefined,
    possibleDuplicate:
      form.get('filter-possible-duplicate') === 'on' ? true : undefined,
  }
}

/** Lee solo los campos incluidos en el formulario, para conservar el resto. */
export function readFilterValues(
  form: FormData,
  mode: FilterMode = 'all',
): Partial<TicketListSearch> {
  return {
    ...(mode !== 'secondary' ? readPrimary(form) : {}),
    ...(mode !== 'primary' ? readSecondary(form) : {}),
  }
}

export function FilterSelectFields({
  selects,
  className = 'w-full',
}: {
  selects: FilterSelect[]
  className?: string
}) {
  return selects.map((select) => (
    <div key={`${select.id}:${select.value}`} className={className}>
      <SelectField
        id={select.id}
        label={select.label}
        options={select.options}
        name={select.id}
        defaultValue={select.value}
        placeholder={list.filters.all}
      />
    </div>
  ))
}
