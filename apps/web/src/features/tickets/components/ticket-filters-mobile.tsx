import { useState } from 'react'
import { SlidersHorizontalIcon } from 'lucide-react'
import { TextField } from '@/components/shared/form-fields'
import { Button } from '@/components/ui/button'
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
  readSelectValues,
} from './ticket-filter-fields'
import type { FilterFieldsProps } from './ticket-filter-fields'

const list = ticketMessages.list

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

function MobileFilterSheet({
  open,
  onOpenChange,
  selects,
  onApply,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  selects: ReturnType<typeof buildFilterSelects>
  onApply: FilterFieldsProps['onApply']
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-xl p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
      >
        <SheetHeader className="p-0 pr-8">
          <SheetTitle>{list.filters.more}</SheetTitle>
        </SheetHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            onApply(readSelectValues(new FormData(event.currentTarget)))
            onOpenChange(false)
          }}
        >
          <FilterSelectFields selects={selects} />
          <div className="mt-1 flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              className="min-h-11 flex-1"
              onClick={() => {
                onApply({
                  status: undefined,
                  buildingId: undefined,
                  categoryId: undefined,
                })
                onOpenChange(false)
              }}
            >
              {list.filters.clear}
            </Button>
            <Button type="submit" className="min-h-11 flex-1">
              {list.filters.apply}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

/** Móvil: búsqueda siempre visible y el resto de filtros en una hoja. */
export function MobileFilterFields({
  value,
  buildings,
  categories,
  onApply,
}: FilterFieldsProps) {
  const [open, setOpen] = useState(false)
  const selects = buildFilterSelects(value, buildings, categories)
  const active = selects.filter((select) => select.value !== '').length

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
        onOpenChange={setOpen}
        selects={selects}
        onApply={onApply}
      />
    </div>
  )
}
