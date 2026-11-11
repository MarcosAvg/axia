import type { TicketListItem } from './types'

const UNASSIGNED = new Set(['registered', 'with_supervisor'])

/** Separa la cola del equipo entre pendientes de técnico y trabajo activo. */
export function splitTeamQueue(items: TicketListItem[]) {
  return {
    unassigned: items.filter((item) => UNASSIGNED.has(item.status)),
    team: items.filter((item) => !UNASSIGNED.has(item.status)),
  }
}

/** Evita repetir en la cola del equipo los tiquets que ya están ofrecidos. */
export function withoutOffers(
  items: TicketListItem[],
  offerIds: ReadonlySet<string>,
) {
  return items.filter((item) => !offerIds.has(item.id))
}
