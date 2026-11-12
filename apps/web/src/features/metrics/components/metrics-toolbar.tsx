import { useState } from 'react'
import type { ReactNode } from 'react'
import { CalendarIcon, ChevronDownIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from 'cn'
import { SELECTED_CONTROL } from '@/lib/selection'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { FilterChips } from '@/components/shared/filter-chips'
import { HintIcon } from '@/components/shared/hint'
import type { FilterCatalogs } from '../domain/indicators'
import { EMPTY_FILTERS } from '../domain/metrics'
import {
  formatRangeLabel,
  isQuickRangeActive,
  rangeForDays,
} from '../domain/period'
import type { MetricsFilters } from '../domain/metrics'
import { metricsMessages } from '../i18n'
import { DateRangeFields } from './metrics-filter-fields'
import { buildChips, FiltersPopover } from './metrics-filters'
import { TimeModeToggle } from './time-mode-toggle'
import type { TimeMode } from '../domain/time-mode'

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
      className={cn('min-h-11 lg:min-h-9', active && SELECTED_CONTROL)}
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

interface MetricsToolbarProps {
  filters: MetricsFilters
  catalogs: FilterCatalogs
  onFiltersChange: (filters: MetricsFilters) => void
  tabs?: ReactNode
  mode?: TimeMode
  onModeChange?: (mode: TimeMode) => void
}

/** Contexto del tablero: periodo, filtros, pestañas y chips en una sola fila. */
export function MetricsToolbar({
  filters,
  catalogs,
  onFiltersChange,
  tabs,
  mode,
  onModeChange,
}: MetricsToolbarProps) {
  const onRange = (days: number | null) => {
    if (days === null) {
      onFiltersChange({ ...filters, from: '', to: '' })
    } else {
      onFiltersChange({ ...filters, ...rangeForDays(days, new Date()) })
    }
  }

  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 bg-background py-3">
      <div className="flex items-center gap-1">
        <PeriodPicker
          filters={filters}
          onRange={onRange}
          onFiltersChange={onFiltersChange}
        />
        <HintIcon hint={metricsMessages.filterHints.period} label={t.period} />
      </div>
      <div className="flex items-center gap-1">
        <FiltersPopover
          filters={filters}
          catalogs={catalogs}
          onFiltersChange={onFiltersChange}
        />
        <HintIcon hint={metricsMessages.filterHints.filters} label={t.title} />
      </div>
      {tabs}
      {mode && onModeChange ? (
        <TimeModeToggle mode={mode} onChange={onModeChange} />
      ) : null}
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
