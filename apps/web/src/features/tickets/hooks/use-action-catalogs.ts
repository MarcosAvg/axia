import {
  usePriorities,
  useReasons,
  useServiceTypes,
  useTechnicians,
} from '@/features/catalogs'
import type { ReasonUse } from '@/features/catalogs'
import type { ActionValues } from '../domain/action-values'
import type { ActionKey } from '../domain/actions'
import { assignmentState, listTechnicians } from '../domain/assignment-form'
import type { TicketDetail } from '../domain/types'

/** Catálogos y asignación que necesita el formulario de una acción. */
export function useActionCatalogs({
  action,
  reasonUse,
  ticket,
  values,
  excludeIds,
}: {
  action: ActionKey
  reasonUse: ReasonUse
  ticket: TicketDetail
  values: ActionValues
  excludeIds?: string[]
}) {
  const technicians = useTechnicians()
  const priorities = usePriorities()
  const serviceTypes = useServiceTypes()
  const available = listTechnicians(technicians.data, action, excludeIds)
  const assignment = assignmentState({
    action,
    ticket,
    technicians: available,
    technicianId: values.technicianId,
    fallbackReasonUse: reasonUse,
  })
  const reasons = useReasons(assignment.reasonUse)
  return {
    technicians: available,
    priorities: priorities.data ?? [],
    serviceTypes: serviceTypes.data ?? [],
    reasons: reasons.data ?? [],
    reasonRequired: assignment.reasonRequired,
  }
}
