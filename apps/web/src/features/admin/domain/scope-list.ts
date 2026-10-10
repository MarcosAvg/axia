import type { SupervisorScope, TechnicianCategory } from './access'

export interface TechnicianDesignation {
  technicianId: string
  categoryIds: string[]
}

/** Filtra ámbitos de supervisor por el texto que devuelve `label`. */
export function filterSupervisorScopes(
  scopes: SupervisorScope[],
  label: (scope: SupervisorScope) => string,
  query: string,
): SupervisorScope[] {
  const term = query.trim().toLocaleLowerCase('es-MX')
  if (!term) return scopes
  return scopes.filter((scope) =>
    label(scope).toLocaleLowerCase('es-MX').includes(term),
  )
}

/** Agrupa las designaciones por técnico. */
export function groupDesignations(
  rows: TechnicianCategory[],
): TechnicianDesignation[] {
  const map = new Map<string, string[]>()
  for (const row of rows) {
    const list = map.get(row.technicianId) ?? []
    list.push(row.categoryId)
    map.set(row.technicianId, list)
  }
  return [...map.entries()].map(([technicianId, categoryIds]) => ({
    technicianId,
    categoryIds,
  }))
}

/** Filtra designaciones por el texto que devuelve `label`. */
export function filterDesignations(
  designations: TechnicianDesignation[],
  label: (designation: TechnicianDesignation) => string,
  query: string,
): TechnicianDesignation[] {
  const term = query.trim().toLocaleLowerCase('es-MX')
  if (!term) return designations
  return designations.filter((designation) =>
    label(designation).toLocaleLowerCase('es-MX').includes(term),
  )
}
