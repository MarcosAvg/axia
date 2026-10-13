import type { ActionKey } from './actions'

/**
 * Énfasis visual de una acción. `primary` es la sólida (el siguiente paso); el
 * resto son tintes suaves y sólo cambian el color, no la jerarquía.
 */
export type ActionEmphasis =
  'primary' | 'success' | 'info' | 'warning' | 'danger' | 'neutral'

// Color por lo que hace la acción:
// - success: cierra/confirma o recupera el tiquet (logro).
// - info: hace avanzar el trabajo (inicio, avance, atención, asignación).
// - warning: frena o cambia el sentido (pausa, prioridad).
// - danger: descarta o marca (rechazar, cancelar, duplicado).
// - neutral: comunicación o corrección (comentario, reclamación, recaptura).
const EMPHASIS: Record<ActionKey, ActionEmphasis> = {
  validate: 'success',
  resolve_claim: 'success',
  reactivate: 'success',
  start: 'info',
  resume: 'info',
  advance_pause: 'info',
  record_progress: 'info',
  attend: 'info',
  assign_technician: 'info',
  assign_supervisor: 'info',
  add_auxiliary: 'info',
  pause: 'warning',
  change_priority: 'warning',
  reject: 'danger',
  cancel: 'danger',
  mark_duplicate: 'danger',
  comment: 'neutral',
  open_claim: 'neutral',
  recapture: 'neutral',
}

/** Énfasis visual de una acción del tiquet. */
export function actionEmphasis(action: ActionKey): ActionEmphasis {
  return EMPHASIS[action]
}
