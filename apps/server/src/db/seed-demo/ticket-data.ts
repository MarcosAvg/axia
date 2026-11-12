import type { DemoCatalogs } from './catalogs.js'
import {
  DEFAULT_TIMES,
  REQUESTERS,
  type DemoTicket,
  type TechnicianKey,
} from './data.js'
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
  technicianId: string
  auxiliaryTechnicianId?: string
}

type ReopenTimes = {
  claimAt: Date
  resolvedAt: Date
  started: Date
  attended: Date
  validated: Date
}

export type TicketTimes = {
  reportedAt: Date
  created: Date
  taken: Date
  assigned: Date
  started: Date
  attended: Date
  validated: Date
  discardAt?: Date
  claimAt?: Date
  ratingAt?: Date
  reopen?: ReopenTimes
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

function classification(catalogs: DemoCatalogs) {
  return {
    categories: {
      Eléctrico: catalogs.electrical,
      Plomería: catalogs.plumbing,
      Clima: catalogs.climate,
      Accesos: catalogs.access,
    } as Record<string, string>,
    subcategories: {
      Contacto: catalogs.contact,
      Iluminación: catalogs.lighting,
      Fuga: catalogs.leak,
      Drenaje: catalogs.drainage,
      'Aire acondicionado': catalogs.air,
      Puertas: catalogs.doors,
    } as Record<string, string>,
    problems: {
      'Chispa o corto': catalogs.spark,
      'Cotización requerida': catalogs.quoted,
      'Lámpara fundida': catalogs.lamp,
      Goteo: catalogs.drip,
      Taponamiento: catalogs.clog,
      'No enfría': catalogs.noCooling,
      'No cierra': catalogs.noClose,
    } as Record<string, string>,
  }
}

function places(catalogs: DemoCatalogs) {
  return {
    buildings: {
      'Edificio Central': catalogs.central,
      'Edificio Norte': catalogs.north,
    } as Record<string, string>,
    locations: {
      'Edificio Central|Planta baja': catalogs.locations.centralGround,
      'Edificio Central|Piso 1': catalogs.locations.centralFirst,
      'Edificio Norte|Planta baja': catalogs.locations.northGround,
      'Edificio Norte|Piso 1': catalogs.locations.northFirst,
    } as Record<string, string>,
    dependencies: {
      Sistemas: catalogs.systems,
      'Recursos Humanos': catalogs.hr,
    } as Record<string, string>,
  }
}

export function resolveTicketIds(
  ticket: DemoTicket,
  catalogs: DemoCatalogs,
  people: DemoPeople,
): ResolvedTicket {
  const groups = classification(catalogs)
  const space = places(catalogs)
  const requesterSpec = REQUESTERS.find(
    (entry) => entry.key === ticket.requester,
  )
  if (!requesterSpec) {
    throw new Error(`Demo requester not found: ${ticket.requester}`)
  }
  const technicianKey: TechnicianKey = ticket.technician ?? 'lead'
  return {
    categoryId: pick(groups.categories, ticket.category, 'categoría'),
    subcategoryId: pick(
      groups.subcategories,
      ticket.subcategory,
      'subcategoría',
    ),
    problemId: pick(groups.problems, ticket.problem, 'problema'),
    buildingId: pick(space.buildings, ticket.building, 'edificio'),
    locationId: pick(
      space.locations,
      `${ticket.building}|${ticket.location}`,
      'ubicación',
    ),
    dependencyId: pick(space.dependencies, ticket.dependency, 'dependencia'),
    teamId:
      ticket.category === 'Accesos' ? catalogs.security : catalogs.maintenance,
    requesterId: people.requesters[ticket.requester],
    requesterName: requesterSpec.fullName,
    requesterContact: requesterSpec.contact,
    technicianId: people.technicians[technicianKey],
    ...(ticket.auxiliary
      ? { auxiliaryTechnicianId: people.technicians[ticket.auxiliary] }
      : {}),
  }
}

export function ticketTimes(ticket: DemoTicket): TicketTimes {
  const reportedAt = new Date(
    Date.now() - ticket.reportedHoursAgo * 60 * 60 * 1000,
  )
  const offsets = { ...DEFAULT_TIMES, ...ticket.times }
  const at = (hours: number) =>
    new Date(reportedAt.getTime() + hours * 60 * 60 * 1000)
  const times: TicketTimes = {
    reportedAt,
    created: reportedAt,
    taken: at(offsets.takenAfterHours),
    assigned: at(offsets.assignedAfterHours),
    started: at(offsets.startedAfterHours),
    attended: at(offsets.attendedAfterHours),
    validated: at(offsets.validatedAfterHours),
  }
  if (ticket.discardAfterHours !== undefined) {
    times.discardAt = at(ticket.discardAfterHours)
  }
  if (ticket.claimAfterHours !== undefined) {
    times.claimAt = at(ticket.claimAfterHours)
  }
  if (ticket.ratingAfterHours !== undefined) {
    times.ratingAt = at(ticket.ratingAfterHours)
  }
  if (ticket.reopen) {
    times.reopen = {
      claimAt: at(ticket.reopen.claimAfterHours),
      resolvedAt: at(ticket.reopen.resolveAfterHours),
      started: at(ticket.reopen.startedAfterHours),
      attended: at(ticket.reopen.attendedAfterHours),
      validated: at(ticket.reopen.validatedAfterHours),
    }
  }
  return times
}
