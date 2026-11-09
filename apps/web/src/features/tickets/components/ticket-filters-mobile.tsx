import { useState } from 'react'
import { SlidersHorizontalIcon } from 'lucide-react'
import { TextField } from '@/components/shared/form-fields'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ticketMessages } from '../i18n'
import {
  buildFilterSelects,
  FilterSelectFields,
  readFilterValues,
} from './ticket-filter-fields'
import type { FilterFieldsProps } from './ticket-filter-fields'

const list = ticketMessages.list

const EMPTY_FILTERS: Partial<FilterFieldsProps['value']> = {
  search: undefined,
  status: undefined,
  buildingId: undefined,
  categoryId: undefined,
  teamId: undefined,
  priorityId: undefined,
  requesterId: undefined,
  technicianId: undefined,
  dependencyId: undefined,
  serviceTypeId: undefined,
  from: undefined,
  to: undefined,
  unrouted: undefined,
  possibleDuplicate: undefined,
}

function MobileSearchForm({
  value,
  onApply,
}: Pick<FilterFieldsProps, 'value' | 'onApply'>) {
  return (
    <form
      className="min-w-0 flex-1"
      onSubmit={(event) => {
        event.preventDefault()
        const term = String(
          new FormData(event.currentTarget).get('search'),
        ).trim()
        onApply({ search: term || undefined })
      }}
    >
      <TextField
        key={value.search ?? ''}
        id="filter-search"
        name="search"
        type="search"
        label={list.filters.search}
        placeholder={list.filters.searchPlaceholder}
        defaultValue={value.search ?? ''}
      />
    </form>
  )
}

function FlagField({
  id,
  label,
  defaultChecked,
}: {
  id: string
  label: string
  defaultChecked: boolean
}) {
  return (
    <div className="flex min-h-11 items-center gap-2">
      <Checkbox id={id} name={id} defaultChecked={defaultChecked} />
      <Label htmlFor={id}>{label}</Label>
    </div>
  )
}

function MobileDateFields({ value }: Pick<FilterFieldsProps, 'value'>) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <TextField
        id="filter-from"
        name="filter-from"
        type="date"
        label={list.filters.from}
        defaultValue={value.from ?? ''}
      />
      <TextField
        id="filter-to"
        name="filter-to"
        type="date"
        label={list.filters.to}
        defaultValue={value.to ?? ''}
      />
    </div>
  )
}

function MobileFilterForm({
  value,
  catalogs,
  onApply,
  onClose,
}: Pick<FilterFieldsProps, 'value' | 'catalogs' | 'onApply'> & {
  onClose: () => void
}) {
  const selects = buildFilterSelects(value, catalogs)

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault()
        onApply(readFilterValues(new FormData(event.currentTarget), 'all'))
        onClose()
      }}
    >
      <FilterSelectFields selects={selects} />
      <MobileDateFields value={value} />
      <FlagField
        id="filter-unrouted"
        label={list.filters.unrouted}
        defaultChecked={value.unrouted === true}
      />
      <FlagField
        id="filter-possible-duplicate"
        label={list.filters.possibleDuplicate}
        defaultChecked={value.possibleDuplicate === true}
      />
      <div className="mt-1 flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          className="min-h-11 flex-1"
          onClick={() => {
            onApply(EMPTY_FILTERS)
            onClose()
          }}
        >
          {list.filters.clear}
        </Button>
        <Button type="submit" className="min-h-11 flex-1">
          {list.filters.apply}
        </Button>
      </div>
    </form>
  )
}

function MobileFilterSheet({
  open,
  onOpenChange,
  value,
  catalogs,
  onApply,
}: Pick<FilterFieldsProps, 'value' | 'catalogs' | 'onApply'> & {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85svh] overflow-y-auto rounded-t-xl p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
      >
        <SheetHeader className="p-0 pr-8">
          <SheetTitle>{list.filters.more}</SheetTitle>
        </SheetHeader>
        <MobileFilterForm
          value={value}
          catalogs={catalogs}
          onApply={onApply}
          onClose={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  )
}

/** Móvil: búsqueda siempre visible y el resto de filtros en una hoja. */
export function MobileFilterFields({
  value,
  catalogs,
  onApply,
  showStatus = true,
}: FilterFieldsProps) {
  const [open, setOpen] = useState(false)
  const selects = buildFilterSelects(value, catalogs, showStatus)
  const active =
    selects.filter((select) => select.value !== '').length +
    [value.from, value.to, value.unrouted, value.possibleDuplicate].filter(
      Boolean,
    ).length

  return (
    <div className="flex items-end gap-2">
      <MobileSearchForm value={value} onApply={onApply} />
      <Button
        type="button"
        variant="outline"
        className="min-h-11"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <SlidersHorizontalIcon />
        {list.filters.more}
        {active > 0 ? ` (${active})` : ''}
      </Button>
      <MobileFilterSheet
        open={open}
        value={value}
        catalogs={catalogs}
        onApply={onApply}
        onOpenChange={setOpen}
      />
    </div>
  )
}
