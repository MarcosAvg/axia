// Textos del panel de acciones del detalle del tiquet (es-MX).

import type { ActionGroupKey } from './domain/action-groups'
import type { ActionKey } from './domain/actions'

export const actionGroupLabels: Record<ActionGroupKey, string> = {
  work: 'Trabajo',
  assignment: 'Asignación',
  adjustments: 'Ajustes',
  claims: 'Reclamaciones',
  sensitive: 'Zona sensible',
}

export const actionHints: Partial<Record<ActionKey, string>> = {
  assign_technician: 'Asigna el tiquet a un técnico para iniciar la atención.',
  assign_supervisor: 'Cambia el supervisor responsable del tiquet.',
  add_auxiliary: 'Suma un técnico de apoyo al trabajo.',
  start: 'Inicia el trabajo y registra la evidencia de antes.',
  pause: 'Detén el avance y documenta el motivo.',
  advance_pause: 'Actualiza el subestado de la pausa abierta.',
  resume: 'Retoma el trabajo después de la pausa.',
  attend: 'Cierra tu parte y registra la evidencia de después.',
  validate: 'Cierra el tiquet después de validar la atención.',
  reject: 'Descarta el tiquet con un motivo.',
  cancel: 'Cancela el tiquet con un motivo.',
  change_priority: 'Ajusta la prioridad del tiquet.',
  comment: 'Agrega una nota interna al historial.',
  recapture: 'Corrige los datos de la captura original.',
  open_claim: 'Abre una reclamación con motivo y evidencia.',
  resolve_claim: 'Resuelve la reclamación abierta.',
  mark_duplicate: 'Enlaza este tiquet con el original.',
  reactivate: 'Devuelve el tiquet descartado al flujo.',
}

export const actionPanelMessages = {
  primary: 'Siguiente paso',
  sensitiveHelp: 'Estas acciones descartan o cierran el tiquet.',
} as const
