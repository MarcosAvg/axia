import type { ReasonUse, TechnicianOption } from '@/features/catalogs'
import type { ActionKey } from './actions'
import type { TicketStatus } from './types'

export function listTechnicians(
  data: TechnicianOption[] | undefined,
  action: ActionKey,
  excludeIds: string[] | undefined,
): TechnicianOption[] {
  const all = data ?? []
  if (action !== 'add_auxiliary' || !excludeIds) return all
  return all.filter((technician) => !excludeIds.includes(technician.id))
}

export interface AssignmentState {
  selected: TechnicianOption | undefined
  canLead: boolean
  reasonRequired: boolean
  reasonUse: ReasonUse
}

export interface AssignmentStateInput {
  action: ActionKey
  ticket: { categoryId: string; status: TicketStatus }
  technicians: TechnicianOption[]
  technicianId: string
  fallbackReasonUse: ReasonUse
}

/**
 * Decide si la asignación es de líder o de auxiliar. Un técnico no designado
 * para la categoría se agrega como auxiliar y exige motivo; reasignar al líder
 * también exige motivo.
 */
export function assignmentState({
  action,
  ticket,
  technicians,
  technicianId,
  fallbackReasonUse,
}: AssignmentStateInput): AssignmentState {
  const selected = technicians.find((item) => item.id === technicianId)
  const canLead = Boolean(
    selected && selected.categoryIds.includes(ticket.categoryId),
  )
  const reassignment = ['assigned', 'in_progress', 'paused'].includes(
    ticket.status,
  )
  const reasonRequired =
    action === 'add_auxiliary' ||
    (action === 'assign_technician' &&
      Boolean(selected) &&
      (!canLead || reassignment))
  const reasonUse =
    action === 'assign_technician'
      ? selected && !canLead
        ? 'auxiliary_support'
        : 'technician_reassignment'
      : fallbackReasonUse
  return { selected, canLead, reasonRequired, reasonUse }
}
