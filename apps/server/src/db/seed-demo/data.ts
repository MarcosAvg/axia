import { ID } from './ids.js'
import type { DemoTicket, DemoTicketStatus } from './ticket-types.js'

export { ID } from './ids.js'
export * from './people-data.js'
export * from './ticket-types.js'

export const MIN_PASSWORD_LENGTH = 12

export type UserSpec = {
  id: string
  username: string
  fullName: string
  role: 'administrator' | 'supervisor' | 'technician' | 'requester'
}

export const USERS: UserSpec[] = [
  {
    id: ID.userAdmin,
    username: 'demo.admin',
    fullName: 'Administrador Demo',
    role: 'administrator',
  },
  {
    id: ID.userSupervisor,
    username: 'demo.supervisor',
    fullName: 'Supervisora Demo',
    role: 'supervisor',
  },
  {
    id: ID.userTechnician,
    username: 'demo.technician',
    fullName: 'Luis Gómez',
    role: 'technician',
  },
  {
    id: ID.userRequester,
    username: 'demo.requester',
    fullName: 'Ana Pérez',
    role: 'requester',
  },
]

export const DEMO_TICKETS: DemoTicket[] = [
  {
    id: 'de000000-0000-4000-8000-000000000001',
    status: 'registered',
    category: 'Eléctrico',
    subcategory: 'Contacto',
    problem: 'Chispa o corto',
    serviceType: 'Correctivo',
    priority: 'Media',
    channel: 'Web',
    building: 'Edificio Central',
    location: 'Planta baja',
    dependency: 'Sistemas',
    requester: 'ana',
    description: 'No enciende la luz del pasillo del ala norte',
    reportedHoursAgo: 2,
  },
  {
    id: 'de000000-0000-4000-8000-000000000002',
    status: 'with_supervisor',
    category: 'Plomería',
    subcategory: 'Fuga',
    problem: 'Goteo',
    serviceType: 'Correctivo',
    priority: 'Alta',
    channel: 'Teléfono',
    building: 'Edificio Central',
    location: 'Piso 1',
    dependency: 'Sistemas',
    requester: 'beto',
    description: 'Goteo en el lavabo del piso 1',
    reportedHoursAgo: 26,
  },
  {
    id: 'de000000-0000-4000-8000-000000000003',
    status: 'assigned',
    category: 'Eléctrico',
    subcategory: 'Iluminación',
    problem: 'Lámpara fundida',
    serviceType: 'Correctivo',
    priority: 'Media',
    channel: 'Web',
    building: 'Edificio Central',
    location: 'Planta baja',
    dependency: 'Sistemas',
    requester: 'ana',
    description: 'Lámpara del recibidor intermitente',
    reportedHoursAgo: 50,
  },
  {
    id: 'de000000-0000-4000-8000-000000000004',
    status: 'in_progress',
    category: 'Accesos',
    subcategory: 'Puertas',
    problem: 'No cierra',
    serviceType: 'Correctivo',
    priority: 'Alta',
    channel: 'Teléfono',
    building: 'Edificio Norte',
    location: 'Planta baja',
    dependency: 'Recursos Humanos',
    requester: 'beto',
    leaderParticipation: 'auxiliary',
    description: 'La puerta de acceso principal no cierra',
    reportedHoursAgo: 72,
  },
  {
    id: 'de000000-0000-4000-8000-000000000005',
    status: 'attended',
    category: 'Clima',
    subcategory: 'Aire acondicionado',
    problem: 'No enfría',
    serviceType: 'Correctivo',
    priority: 'Media',
    channel: 'Web',
    building: 'Edificio Central',
    location: 'Piso 1',
    dependency: 'Sistemas',
    requester: 'ana',
    description: 'El aire acondicionado de la sala de juntas no enfría',
    reportedHoursAgo: 120,
  },
  {
    id: 'de000000-0000-4000-8000-000000000006',
    status: 'closed',
    category: 'Plomería',
    subcategory: 'Drenaje',
    problem: 'Taponamiento',
    serviceType: 'Preventivo',
    priority: 'Baja',
    channel: 'Importación',
    building: 'Edificio Central',
    location: 'Planta baja',
    dependency: 'Recursos Humanos',
    requester: 'beto',
    description: 'Mantenimiento preventivo del drenaje del baño',
    reportedHoursAgo: 192,
  },
]

export const STAGE: Record<DemoTicketStatus, number> = {
  registered: 0,
  with_supervisor: 1,
  assigned: 2,
  in_progress: 3,
  paused: 3,
  attended: 4,
  under_claim: 4,
  closed: 5,
  rejected: 0,
  cancelled: 0,
  duplicate: 0,
}
