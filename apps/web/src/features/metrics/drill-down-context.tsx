import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { MetricsFilters } from './domain/metrics'
import { metricsBaseFilters } from './domain/drill-down'
import type { DrillDownSpec } from './domain/drill-down'
import { MetricsTicketSheet } from './components/metrics-ticket-sheet'

export type { DrillDownSpec } from './domain/drill-down'

type DrillDownValue = {
  open: (spec: DrillDownSpec) => void
}

const DrillDownContext = createContext<DrillDownValue | null>(null)

/** Estado del panel de tiquets que explica un indicador. */
export function MetricsDrillDownProvider({
  filters,
  children,
}: {
  filters: MetricsFilters
  children: ReactNode
}) {
  const [spec, setSpec] = useState<DrillDownSpec | null>(null)
  const base = useMemo(() => metricsBaseFilters(filters), [filters])
  const value = useMemo<DrillDownValue>(
    () => ({
      open: (next) =>
        setSpec({
          ...next,
          filters: { ...base, ...next.filters },
          alternate: next.alternate
            ? {
                ...next.alternate,
                filters: { ...base, ...next.alternate.filters },
              }
            : undefined,
        }),
    }),
    [base],
  )
  return (
    <DrillDownContext.Provider value={value}>
      {children}
      <MetricsTicketSheet
        spec={spec}
        onClose={() => setSpec(null)}
        onOpen={value.open}
      />
    </DrillDownContext.Provider>
  )
}

export function useMetricsDrillDown(): DrillDownValue | null {
  return useContext(DrillDownContext)
}
