// Punto de entrada público del feature de catálogos.

export {
  useBuildings,
  useCategories,
  useChannels,
  useDependencies,
  useLocations,
  usePriorities,
  useProblems,
  useReasons,
  useRequesters,
  useServiceTypes,
  useSubcategories,
  useTechnicians,
} from './hooks/use-catalogs'
export type {
  CategoryOption,
  Option,
  ProblemOption,
  ReasonOption,
  ReasonUse,
  RequesterOption,
  SubcategoryOption,
  TechnicianOption,
} from './domain/types'
