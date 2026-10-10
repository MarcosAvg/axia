import type { TechnicianRow } from '../domain/indicators'
import { metricsMessages } from '../i18n'
import { ChartCard } from './chart-card'
import { TechnicianChart } from './technician-chart'
import { TechnicianTable } from './technician-table'

/** Equipo: tiquets por técnico (gráfica) y carga detallada (tabla). */
export function TeamTab({ technicians }: { technicians: TechnicianRow[] }) {
  return (
    <div className="flex flex-col gap-4">
      <ChartCard
        title={metricsMessages.technicians.byTechnician}
        hint={metricsMessages.chartHints.techniciansChart}
      >
        <TechnicianChart rows={technicians} />
      </ChartCard>
      <ChartCard
        title={metricsMessages.technicians.title}
        hint={metricsMessages.chartHints.techniciansTable}
      >
        <TechnicianTable rows={technicians} />
      </ChartCard>
    </div>
  )
}
