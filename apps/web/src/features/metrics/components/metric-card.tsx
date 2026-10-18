import { HintLabel } from '@/components/shared/hint'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DeltaBadge } from './delta-badge'

/** Tarjeta de un indicador, con explicación y delta opcionales. */
export function MetricCard({
  label,
  value,
  hint,
  delta,
  lowerIsBetter,
  period,
}: {
  label: string
  value: string
  hint?: string
  delta?: number | null
  lowerIsBetter?: boolean
  period?: string
}) {
  return (
    <Card>
      <CardHeader className="min-h-16">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          <HintLabel label={label} hint={hint} />
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        {delta !== undefined ? (
          <DeltaBadge
            change={delta}
            lowerIsBetter={lowerIsBetter}
            period={period}
          />
        ) : null}
      </CardContent>
    </Card>
  )
}
