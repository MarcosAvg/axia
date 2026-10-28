import { Scatter, ScatterChart, XAxis, YAxis, ZAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { DataTable } from '@/components/shared/data-table'
import type { DataTableColumn } from '@/components/shared/data-table'
import type { TechnicianRow, TechnicianTimeRow } from '../domain/indicators'
import { formatMinutes } from '../domain/metrics'
import { metricsMessages } from '../i18n'
import { BarCell } from './bar-cell'
import { ChartCard } from './chart-card'

const t = metricsMessages.times

type TechnicianView = TechnicianRow & Partial<TechnicianTimeRow>

interface ScatterPoint {
  name: string
  tickets: number
  active: number
  participation: number
}

function ScatterBox({ points }: { points: ScatterPoint[] }) {
  if (points.length === 0) {
    return <p className="text-sm text-muted-foreground">{t.noTimes}</p>
  }
  const config = {
    active: { label: t.phases.active, color: 'var(--chart-1)' },
    tickets: { label: metricsMessages.table.tickets, color: 'var(--chart-1)' },
  }
  return (
    <ChartContainer config={config} className="aspect-auto h-64">
      <ScatterChart margin={{ left: 4, right: 12, top: 8, bottom: 8 }}>
        <XAxis
          type="number"
          dataKey="tickets"
          name={metricsMessages.table.tickets}
          tickLine={false}
          axisLine={false}
          fontSize={11}
        />
        <YAxis
          type="number"
          dataKey="active"
          name={t.phases.active}
          width={42}
          tickLine={false}
          axisLine={false}
          fontSize={11}
          tickFormatter={(value: number) =>
            value >= 60 ? `${Math.round(value / 60)}h` : `${Math.round(value)}m`
          }
        />
        <ZAxis
          type="number"
          dataKey="participation"
          range={[60, 320]}
          name={t.participation}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Scatter
          data={points}
          fill="var(--chart-1)"
          isAnimationActive={false}
        />
      </ScatterChart>
    </ChartContainer>
  )
}

function identityColumns(
  maxParticipation: number,
): DataTableColumn<TechnicianView>[] {
  return [
    {
      id: 'name',
      header: metricsMessages.technicians.technician,
      cell: (row) => row.name,
    },
    {
      id: 'tickets',
      header: metricsMessages.table.tickets,
      cell: (row) => row.tickets,
    },
    {
      id: 'participation',
      header: t.participation,
      cell: (row) => (
        <BarCell
          value={row.participationMinutes}
          max={maxParticipation}
          label={formatMinutes(row.participationMinutes)}
          className="min-w-40"
        />
      ),
    },
  ]
}

function timeColumns(): DataTableColumn<TechnicianView>[] {
  return [
    {
      id: 'active',
      header: t.phases.active,
      cell: (row) =>
        row.avgActive === undefined ? '—' : formatMinutes(row.avgActive),
    },
    {
      id: 'total',
      header: metricsMessages.kpi.total,
      hideBelow: 'md',
      cell: (row) =>
        row.avgTotal === undefined ? '—' : formatMinutes(row.avgTotal),
    },
    {
      id: 'response',
      header: t.phases.response,
      hideBelow: 'xl',
      cell: (row) =>
        row.avgResponse === undefined ? '—' : formatMinutes(row.avgResponse),
    },
    {
      id: 'assignment',
      header: t.phases.assignment,
      hideBelow: 'xl',
      cell: (row) =>
        row.avgAssignment === undefined
          ? '—'
          : formatMinutes(row.avgAssignment),
    },
    {
      id: 'validation',
      header: t.phases.validation,
      hideBelow: 'xl',
      cell: (row) =>
        row.avgValidation === undefined
          ? '—'
          : formatMinutes(row.avgValidation),
    },
  ]
}

/** Tiempos de los tiquets que lideró cada técnico, con burbujas y detalle. */
export function TechnicianTimes({
  technicians,
  times,
}: {
  technicians: TechnicianRow[]
  times: TechnicianTimeRow[]
}) {
  const timeById = new Map(times.map((time) => [time.technicianId, time]))
  const rows: TechnicianView[] = technicians.map((technician) => ({
    ...technician,
    ...timeById.get(technician.technicianId),
  }))
  const maxParticipation = Math.max(
    1,
    ...rows.map((row) => row.participationMinutes),
  )
  const points = rows
    .filter((row) => row.avgActive !== undefined)
    .map((row) => ({
      name: row.name,
      tickets: row.tickets,
      active: row.avgActive ?? 0,
      participation: row.participationMinutes,
    }))
  return (
    <ChartCard title={t.technicians}>
      <div className="flex flex-col gap-3">
        <ScatterBox points={points} />
        <div className="max-h-80 overflow-auto">
          <DataTable
            columns={[...identityColumns(maxParticipation), ...timeColumns()]}
            rows={rows}
            getRowId={(row) => row.technicianId}
          />
        </div>
      </div>
    </ChartCard>
  )
}
