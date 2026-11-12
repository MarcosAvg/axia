import {
  activeTechnicianId,
  atHours,
  reassignedAt,
  type DemoEvent,
  type EventDraft,
  type TicketContext,
} from './ticket-internal.js'
import { pushOutcomeEvents } from './ticket-outcome-events.js'

type Push = (event: EventDraft) => void

function pushInitialEvents(context: TicketContext, push: Push) {
  const { people, times, ids } = context
  push({
    type: 'created',
    at: times.created,
    actorId: people.supervisorId,
    subjectRequesterId: ids.requesterId,
  })
  push({
    type: 'offered',
    at: times.created,
    actorId: people.supervisorId,
    subjectRequesterId: ids.requesterId,
  })
}

function pushRoutingEvents(context: TicketContext, push: Push) {
  const { ticket, people, times, ids, reasons, stage } = context
  const supervisor = people.supervisorId
  if (stage >= 1) {
    push({ type: 'taken', at: times.taken, actorId: supervisor })
  }
  if (ticket.supervisorReassignment && stage >= 1) {
    push({
      type: 'reassigned_supervisor',
      at: atHours(times.taken, ticket.supervisorReassignment.afterHours),
      actorId: supervisor,
      subjectUserId: supervisor,
      reasonId: reasons.id(
        'supervisor_reassignment',
        ticket.supervisorReassignment.reason,
      ),
    })
  }
  if (stage >= 2) {
    push({
      type: 'assigned_technician',
      at: times.assigned,
      actorId: supervisor,
      technicianId: ids.technicianId,
      payload: {
        technicianId: ids.technicianId,
        auxiliary: Boolean(ticket.auxiliary),
      },
    })
  }
}

function pushReworkEvents(context: TicketContext, push: Push) {
  const { ticket, people, times, ids, reasons, stage } = context
  const supervisor = people.supervisorId
  if (ticket.recapture) {
    push({
      type: 'capture_recaptured',
      at: atHours(times.reportedAt, ticket.recapture.afterHours),
      actorId: supervisor,
      reasonId: reasons.id('recapture', ticket.recapture.reason),
      payload: { description: 'Descripción corregida en la demo' },
    })
  }
  if (ticket.reassignment) {
    const technicianId = people.technicians[ticket.reassignment.technician]
    push({
      type: 'reassigned_technician',
      at: reassignedAt(context, ticket.reassignment.afterHours),
      actorId: supervisor,
      technicianId,
      reasonId: reasons.id(
        'technician_reassignment',
        ticket.reassignment.reason,
      ),
      payload: { technicianId },
    })
  }
  if (ticket.auxiliary && ids.auxiliaryTechnicianId && stage >= 3) {
    push({
      type: 'auxiliary_added',
      at: atHours(times.started, 0.2),
      actorId: supervisor,
      technicianId: ids.auxiliaryTechnicianId,
      reasonId: reasons.id('auxiliary_support', 'Apoyo por carga de trabajo'),
      payload: { technicianId: ids.auxiliaryTechnicianId },
    })
  }
}

function pushPauseEvents(context: TicketContext, push: Push) {
  const { ticket, people, times, reasons } = context
  const technicianId = activeTechnicianId(context)
  for (const pause of ticket.pauses ?? []) {
    const substateId = reasons.id('pause', pause.substate, pause.root)
    const exitId =
      pause.exit !== undefined
        ? reasons.id('pause', pause.exit, pause.root)
        : substateId
    push({
      type: 'paused',
      at: atHours(times.reportedAt, pause.openedAfterHours),
      actorId: people.technicianUserId,
      technicianId,
      reasonId: reasons.id('pause', pause.root),
    })
    push({
      type: 'pause_advanced',
      at: atHours(times.reportedAt, pause.advanceAfterHours),
      actorId: people.technicianUserId,
      technicianId,
      reasonId: substateId,
    })
    if (pause.closedAfterHours !== undefined) {
      push({
        type: 'resumed',
        at: atHours(times.reportedAt, pause.closedAfterHours),
        actorId: people.technicianUserId,
        technicianId,
        reasonId: exitId,
      })
    }
  }
}

