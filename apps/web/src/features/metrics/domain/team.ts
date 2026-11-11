import type { AuxiliaryCategoryRow, TechnicianRow } from './indicators'
import { totalInMode, type TimeMode } from './time-mode'

/** Proporción de ofertas tomadas, pendientes o retiradas. */
export function offerRate(part: number, total: number): number {
  return total > 0 ? part / total : 0
}

/** Participación del técnico en el reloj elegido. */
export function technicianParticipation(
  row: Pick<
    TechnicianRow,
    'participationMinutes' | 'participationLaborMinutes'
  >,
  mode: TimeMode,
): number {
  return totalInMode(
    row.participationMinutes,
    row.participationLaborMinutes,
    mode,
  )
}

/** Tiempo de apoyo auxiliar en el reloj elegido. */
export function auxiliaryMinutes(
  row: Pick<AuxiliaryCategoryRow, 'minutes' | 'laborMinutes'>,
  mode: TimeMode,
): number {
  return totalInMode(row.minutes, row.laborMinutes, mode)
}
