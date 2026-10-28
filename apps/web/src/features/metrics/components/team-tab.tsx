import type { TechnicianRow } from '../domain/indicators'
import { metricsMessages } from '../i18n'
import { ChartCard } from './chart-card'
import { TechnicianTable } from './technician-table'

/** Equipo: carga y participación por técnico, en una sola tabla. */
export function TeamTab({ technicians }: { technicians: TechnicianRow[] }) {
  const sorted = [...technicians].sort(
    (left, right) => right.tickets - left.tickets,
  )
  return (
    <ChartCard
      title={metricsMessages.technicians.title}
      hint={metricsMessages.chartHints.techniciansTable}
    >
      <div className="max-h-[32rem] overflow-auto">
        <TechnicianTable rows={sorted} />
      </div>
    </ChartCard>
  )
}
