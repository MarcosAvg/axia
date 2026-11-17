import { useState } from 'react'
import type { TimeMode } from '../domain/time-mode'

/** El reloj de SLA se deriva del selector, incluso después de limpiar filtros. */
export function useTimeMode() {
  const [mode, changeMode] = useState<TimeMode>('calendar')
  return { mode, changeMode, clock: mode === 'extra' ? undefined : mode }
}