function pushWorkEvents(context: TicketContext, push: Push) {
  const { people, times, stage } = context
  const technicianId = activeTechnicianId(context)
  if (stage >= 3) {
    push({
      type: 'started',
      at: times.started,
      actorId: people.technicianUserId,
      technicianId,
    })
  }
  pushPauseEvents(context, push)
  if (stage >= 4) {
    push({
      type: 'attended',
      at: times.attended,
      actorId: people.technicianUserId,
      technicianId,
      payload: {
        workDescription:
          'Trabajo de demostración concluido; se verificó el funcionamiento.',
      },
    })
  }
}

function claimActor(context: TicketContext) {
  return context.ticket.requester === 'ana'
    ? context.people.requesterUserId
    : context.people.supervisorId
}

function pushClaimEvents(context: TicketContext, push: Push) {
  const { ticket, times, ids, reasons } = context
  if (ticket.status !== 'under_claim' || !times.claimAt) return
  push({
    type: 'claim_opened',
    at: times.claimAt,
    actorId: claimActor(context),
    subjectRequesterId: ids.requesterId,
    reasonId: reasons.id('claim', ticket.claimReason ?? 'Trabajo incompleto'),
    payload: { description: ticket.claimDescription ?? 'Reclamación demo' },
  })
}

function pushReopenEvents(context: TicketContext, push: Push) {
  const { ticket, people, times, ids, reasons } = context
  if (!ticket.reopen || !times.reopen) return
  const supervisor = people.supervisorId
  const secondTechnician = ticket.reopen.technician
    ? people.technicians[ticket.reopen.technician]
    : activeTechnicianId(context)
  push({
    type: 'claim_opened',
    at: times.reopen.claimAt,
    actorId: claimActor(context),
    subjectRequesterId: ids.requesterId,
    reasonId: reasons.id('claim', ticket.reopen.claimReason),
    payload: { description: ticket.reopen.description },
  })
  push({
    type: 'claim_resolved',
    at: times.reopen.resolvedAt,
    actorId: supervisor,
    payload: { resolution: 'upheld' },
  })
  push({
    type: 'reopened',
    at: times.reopen.resolvedAt,
    actorId: supervisor,
    cycle: 2,
  })
  push({
    type: 'assigned_technician',
    at: times.reopen.resolvedAt,
    actorId: supervisor,
    technicianId: secondTechnician,
    cycle: 2,
    payload: { technicianId: secondTechnician, auxiliary: false },
  })
  push({
    type: 'started',
    at: times.reopen.started,
    actorId: people.technicianUserId,
    technicianId: secondTechnician,
    cycle: 2,
  })
  push({
    type: 'attended',
    at: times.reopen.attended,
    actorId: people.technicianUserId,
    technicianId: secondTechnician,
    cycle: 2,
    payload: {
      workDescription: 'Segundo ciclo de la demo tras la reclamación.',
    },
  })
}

function pushValidationPair(
  context: TicketContext,
  push: Push,
  validation: { at: Date; cycle: number; partial: boolean },
) {
  const { people, ids } = context
  const supervisor = people.supervisorId
  push({
    type: 'validated',
    at: validation.at,
    actorId: supervisor,
    subjectRequesterId: ids.requesterId,
    cycle: validation.cycle,
    payload: { partial: validation.partial, role: 'requester' },
  })
  push({
    type: 'validated',
    at: validation.at,
    actorId: supervisor,
    subjectUserId: supervisor,
    cycle: validation.cycle,
    payload: { partial: validation.partial, role: 'supervisor' },
  })
}

function pushValidationEvents(context: TicketContext, push: Push) {
  const { ticket, times } = context
  if (ticket.status !== 'closed') return
  pushValidationPair(context, push, {
    at: times.validated,
    cycle: 1,
    partial: Boolean(ticket.reopen),
  })
  if (ticket.reopen && times.reopen) {
    pushValidationPair(context, push, {
      at: times.reopen.validated,
      cycle: 2,
      partial: false,
    })
  }
}

export function buildEvents(context: TicketContext): DemoEvent[] {
  const events: DemoEvent[] = []
  let order = 0
  const push: Push = (event) => {
    events.push({ ...event, order: order++ })
  }
  pushInitialEvents(context, push)
  pushRoutingEvents(context, push)
  pushReworkEvents(context, push)
  pushWorkEvents(context, push)
  pushClaimEvents(context, push)
  pushReopenEvents(context, push)
  pushValidationEvents(context, push)
  pushOutcomeEvents(context, push)
  return events.sort(
    (left, right) =>
      left.at.getTime() - right.at.getTime() || left.order - right.order,
  )
}
