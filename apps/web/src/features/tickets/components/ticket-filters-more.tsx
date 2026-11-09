import { useState } from 'react'
import { SlidersHorizontalIcon } from 'lucide-react'
import { TextField } from '@/components/shared/form-fields'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ticketMessages } from '../i18n'
import {
  buildSecondarySelects,
  FilterSelectFields,
  readFilterValues,
} from './ticket-filter-fields'
import type { FilterFieldsProps } from './ticket-filter-fields'

const list = ticketMessages.list

const EMPTY_SECONDARY: Partial<FilterFieldsProps['value']> = {
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

function activeCount(value: FilterFieldsProps['value']): number {
  return [
    value.teamId,
    value.priorityId,
    value.requesterId,
    value.technicianId,
    value.dependencyId,
    value.serviceTypeId,
    value.from,
    value.to,
    value.unrouted,
    value.possibleDuplicate,
  ].filter(Boolean).length
}

function FlagFields({
  unrouted,
  possibleDuplicate,
  onUnrouted,
  onPossibleDuplicate,
}: {
  unrouted: boolean
  possibleDuplicate: boolean
  onUnrouted: (checked: boolean) => void
  onPossibleDuplicate: (checked: boolean) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex min-h-9 items-center gap-2">
        <Checkbox
          id="filter-unrouted"
          checked={unrouted}
          onCheckedChange={(checked) => onUnrouted(checked === true)}
        />
        <Label htmlFor="filter-unrouted">{list.filters.unrouted}</Label>
      </div>
      <div className="flex min-h-9 items-center gap-2">
        <Checkbox
          id="filter-possible-duplicate"
          checked={possibleDuplicate}
          onCheckedChange={(checked) => onPossibleDuplicate(checked === true)}
        />
        <Label htmlFor="filter-possible-duplicate">
          {list.filters.possibleDuplicate}
        </Label>
      </div>
    </div>
  )
}

function MoreFilterFields({
  value,
  selects,
}: {
  value: FilterFieldsProps['value']
  selects: ReturnType<typeof buildSecondarySelects>
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <FilterSelectFields selects={selects} />
      </div>
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
    </>
  )
}

function MoreFiltersForm({
  value,
  catalogs,
  onApply,
  onClose,
}: Pick<FilterFieldsProps, 'value' | 'catalogs' | 'onApply'> & {
  onClose: () => void
}) {
  const [unrouted, setUnrouted] = useState(value.unrouted === true)
  const [possibleDuplicate, setPossibleDuplicate] = useState(
    value.possibleDuplicate === true,
  )
  const selects = buildSecondarySelects(value, catalogs)

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault()
        onApply({
          ...readFilterValues(new FormData(event.currentTarget), 'secondary'),
          unrouted: unrouted || undefined,
          possibleDuplicate: possibleDuplicate || undefined,
        })
        onClose()
      }}
    >
      <MoreFilterFields value={value} selects={selects} />
      <FlagFields
        unrouted={unrouted}
        possibleDuplicate={possibleDuplicate}
        onUnrouted={setUnrouted}
        onPossibleDuplicate={setPossibleDuplicate}
      />
      <div className="flex justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          className="min-h-11"
          onClick={() => {
            onApply(EMPTY_SECONDARY)
            onClose()
          }}
        >
          {list.filters.clear}
        </Button>
        <Button type="submit" className="min-h-11">
          {list.filters.apply}
        </Button>
      </div>
    </form>
  )
}

/** Filtros secundarios en un popover para no alargar la barra principal. */
export function MoreFilters({
  value,
  catalogs,
  onApply,
}: Pick<FilterFieldsProps, 'value' | 'catalogs' | 'onApply'>) {
  const [open, setOpen] = useState(false)
  const count = activeCount(value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="min-h-11">
          <SlidersHorizontalIcon className="size-4" />
          {list.filters.moreFilters}
          {count > 0 ? (
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-secondary px-1.5 text-xs text-secondary-foreground">
              {count}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="max-h-[var(--radix-popover-content-available-height)] w-[26rem] overflow-y-auto"
        collisionPadding={8}
        aria-label={list.filters.moreFilters}
      >
        <MoreFiltersForm
          value={value}
          catalogs={catalogs}
          onApply={onApply}
          onClose={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  )
}
