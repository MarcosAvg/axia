import { useState, type Dispatch, type SetStateAction } from 'react'
import type { MetricsFilters } from '../domain/metrics'
import type { TimeMode } from '../domain/time-mode'

/** Modo de tiempo activo y sincronización con el reloj del SLA. */
export function useTimeMode(
  filters: MetricsFilters,
  setFilters: Dispatch<SetStateAction<MetricsFilters>>,
) {
  const [mode, setMode] = useState<TimeMode>('calendar')
  const changeMode = (next: TimeMode) => {
    setMode(next)
    setFilters({ ...filters, clock: next === 'extra' ? undefined : next })
  }
  return { mode, changeMode }
}
