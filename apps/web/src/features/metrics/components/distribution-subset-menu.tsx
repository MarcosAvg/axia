import { useContext } from 'react'
import { ListFilterIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AuthContext, can } from '@/features/auth'
import { useMetricsDrillDown } from '../drill-down-context'
import {
  PHASE_SUBSETS,
  phaseSubsetFilters,
  phaseTicketFilters,
  type DrillDownSpec,
  type PhaseSubset,
} from '../domain/drill-down'
import { MIN_SAMPLE, formatMinutes } from '../domain/metrics'
import type { DistributionProfileRow } from '../domain/metrics'
import type { TimeMode } from '../domain/time-mode'
import { metricsMessages } from '../i18n'

const t = metricsMessages.times

function subsetLabel(subset: PhaseSubset, row: DistributionProfileRow): string {
  if (subset === 'all') return `${t.subsets.all} (${row.n})`
  if (subset === 'outliers') {
    return `${t.subsets.outliers} (${row.outliers} de ${row.n})`
  }
  if (subset === 'above_p90') {
    return `${t.subsets.above_p90} (${formatMinutes(row.p90)})`
  }
  if (subset === 'above_p75') {
    return `${t.subsets.above_p75} (${formatMinutes(row.p75)})`
  }
  if (subset === 'central') {
    return `${t.subsets.central} (${formatMinutes(row.p25)}–${formatMinutes(
      row.p75,
    )})`
  }
  return `${t.subsets.below_median} (${formatMinutes(row.median)})`
}

function SubsetMenuItem({
  subset,
  row,
  mode,
  phaseLabel,
  onOpen,
}: {
  subset: PhaseSubset
  row: DistributionProfileRow
  mode: TimeMode
  phaseLabel: string
  onOpen: (spec: DrillDownSpec) => void
}) {
  const filters = phaseSubsetFilters(row, mode, subset)
  if (!filters) return null
  const label = subsetLabel(subset, row)
  return (
    <DropdownMenuItem
      onSelect={() =>
        onOpen({
          title: `${metricsMessages.drillDown.label} · ${phaseLabel} · ${label}`,
          filters,
        })
      }
    >
      {label}
    </DropdownMenuItem>
  )
}

/** Menú de subconjuntos de tiquets para una fila del perfil. */
export function DistributionSubsetMenu({
  row,
  mode,
  phaseLabel,
}: {
  row: DistributionProfileRow
  mode: TimeMode
  phaseLabel: string
}) {
  const identity = useContext(AuthContext)?.identity ?? null
  const drillDown = useMetricsDrillDown()
  if (
    !drillDown ||
    !can(identity, 'ticket.view') ||
    row.n === 0 ||
    !phaseTicketFilters(row.phase, mode)
  ) {
    return null
  }
  const available = PHASE_SUBSETS.filter(
    (subset) => row.n >= MIN_SAMPLE || subset === 'all',
  )
  const menuLabel = `${metricsMessages.drillDown.label}: ${phaseLabel}`
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={menuLabel}
          title={t.subsetHint}
          className="text-muted-foreground"
        >
          <ListFilterIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80">
        <DropdownMenuLabel>{t.subsetMenu}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {available.map((subset) => (
          <SubsetMenuItem
            key={subset}
            subset={subset}
            row={row}
            mode={mode}
            phaseLabel={phaseLabel}
            onOpen={drillDown.open}
          />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
