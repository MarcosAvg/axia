import { insertDemoEvidence } from './evidence.js'
import { buildEvents } from './ticket-events.js'
import type { DemoEvent, TicketContext } from './ticket-internal.js'

async function insertEvidenceEvent(context: TicketContext, event: DemoEvent) {
  if (
    context.ticket.evidence === false ||
    (event.type !== 'started' && event.type !== 'attended') ||
    event.technicianId === undefined
  ) {
    return
  }
  await insertDemoEvidence(context.client, context.storage, {
    ticketId: context.ticket.id,
    actorId: context.people.technicianUserId,
    technicianId: event.technicianId,
    subjectTechnicianId: event.technicianId,
    type: event.type === 'started' ? 'before' : 'after',
    at: event.at,
    cycle: event.cycle ?? 1,
  })
}

export async function insertEvents(context: TicketContext) {
  const { client, ticket } = context
  for (const event of buildEvents(context)) {
    await insertEvidenceEvent(context, event)
    await client.query(
      `insert into public.ticket_events (
         ticket_id, cycle, type, actor_id, subject_user_id,
         subject_technician_id, subject_requester_id, reason_id,
         occurred_at, payload
       ) values ($1, $2, $3::public.event_type, $4, $5, $6, $7, $8, $9, $10::jsonb)`,
      [
        ticket.id,
        event.cycle ?? 1,
        event.type,
        event.actorId,
        event.subjectUserId ?? null,
        event.technicianId ?? null,
        event.subjectRequesterId ?? null,
        event.reasonId ?? null,
        event.at,
        JSON.stringify(event.payload ?? {}),
      ],
    )
  }
}
