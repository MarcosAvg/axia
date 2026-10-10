import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  readTimeAggregation,
  writeTimeAggregation,
} from '@/lib/time-aggregation'
import type { TimeAggregation } from '@/lib/time-aggregation'
import { TimeAggregationContext } from './time-aggregation-context'
import type { TimeAggregationContextValue } from './time-aggregation-context'

/** Preferencia de agregación de tiempos (promedio/acumulado), persistida. */
export function TimeAggregationProvider({ children }: { children: ReactNode }) {
  const [aggregation, setState] = useState<TimeAggregation>(readTimeAggregation)

  const setAggregation = useCallback((next: TimeAggregation) => {
    setState(next)
    writeTimeAggregation(next)
  }, [])

  const value = useMemo<TimeAggregationContextValue>(
    () => ({ aggregation, setAggregation }),
    [aggregation, setAggregation],
  )

  return (
    <TimeAggregationContext.Provider value={value}>
      {children}
    </TimeAggregationContext.Provider>
  )
}
