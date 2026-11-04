import {
  useBuildings,
  useCategories,
  useChannels,
  useDependencies,
  useLocations,
  usePriorities,
  useProblems,
  useRequesters,
  useServiceTypes,
  useSubcategories,
} from '@/features/catalogs'

function dataOf<T>(query: { data?: T[] }): T[] {
  return query.data ?? []
}

type CreateTicketCatalogOptions = {
  dependencyId?: string
  buildingId?: string
  locationId?: string
  categoryId?: string
  subcategoryId?: string
}

/** Carga los catálogos que necesita el alta, con los selects dependientes. */
export function useCreateTicketCatalogs({
  dependencyId,
  buildingId,
  locationId,
  categoryId,
  subcategoryId,
}: CreateTicketCatalogOptions) {
  const buildings = useBuildings(dependencyId)
  const locations = useLocations(buildingId, dependencyId)
  const dependencies = useDependencies(dependencyId ? undefined : locationId)
  const categories = useCategories()
  const subcategories = useSubcategories(categoryId)
  const problems = useProblems(subcategoryId)
  const serviceTypes = useServiceTypes()
  const priorities = usePriorities()
  const channels = useChannels()
  const requesters = useRequesters()

  const queries = [
    buildings,
    dependencies,
    categories,
    serviceTypes,
    priorities,
    channels,
    requesters,
  ]

  return {
    buildings: dataOf(buildings),
    locations: dataOf(locations),
    dependencies: dataOf(dependencies),
    categories: dataOf(categories),
    subcategories: dataOf(subcategories),
    problems: dataOf(problems),
    serviceTypes: dataOf(serviceTypes),
    priorities: dataOf(priorities),
    channels: dataOf(channels),
    requesters: dataOf(requesters),
    isLoading: queries.some((query) => query.isLoading),
  }
}

export type CreateTicketCatalogs = ReturnType<typeof useCreateTicketCatalogs>
