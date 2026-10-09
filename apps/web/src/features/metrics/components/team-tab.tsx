import type { TechnicianRow } from '../domain/indicators'
import { metricsMessages } from '../i18n'
import { ChartCard } from './chart-card'
import { TechnicianTable } from './technician-table'

/** Equipo: carga y participación por técnico. */
export function TeamTab({ technicians }: { technicians: TechnicianRow[] }) {
  return (
    <div className="flex flex-col gap-4">
      <ChartCard title={metricsMessages.technicians.title}>
        <TechnicianTable rows={technicians} />
      </ChartCard>
    </div>
  )
}
