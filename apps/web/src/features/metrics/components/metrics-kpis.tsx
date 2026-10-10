import { toneForIndex } from '@/lib/tones'
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
  6: 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
}

/** Rejilla de tarjetas de indicadores. */
export function KpiGrid({
  cards,
  columns = 4,
  period,
}: {
  cards: Kpi[]
  columns?: 2 | 3 | 4 | 5 | 6
  period?: string
}) {
  return (
    <div className={`grid gap-3 ${COLUMNS[columns]}`}>
      {cards.map((card, index) => (
        <MetricCard
          key={card.label}
          label={card.label}
          value={card.value}
          hint={card.hint}
          delta={card.delta}
          lowerIsBetter={card.lowerIsBetter}
          period={card.delta !== undefined ? period : undefined}
          tone={toneForIndex(index)}
        />
      ))}
    </div>
  )
}
