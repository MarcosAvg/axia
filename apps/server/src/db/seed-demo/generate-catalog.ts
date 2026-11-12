import type { DemoTicketStatus, RequesterKey, TechnicianKey } from './data.js'
import { shuffle, type Rng } from './random.js'

const GENERATED_TICKET_COUNT = 234

const STATUS_QUOTAS: Array<[DemoTicketStatus, number]> = [
  ['closed', 150],
  ['attended', 10],
  ['in_progress', 12],
  ['paused', 6],
  ['assigned', 10],
  ['with_supervisor', 8],
  ['registered', 6],
  ['under_claim', 6],
  ['rejected', 10],
  ['cancelled', 10],
  ['duplicate', 6],
]

export const CATEGORIES = [
  {
    category: 'Eléctrico',
    subcategory: 'Contacto',
    problem: 'Chispa o corto',
    technicians: ['lead', 'second', 'electrical'] as TechnicianKey[],
    weight: 30,
  },
  {
    category: 'Eléctrico',
    subcategory: 'Iluminación',
    problem: 'Lámpara fundida',
    technicians: ['lead', 'second', 'electrical'] as TechnicianKey[],
    weight: 22,
  },
  {
    category: 'Plomería',
    subcategory: 'Fuga',
    problem: 'Goteo',
    technicians: ['lead', 'second'] as TechnicianKey[],
    weight: 20,
  },
  {
    category: 'Plomería',
    subcategory: 'Drenaje',
    problem: 'Taponamiento',
    technicians: ['lead', 'second'] as TechnicianKey[],
    weight: 10,
  },
  {
    category: 'Clima',
    subcategory: 'Aire acondicionado',
    problem: 'No enfría',
    technicians: ['lead', 'climate'] as TechnicianKey[],
    weight: 13,
  },
  {
    category: 'Accesos',
    subcategory: 'Puertas',
    problem: 'No cierra',
    technicians: ['security'] as TechnicianKey[],
    weight: 8,
  },
]

export const REQUESTERS: RequesterKey[] = [
  'ana',
  'beto',
  'carla',
  'diego',
  'elena',
  'farid',
]

export const PRIORITIES: Array<[string, number]> = [
  ['Urgente', 4],
  ['Alta', 24],
  ['Media', 50],
  ['Baja', 22],
]

export const SERVICE_TYPES: Array<[string, number]> = [
  ['Correctivo', 70],
  ['Preventivo', 14],
  ['Inspección', 8],
  ['Mejora o instalación', 6],
  ['Emergencia', 2],
]

export const CHANNELS: Array<[string, number]> = [
  ['Web', 50],
  ['Teléfono', 35],
  ['Importación', 15],
]

export const REJECTION_REASONS = [
  'Fuera de alcance',
  'Información insuficiente',
  'No se pudo reproducir la falla',
  'Responsabilidad de otra área',
  'Requiere proyecto u obra mayor',
  'Sin autorización o presupuesto',
  'Solicitud improcedente',
]

export const CANCELLATION_REASONS = [
  'A petición del solicitante',
  'Creado por error',
  'Ya no es necesario',
  'Se resolvió por otro medio',
  'Sin respuesta del solicitante',
  'Decisión administrativa',
]

export const CLAIM_REASONS = [
  'Trabajo incompleto',
  'La falla persiste o regresó',
  'Calidad deficiente',
  'No corresponde a lo solicitado',
  'Daño colateral o falta de limpieza',
]

export const RECAPTURE_REASONS = [
  'Categoría mal capturada',
  'Ubicación mal capturada',
  'Tipo de servicio mal capturado',
  'Prioridad mal capturada',
  'Descripción insuficiente',
]

export const TECHNICIAN_REASSIGNMENT_REASONS = [
  'Ausencia',
  'Carga de trabajo',
  'Falta de competencia',
  'Solicitud del técnico',
]

export const SUPERVISOR_REASSIGNMENT_REASONS = [
  'Equipo incorrecto',
  'Edificio incorrecto',
  'Categoría incorrecta',
  'Ausencia o carga de trabajo',
]

export const PAUSE_TRIPLES = [
  { root: 'Falta de material', substate: 'Solicitado', exit: 'Recibido' },
  {
    root: 'Falta de personal',
    substate: 'Cobertura solicitada',
    exit: 'Personal disponible',
  },
  {
    root: 'Proveedor o contratista externo',
    substate: 'Contactado',
    exit: 'Servicio concluido',
  },
  {
    root: 'Acceso al área',
    substate: 'Acceso gestionado',
    exit: 'Acceso disponible',
  },
  {
    root: 'Autorización',
    substate: 'Trámite en revisión',
    exit: 'Autorización recibida',
  },
  {
    root: 'Herramienta o equipo especial',
    substate: 'Herramienta solicitada',
    exit: 'Herramienta disponible',
  },
  {
    root: 'Condiciones externas',
    substate: 'Condiciones en observación',
    exit: 'Condiciones restablecidas',
  },
  {
    root: 'Esperando información del solicitante',
    substate: 'Información solicitada',
    exit: 'Información recibida',
  },
  {
    root: 'Programado',
    substate: 'Fecha acordada',
    exit: 'Fecha acordada alcanzada',
  },
  {
    root: 'Diagnóstico especializado',
    substate: 'Prueba solicitada',
    exit: 'Diagnóstico concluido',
  },
]

export const RATING_SEQUENCE = [5, 4, 4, 3, 5, 4, 2, 4, 5, 3, 4, 1, 5, 4, 3]

export const OPEN_AGING_DAYS = [0.6, 2.5, 5, 10, 20, 45]

export const OLD_STATUSES: DemoTicketStatus[] = [
  'closed',
  'rejected',
  'cancelled',
  'duplicate',
]

export const PAUSE_HISTORY_STATUSES: DemoTicketStatus[] = [
  'closed',
  'attended',
  'in_progress',
  'under_claim',
]

export const SUPERVISOR_REASSIGNMENT_STATUSES: DemoTicketStatus[] = [
  'with_supervisor',
  'assigned',
  'in_progress',
  'paused',
  'closed',
]

export function statusList(rnd: Rng) {
  const list = STATUS_QUOTAS.flatMap(([status, count]) =>
    Array.from({ length: count }, () => status),
  )
  if (list.length !== GENERATED_TICKET_COUNT) {
    throw new Error('Demo ticket quotas do not match the generated count')
  }
  return shuffle(rnd, list)
}

export function generatedId(index: number) {
  return `de000000-0000-4000-8000-${String(1000 + index).padStart(12, '0')}`
}
