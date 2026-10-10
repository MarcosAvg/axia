import { cn } from 'cn'
import { HintLabel } from '@/components/shared/hint'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toneClasses } from '@/lib/tones'
import type { Tone } from '@/lib/tones'
import { DeltaBadge } from './delta-badge'

/** Tarjeta de un indicador, con explicación y delta opcionales. */
export function MetricCard({
  label,
  value,
  hint,
  delta,
  lowerIsBetter,
  period,
  tone,
}: {
  label: string
  value: string
  hint?: string
  delta?: number | null
  lowerIsBetter?: boolean
  period?: string
  tone?: Tone
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          <HintLabel label={label} hint={hint} />
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <p
          className={cn(
            'text-2xl font-semibold',
            tone && toneClasses[tone].text,
          )}
        >
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
