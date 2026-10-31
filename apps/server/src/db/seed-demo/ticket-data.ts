import type { DemoCatalogs } from './catalogs.js'
import type { DemoTicket } from './data.js'
import type { DemoPeople } from './people.js'

export type ResolvedTicket = {
  categoryId: string
  subcategoryId: string
  problemId: string
  buildingId: string
  locationId: string
  dependencyId: string
  teamId: string
  requesterId: string
  requesterName: string
  requesterContact: string
}

export type TicketTimes = {
  reportedAt: Date
  created: Date
  taken: Date
  assigned: Date
  started: Date
  attended: Date
  validated: Date
}

function pick(
  values: Record<string, string>,
  key: string,
  label: string,
): string {
  const value = values[key]
  if (!value) throw new Error(`Demo catalog not found: ${label} ${key}`)
  return value
}

export function resolveTicketIds(
  ticket: DemoTicket,
  catalogs: DemoCatalogs,
  people: DemoPeople,
): ResolvedTicket {
  const categories: Record<string, string> = {
    Eléctrico: catalogs.electrical,
    Plomería: catalogs.plumbing,
    Clima: catalogs.climate,
    Accesos: catalogs.access,
  }
  const subcategories: Record<string, string> = {
    Contacto: catalogs.contact,
    Iluminación: catalogs.lighting,
    Fuga: catalogs.leak,
    Drenaje: catalogs.drainage,
    'Aire acondicionado': catalogs.air,
    Puertas: catalogs.doors,
  }
  const problems: Record<string, string> = {
    'Chispa o corto': catalogs.spark,
    'Lámpara fundida': catalogs.lamp,
    Goteo: catalogs.drip,
    Taponamiento: catalogs.clog,
    'No enfría': catalogs.noCooling,
    'No cierra': catalogs.noClose,
  }
  const buildings: Record<string, string> = {
    'Edificio Central': catalogs.central,
    'Edificio Norte': catalogs.north,
  }
  const locations: Record<string, string> = {
    'Edificio Central|Planta baja': catalogs.locations.centralGround,
    'Edificio Central|Piso 1': catalogs.locations.centralFirst,
    'Edificio Norte|Planta baja': catalogs.locations.northGround,
    'Edificio Norte|Piso 1': catalogs.locations.northFirst,
  }
  const dependencies: Record<string, string> = {
    Sistemas: catalogs.systems,
    'Recursos Humanos': catalogs.hr,
  }
  const isAccess = ticket.category === 'Accesos'
  const isAna = ticket.requester === 'ana'
  return {
    categoryId: pick(categories, ticket.category, 'categoría'),
    subcategoryId: pick(subcategories, ticket.subcategory, 'subcategoría'),
    problemId: pick(problems, ticket.problem, 'problema'),
    buildingId: pick(buildings, ticket.building, 'edificio'),
    locationId: pick(
      locations,
      `${ticket.building}|${ticket.location}`,
      'ubicación',
    ),
    dependencyId: pick(dependencies, ticket.dependency, 'dependencia'),
    teamId: isAccess ? catalogs.security : catalogs.maintenance,
    requesterId: isAna ? people.requesters.ana : people.requesters.beto,
    requesterName: isAna ? 'Ana Pérez' : 'Beto Lima',
    requesterContact: isAna ? 'ana@example.test' : 'beto@example.test',
  }
}

export function ticketTimes(ticket: DemoTicket): TicketTimes {
  const reportedAt = new Date(
    Date.now() - ticket.reportedHoursAgo * 60 * 60 * 1000,
  )
  const at = (hours: number) =>
    new Date(reportedAt.getTime() + hours * 60 * 60 * 1000)
  return {
    reportedAt,
    created: reportedAt,
    taken: at(0.5),
    assigned: at(1),
    started: at(2),
    attended: at(24),
    validated: at(48),
  }
}
