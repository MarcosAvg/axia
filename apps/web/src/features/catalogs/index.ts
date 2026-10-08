// Punto de entrada público del feature de catálogos.

export {
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
} from './hooks/use-catalogs'
export type {
  CategoryOption,
  Option,
  ProblemOption,
  RequesterOption,
  SubcategoryOption,
} from './domain/types'
