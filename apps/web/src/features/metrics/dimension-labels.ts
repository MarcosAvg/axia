import type { Dimension } from './domain/metrics'

export const outcomeMessages = {
  title: 'Desenlaces',
  open: 'Abiertos',
  closed: 'Cerrados',
  rejected: 'Rechazados',
  cancelled: 'Cancelados',
  duplicate: 'Duplicados',
  tickets: 'Tiquets',
  average: 'Tiempo medio',
} as const

export function dimensionValueLabel(
  dimension: Dimension,
  id: string,
  name: string,
): string {
  if (dimension === 'outcome') {
    return outcomeMessages[id as keyof typeof outcomeMessages] || name || id
  }
  return name || id
}

export const dimensionLabels: Record<Dimension, string> = {
  category: 'Categoría',
  subcategory: 'Subcategoría',
  problem: 'Problema',
  building: 'Edificio',
  location: 'Ubicación',
  dependency: 'Dependencia',
  team: 'Equipo',
  requester: 'Solicitante',
  outcome: 'Desenlace',
  status: 'Estado',
  priority: 'Prioridad',
  channel: 'Canal',
  service_type: 'Tipo de servicio',
}
