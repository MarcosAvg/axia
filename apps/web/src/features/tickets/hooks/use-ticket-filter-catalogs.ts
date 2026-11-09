import {
  useBuildings,
  useCategories,
  useDependencies,
  usePriorities,
  useRequesters,
  useServiceTypes,
  useTeams,
  useTechnicians,
} from '@/features/catalogs'
import type { TicketFilterCatalogs } from '../domain/filter-catalogs'

/** Catálogos que alimentan los filtros de la lista de tiquets. */
export function useTicketFilterCatalogs(): TicketFilterCatalogs {
  const buildings = useBuildings()
  const categories = useCategories()
  const teams = useTeams()
  const priorities = usePriorities()
  const requesters = useRequesters()
  const technicians = useTechnicians()
  const dependencies = useDependencies()
  const serviceTypes = useServiceTypes()

  return {
    buildings: buildings.data ?? [],
    categories: categories.data ?? [],
    teams: teams.data ?? [],
    priorities: priorities.data ?? [],
    requesters: requesters.data ?? [],
    technicians: technicians.data ?? [],
    dependencies: dependencies.data ?? [],
    serviceTypes: serviceTypes.data ?? [],
  }
}
