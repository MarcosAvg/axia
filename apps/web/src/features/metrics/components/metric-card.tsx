import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

/** Tarjeta de un indicador, con explicación opcional. */
export function MetricCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
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
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  )
}
