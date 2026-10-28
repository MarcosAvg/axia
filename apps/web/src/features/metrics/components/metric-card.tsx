import { HintIcon } from '@/components/shared/hint'
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
    <Card size="sm" className="justify-between [--card-spacing:--spacing(2.5)]">
      <CardHeader>
        <CardTitle className="flex min-h-8 items-start justify-between gap-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          <span>{label}</span>
          {hint ? <HintIcon hint={hint} label={label} /> : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-0.5">
        <p className="text-2xl font-semibold tabular-nums lg:text-3xl">
          {value}
        </p>
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
