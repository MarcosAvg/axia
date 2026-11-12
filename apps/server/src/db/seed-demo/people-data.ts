import { ID } from './ids.js'

export type TechnicianKey =
  'lead' | 'second' | 'security' | 'climate' | 'electrical'

export type RequesterKey =
  'ana' | 'beto' | 'carla' | 'diego' | 'elena' | 'farid'

type CategoryKey = 'electrical' | 'plumbing' | 'climate' | 'access'

export type TechnicianSpec = {
  key: TechnicianKey
  id: string
  fullName: string
  team: 'maintenance' | 'security'
  categories: CategoryKey[]
}

export const TECHNICIANS: TechnicianSpec[] = [
  {
    key: 'lead',
    id: ID.technicianLead,
    fullName: 'Luis Gómez',
    team: 'maintenance',
    categories: ['electrical', 'plumbing', 'climate'],
  },
  {
    key: 'second',
    id: ID.technicianSecond,
    fullName: 'Marta Ruiz',
    team: 'maintenance',
    categories: ['electrical', 'plumbing'],
  },
  {
    key: 'security',
    id: ID.technicianSecurity,
    fullName: 'Diana Torres',
    team: 'security',
    categories: ['access'],
  },
  {
    key: 'climate',
    id: ID.technicianClimate,
    fullName: 'Sofía Vega',
    team: 'maintenance',
    categories: ['climate'],
  },
  {
    key: 'electrical',
    id: ID.technicianElectrical,
    fullName: 'Omar Castillo',
    team: 'maintenance',
    categories: ['electrical'],
  },
]

export type RequesterSpec = {
  key: RequesterKey
  id: string
  fullName: string
  contact: string
  dependency: 'Sistemas' | 'Recursos Humanos'
  userId?: string
}

const REQUESTER_ROWS: Array<Omit<RequesterSpec, 'id' | 'userId'>> = [
  {
    key: 'ana',
    fullName: 'Ana Pérez',
    contact: 'ana@example.test',
    dependency: 'Sistemas',
  },
  {
    key: 'beto',
    fullName: 'Beto Lima',
    contact: 'beto@example.test',
    dependency: 'Recursos Humanos',
  },
  {
    key: 'carla',
    fullName: 'Carla Núñez',
    contact: 'carla@example.test',
    dependency: 'Sistemas',
  },
  {
    key: 'diego',
    fullName: 'Diego Salas',
    contact: 'diego@example.test',
    dependency: 'Recursos Humanos',
  },
  {
    key: 'elena',
    fullName: 'Elena Ríos',
    contact: 'elena@example.test',
    dependency: 'Sistemas',
  },
  {
    key: 'farid',
    fullName: 'Farid Haddad',
    contact: 'farid@example.test',
    dependency: 'Recursos Humanos',
  },
]

const REQUESTER_IDS: Record<RequesterKey, string> = {
  ana: ID.requesterAna,
  beto: ID.requesterBeto,
  carla: ID.requesterCarla,
  diego: ID.requesterDiego,
  elena: ID.requesterElena,
  farid: ID.requesterFarid,
}

export const REQUESTERS: RequesterSpec[] = REQUESTER_ROWS.map((row) => ({
  ...row,
  id: REQUESTER_IDS[row.key],
  ...(row.key === 'ana' ? { userId: ID.userRequester } : {}),
}))
