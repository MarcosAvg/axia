import type { TechnicianRow } from '../domain/indicators'
import { formatMinutes } from '../domain/metrics'
import { technicianParticipation } from '../domain/team'
import type { TimeMode } from '../domain/time-mode'
import { metricsMessages } from '../i18n'
import { RankingBars } from './ranking-bars'

/** Ranking de participación por técnico en el reloj activo. */
export function TechnicianParticipationChart({
  rows,
  mode,
}: {
  rows: TechnicianRow[]
  mode: TimeMode
}) {
  const chartRows = rows
    .map((row) => {
      const value = technicianParticipation(row, mode)
      return {
        id: row.technicianId,
        name: row.name,
        value,
        label: formatMinutes(value),
      }
    })
    .sort((left, right) => right.value - left.value)
    .slice(0, 10)
  if (chartRows.length < 2) return null
  return (
    <RankingBars
      rows={chartRows}
      label={metricsMessages.technicians.participation}
      height={Math.max(160, chartRows.length * 32)}
    />
  )
}
