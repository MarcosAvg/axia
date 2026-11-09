import type {
  CategoryOption,
  Option,
  RequesterOption,
  TechnicianOption,
} from '@/features/catalogs'

export interface TicketFilterCatalogs {
  buildings: Option[]
  categories: CategoryOption[]
  teams: Option[]
  priorities: Option[]
  requesters: RequesterOption[]
  technicians: TechnicianOption[]
  dependencies: Option[]
  serviceTypes: Option[]
}
