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

/** Carga los catálogos que necesita el alta, con los selects dependientes. */
export function useCreateTicketCatalogs(
  buildingId?: string,
  locationId?: string,
  categoryId?: string,
  subcategoryId?: string,
) {
  const buildings = useBuildings()
  const locations = useLocations(buildingId)
  const dependencies = useDependencies(locationId)
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
