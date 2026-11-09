import type { TicketDetail, TicketListItem, TicketStatus } from './types'

/** Operaciones que la cola offline puede contener para un tiquet. */
export type PendingOperation =
  | 'take'
  | 'assign_technician'
  | 'assign_supervisor'
  | 'add_auxiliary'
  | 'start'
  | 'pause'
  | 'advance_pause'
  | 'resume'
  | 'attend'
  | 'validate'
  | 'reject'
  | 'cancel'
  | 'change_priority'
  | 'comment'
  | 'recapture'
  | 'open_claim'
  | 'resolve_claim'
  | 'mark_duplicate'
  | 'reactivate'
  | 'rate'

export interface PendingTicketAction {
  id: string
  ticketId: string
  seq: number
  operation: PendingOperation
  args: Record<string, unknown>
  occurredAt: string
}

export interface PendingTicketProjection<
  T extends TicketDetail = TicketDetail,
> {
  ticket: T
  /** Acciones pendientes en el orden en que se enviarán. */
  pending: PendingTicketAction[]
  /** Verdadero si toda la secuencia se pudo proyectar sin ambigüedad. */
  complete: boolean
}

interface ProjectionState {
  status: TicketStatus
  requesterValidated: boolean
  supervisorValidated: boolean
  hasTaken: boolean
  cycle: number
}

interface ProjectionContext {
  validationPolicy: TicketDetail['validationPolicy']
  isRequester: boolean
}

type Transition = ProjectionState | 'stop'

const REASSIGNABLE: TicketStatus[] = [
  'with_supervisor',
  'assigned',
  'in_progress',
  'paused',
]

type TransitionHandler = (
  state: ProjectionState,
  action: PendingTicketAction,
  context: ProjectionContext,
) => Transition

function moveTo(from: TicketStatus[], to: TicketStatus): TransitionHandler {
  return (state) =>
    from.includes(state.status) ? { ...state, status: to } : 'stop'
}

function keepWhen(from: TicketStatus[]): TransitionHandler {
  return (state) => (from.includes(state.status) ? state : 'stop')
}

const keep: TransitionHandler = (state) => state
const stop: TransitionHandler = () => 'stop'

function takeTransition(state: ProjectionState): Transition {
  return state.status === 'registered'
    ? { ...state, status: 'with_supervisor', hasTaken: true }
    : 'stop'
}

function assignSupervisorTransition(state: ProjectionState): Transition {
  return REASSIGNABLE.includes(state.status)
    ? { ...state, status: 'with_supervisor' }
    : 'stop'
}

function validationSide(
  action: PendingTicketAction,
  context: ProjectionContext,
): 'requester' | 'supervisor' {
  const role = action.args.role
  if (role === 'requester' || role === 'supervisor') return role
  return context.isRequester || Boolean(action.args.subjectRequesterId)
    ? 'requester'
    : 'supervisor'
}

function validateTransition(
  state: ProjectionState,
  action: PendingTicketAction,
  context: ProjectionContext,
): Transition {
  if (state.status !== 'attended') return 'stop'
  const side = validationSide(action, context)
  if (side === 'requester') {
    if (state.requesterValidated) return 'stop'
    const validated = { ...state, requesterValidated: true }
    return context.validationPolicy === 'requester'
      ? { ...validated, status: 'closed' }
      : validated
  }
  if (context.validationPolicy === 'requester') return 'stop'
  if (context.validationPolicy === 'both' && !state.requesterValidated) {
    return 'stop'
  }
  if (state.supervisorValidated) return 'stop'
  return { ...state, supervisorValidated: true, status: 'closed' }
}

function claimTransition(
  state: ProjectionState,
  action: PendingTicketAction,
): Transition {
  if (state.status !== 'under_claim') return 'stop'
  const resolution = action.args.resolution
  if (resolution === 'upheld') {
    return { ...state, status: 'assigned', cycle: state.cycle + 1 }
  }
  if (resolution === 'dismissed') return { ...state, status: 'closed' }
  return 'stop'
}

