import type { Dimension } from './domain/metrics'

export const dimensionLabels: Record<Dimension, string> = {
  category: 'Categoría',
  subcategory: 'Subcategoría',
  problem: 'Problema',
  building: 'Edificio',
  location: 'Ubicación',
  dependency: 'Dependencia',
  team: 'Equipo',
  requester: 'Solicitante',
  status: 'Estado',
  priority: 'Prioridad',
  channel: 'Canal',
  service_type: 'Tipo de servicio',
}
