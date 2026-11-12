import { createContext, useContext } from 'react'
import type { TimeMeasure } from '@/lib/time-measure'

export interface TimeMeasureContextValue {
  measure: TimeMeasure
  setMeasure: (value: TimeMeasure) => void
}

/** Contexto de la medida de tiempos. En el código usa `useTimeMeasure`. */
export const TimeMeasureContext = createContext<TimeMeasureContextValue | null>(
  null,
)

/** Medida de tiempos (promedio, acumulado o robusta) y su cambio. */
export function useTimeMeasure(): TimeMeasureContextValue {
  const value = useContext(TimeMeasureContext)
  if (!value) {
    throw new Error(
      'useTimeMeasure debe usarse dentro de <TimeMeasureProvider>',
    )
  }
  return value
}
