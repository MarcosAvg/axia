import * as React from 'react'
import * as RechartsPrimitive from 'recharts'
import { cn } from 'cn'

export interface ChartConfigEntry {
  label?: React.ReactNode
  color?: string
}

export type ChartConfig = Record<string, ChartConfigEntry>

interface ChartContextValue {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextValue | null>(null)

function useChartConfig(): ChartConfig {
  return React.useContext(ChartContext)?.config ?? {}
}

/** Contenedor responsivo de una gráfica (API del `chart` de shadcn/ui). */
export function ChartContainer({
  id,
  className,
  config,
  children,
}: {
  id: string
  className?: string
  config: ChartConfig
  children: React.ReactElement
}) {
  const style = Object.entries(config).reduce<Record<string, string>>(
    (acc, [key, item]) => {
      if (item.color) acc[`--color-${key}`] = item.color
      return acc
    },
    {},
  )
  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={id}
        className={cn('h-64 w-full text-xs', className)}
        style={style}
      >
        <RechartsPrimitive.ResponsiveContainer width="100%" height="100%">
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}

export const ChartTooltip = RechartsPrimitive.Tooltip

interface TooltipItem {
  dataKey?: string | number
  name?: string | number
  value?: number | string
  color?: string
}

/** Contenido del tooltip con la etiqueta y el color del gráfico. */
export function ChartTooltipContent({
  active,
  payload,
  label,
  valueFormatter,
}: {
  active?: boolean
  payload?: TooltipItem[]
  label?: string | number
  valueFormatter?: (value: number | string) => string
}) {
  const config = useChartConfig()
  if (!active || !payload || payload.length === 0) return null
  const format = (value: number | string | undefined): string => {
    if (value === undefined) return ''
    return valueFormatter ? valueFormatter(value) : String(value)
  }
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-md">
      {label !== undefined ? (
        <p className="mb-1 font-medium">{String(label)}</p>
      ) : null}
      <ul className="flex flex-col gap-1">
        {payload.map((item) => {
          const key = String(item.dataKey ?? item.name ?? '')
          const entry = config[key]
          return (
            <li key={key} className="flex items-center gap-2">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: item.color ?? entry?.color }}
              />
              <span className="text-muted-foreground">
                {entry?.label ?? item.name ?? key}
              </span>
              <span className="font-medium">{format(item.value)}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
