import { cycleMessages } from '../i18n-cycle'

type CyclePhaseKey =
  | 'response'
  | 'assignment'
  | 'pendingTake'
  | 'wait'
  | 'active'
  | 'pause'
  | 'dormant'
  | 'validation'
  | 'claim'

interface CyclePhaseDefinition {
  key: CyclePhaseKey
  label: string
  color: string
}

/** Fases primarias del ciclo, en el orden de la barra y su leyenda. */
export const CYCLE_PHASES: CyclePhaseDefinition[] = [
  {
    key: 'response',
    label: cycleMessages.phases.response,
    color: 'var(--chart-1)',
  },
  {
    key: 'assignment',
    label: cycleMessages.phases.assignment,
    color: 'var(--chart-2)',
  },
  {
    key: 'pendingTake',
    label: cycleMessages.phases.pendingTake,
    color: 'var(--chart-3)',
  },
  { key: 'wait', label: cycleMessages.phases.wait, color: 'var(--warning)' },
  {
    key: 'active',
    label: cycleMessages.phases.active,
    color: 'var(--success)',
  },
  {
    key: 'pause',
    label: cycleMessages.phases.pause,
    color: 'var(--destructive)',
  },
  {
    key: 'dormant',
    label: cycleMessages.phases.dormant,
    color: 'var(--muted-foreground)',
  },
  {
    key: 'validation',
    label: cycleMessages.phases.validation,
    color: 'var(--chart-4)',
  },
  { key: 'claim', label: cycleMessages.phases.claim, color: 'var(--chart-5)' },
]
