import { MetricCard } from './metric-card'

export interface Kpi {
  label: string
  value: string
  hint?: string
  delta?: number | null
  lowerIsBetter?: boolean
}

const COLUMNS: Record<number, string> = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
  5: 'sm:grid-cols-2 lg:grid-cols-5',
}

/** Rejilla de tarjetas de indicadores. */
export function KpiGrid({
  cards,
  columns = 4,
}: {
  cards: Kpi[]
  columns?: 2 | 3 | 4 | 5
}) {
  return (
    <div className={`grid gap-3 ${COLUMNS[columns]}`}>
      {cards.map((card) => (
        <MetricCard
          key={card.label}
          label={card.label}
          value={card.value}
          hint={card.hint}
          delta={card.delta}
          lowerIsBetter={card.lowerIsBetter}
        />
      ))}
    </div>
  )
}
