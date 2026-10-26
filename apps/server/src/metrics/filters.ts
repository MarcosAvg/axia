export type MetricsFilters = {
  from?: string
  to?: string
  buildingId?: string
  teamId?: string
  categoryId?: string
  dependencyId?: string
}

export function filterParams(filters: MetricsFilters) {
  return {
    p_from: filters.from || null,
    p_to: filters.to || null,
    p_building: filters.buildingId || null,
    p_team: filters.teamId || null,
    p_category: filters.categoryId || null,
    p_dependency: filters.dependencyId || null,
  }
}
