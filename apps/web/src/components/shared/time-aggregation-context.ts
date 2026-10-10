import { createContext, useContext } from 'react'
import type { TimeAggregation } from '@/lib/time-aggregation'

export interface TimeAggregationContextValue {
  aggregation: TimeAggregation
  setAggregation: (value: TimeAggregation) => void
}

/** Contexto de agregación de tiempos. En el código usa `useTimeAggregation`. */
export const TimeAggregationContext =
  createContext<TimeAggregationContextValue | null>(null)

/** Agregación de tiempos (promedio o acumulado) y su cambio. */
export function useTimeAggregation(): TimeAggregationContextValue {
  const value = useContext(TimeAggregationContext)
  if (!value) {
    throw new Error(
      'useTimeAggregation debe usarse dentro de <TimeAggregationProvider>',
    )
  }
  return value
}