function discardTo(status: TicketStatus): TransitionHandler {
  return (state) =>
    ['rejected', 'cancelled', 'duplicate'].includes(state.status)
      ? 'stop'
      : { ...state, status }
}

const HANDLERS: Record<PendingOperation, TransitionHandler> = {
  take: takeTransition,
  assign_technician: stop,
  assign_supervisor: assignSupervisorTransition,
  add_auxiliary: keep,
  start: moveTo(['assigned'], 'in_progress'),
  pause: moveTo(['in_progress'], 'paused'),
  advance_pause: keepWhen(['paused']),
  resume: moveTo(['paused'], 'in_progress'),
  attend: moveTo(['in_progress'], 'attended'),
  validate: validateTransition,
  reject: discardTo('rejected'),
  cancel: discardTo('cancelled'),
  change_priority: keep,
  comment: keep,
  recapture: stop,
  open_claim: moveTo(['attended', 'closed'], 'under_claim'),
  resolve_claim: claimTransition,
  mark_duplicate: discardTo('duplicate'),
  reactivate: stop,
  rate: keep,
}

function transition(
  state: ProjectionState,
  action: PendingTicketAction,
  context: ProjectionContext,
): Transition {
  return HANDLERS[action.operation](state, action, context)
}

function projectState(
  base: ProjectionState,
  actions: PendingTicketAction[],
  context: ProjectionContext,
): { state: ProjectionState; complete: boolean } {
  let state = base
  for (const action of actions) {
    const next = transition(state, action, context)
    if (next === 'stop') return { state, complete: false }
    state = next
  }
  return { state, complete: true }
}

function sortActions(actions: PendingTicketAction[]): PendingTicketAction[] {
  return [...actions].sort((a, b) => a.seq - b.seq)
}

/** Proyecta el detalle visible a partir de las acciones aún no sincronizadas. */
export function projectPendingTicket<T extends TicketDetail>(
  ticket: T,
  actions: PendingTicketAction[],
): PendingTicketProjection<T> {
  const pending = sortActions(actions)
  const { state, complete } = projectState(
    {
      status: ticket.status,
      requesterValidated: ticket.requesterValidated,
      supervisorValidated: ticket.supervisorValidated,
      hasTaken: ticket.hasTaken,
      cycle: ticket.cycle,
    },
    pending,
    {
      validationPolicy: ticket.validationPolicy,
      isRequester: ticket.isRequester,
    },
  )
  return {
    ticket: {
      ...ticket,
      status: state.status,
      requesterValidated: state.requesterValidated,
      supervisorValidated: state.supervisorValidated,
      hasTaken: state.hasTaken,
      cycle: state.cycle,
    },
    pending,
    complete,
  }
}

/**
 * Proyecta solo el estado para listas y resúmenes. Sin las banderas del detalle, una
 * validación se considera ambigua y no adelanta el estado.
 */
export function projectPendingStatus(
  status: TicketStatus,
  actions: PendingTicketAction[],
): TicketStatus {
  const { state } = projectState(
    {
      status,
      requesterValidated: false,
      supervisorValidated: false,
      hasTaken: false,
      cycle: 1,
    },
    sortActions(actions),
    { validationPolicy: 'both', isRequester: false },
  )
  return state.status
}

/**
 * Aplica el estado proyectado a una lista. Cada tiquet mantiene su propia
 * secuencia; las acciones de un tiquet no afectan a los demás.
 */
export function projectPendingList(
  items: TicketListItem[],
  actions: PendingTicketAction[],
): TicketListItem[] {
  if (actions.length === 0) return items
  const groups = new Map<string, PendingTicketAction[]>()
  for (const action of actions) {
    const group = groups.get(action.ticketId) ?? []
    group.push(action)
    groups.set(action.ticketId, group)
  }
  return items.map((item) => {
    const pending = groups.get(item.id)
    if (!pending) return item
    return {
      ...item,
      status: projectPendingStatus(item.status, pending),
      pendingSync: true,
    }
  })
}
