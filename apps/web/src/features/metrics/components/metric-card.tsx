import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {hint ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="cursor-help text-left underline decoration-dotted underline-offset-4"
                >
                  {label}
                </button>
              </TooltipTrigger>
              <TooltipContent>{hint}</TooltipContent>
            </Tooltip>
          ) : (
            label
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <p className="text-2xl font-semibold">{value}</p>
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
