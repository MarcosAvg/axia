import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { readPreference, writePreference } from '@/lib/theme'
import {
  resolveTimeMeasure,
  TIME_MEASURE_STORAGE_KEY,
  type TimeMeasure,
} from '@/lib/time-measure'
import { TimeMeasureContext } from './time-measure-context'
import type { TimeMeasureContextValue } from './time-measure-context'

/** Medida de tiempos (promedio, acumulado o robusta), persistida. */
export function TimeMeasureProvider({ children }: { children: ReactNode }) {
  const [measure, setState] = useState<TimeMeasure>(() =>
    resolveTimeMeasure(readPreference(TIME_MEASURE_STORAGE_KEY)),
  )

  const setMeasure = useCallback((next: TimeMeasure) => {
    setState(next)
    writePreference(TIME_MEASURE_STORAGE_KEY, next)
  }, [])

  const value = useMemo<TimeMeasureContextValue>(
    () => ({ measure, setMeasure }),
    [measure, setMeasure],
  )

  return (
    <TimeMeasureContext.Provider value={value}>
      {children}
    </TimeMeasureContext.Provider>
  )
}
