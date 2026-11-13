import { Scatter, ScatterChart, XAxis, YAxis, ZAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { DataTable } from '@/components/shared/data-table'
import type {
  TechnicianRow,
  TechnicianSubjectTimeRow,
  TechnicianTimeRow,
} from '../domain/indicators'
import { formatMinutes } from '../domain/metrics'
import { totalInMode, type TimeMode } from '../domain/time-mode'
import { metricsMessages } from '../i18n'
import { ChartCard } from './chart-card'
import { RankingBars } from './ranking-bars'
import {
  identityColumns,
  subjectColumns,
  timeColumns,
} from './technician-columns'
import type { TechnicianView } from './technician-columns'

const t = metricsMessages.times

interface ScatterPoint {
  name: string
  tickets: number
  active: number
  participation: number
}

/** Nombre del técnico a partir del punto que Recharts entrega al tooltip. */
function tooltipName(payload: readonly unknown[]): string {
  const [entry] = payload
  if (typeof entry !== 'object' || entry === null || !('payload' in entry)) {
    return ''
  }
  const point = entry.payload
  if (typeof point !== 'object' || point === null || !('name' in point)) {
    return ''
  }
  return typeof point.name === 'string' ? point.name : ''
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
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_value, payload) => tooltipName(payload)}
            />
          }
        />
        <Scatter
          data={points}
          fill="var(--chart-1)"
          isAnimationActive={false}
        />
      </ScatterChart>
    </ChartContainer>
  )
}

function buildRows(
  technicians: TechnicianRow[],
  times: TechnicianTimeRow[],
  subjectTimes: TechnicianSubjectTimeRow[],
): TechnicianView[] {
  const timeById = new Map(times.map((time) => [time.technicianId, time]))
  const subjectById = new Map(
    subjectTimes.map((time) => [time.technicianId, time]),
  )
  return technicians.map((technician) => ({
    ...technician,
    ...timeById.get(technician.technicianId),
    ...subjectById.get(technician.technicianId),
  }))
}

function maxParticipationOf(rows: TechnicianView[], mode: TimeMode) {
  return Math.max(
    1,
    ...rows.map((row) =>
      totalInMode(
        row.participationMinutes,
        row.participationLaborMinutes,
        mode,
      ),
    ),
  )
}

function pointsOf(rows: TechnicianView[], mode: TimeMode) {
  return rows
    .filter((row) => row.avgActive !== undefined)
    .map((row) => ({
      name: row.name,
      tickets: row.tickets,
      active: totalInMode(row.avgActive ?? 0, row.avgActiveLabor ?? 0, mode),
      participation: totalInMode(
        row.participationMinutes,
        row.participationLaborMinutes,
        mode,
      ),
    }))
}

function participationOf(rows: TechnicianView[], mode: TimeMode) {
  return rows.map((row) => {
    const value = totalInMode(
      row.participationMinutes,
      row.participationLaborMinutes,
      mode,
    )
    return {
      id: row.technicianId,
      name: row.name,
      value,
      label: formatMinutes(value),
    }
  })
}

/** Tiempos de los tiquets que lideró cada técnico, con burbujas y detalle. */
export function TechnicianTimes({
  technicians,
  times,
  subjectTimes,
  mode,
}: {
  technicians: TechnicianRow[]
  times: TechnicianTimeRow[]
  subjectTimes: TechnicianSubjectTimeRow[]
  mode: TimeMode
}) {
  const rows = buildRows(technicians, times, subjectTimes)
  const maxParticipation = maxParticipationOf(rows, mode)
  const points = pointsOf(rows, mode)
  const participationRows = participationOf(rows, mode)
  return (
    <ChartCard
      title={t.technicians}
      hint={metricsMessages.chartHints.technicianTimes}
    >
      <div className="flex flex-col gap-3">
        {points.length >= 3 ? (
          <ScatterBox points={points} />
        ) : participationRows.length > 1 ? (
          <RankingBars
            rows={participationRows}
            label={t.participation}
            height={160}
          />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {metricsMessages.empty}
          </p>
        ) : null}
        <div className="max-h-80 overflow-auto">
          <DataTable
            columns={[
              ...identityColumns(maxParticipation, mode),
              ...timeColumns(mode),
              ...subjectColumns(mode),
            ]}
            rows={rows}
            getRowId={(row) => row.technicianId}
          />
        </div>
      </div>
    </ChartCard>
  )
}
