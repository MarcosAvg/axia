import type { TicketTimelineItem } from './types'

export interface TimelineCycle {
  cycle: number
  items: TicketTimelineItem[]
}

/** Texto libre asociado a un evento, si lo hay (nota, descripción, trabajo). */
export function timelineNote(item: TicketTimelineItem): string | null {
  const {
    text,
    note,
    work_description: workDescription,
    description,
  } = item.payload
  if (typeof text === 'string') return text
  if (typeof workDescription === 'string') return workDescription
  if (typeof description === 'string') return description
  if (typeof note === 'string') return note
  return null
}

const TARGET_EVENTS = new Set([
  'assigned_technician',
  'reassigned_technician',
  'auxiliary_added',
  'reassigned_supervisor',
])

/** Nombre del sujeto y etiqueta según el tipo de evento. */
export function timelineSubject(
  item: TicketTimelineItem,
): { label: 'subject' | 'target'; name: string } | null {
  const name =
    item.subjectRequesterName ??
    item.subjectTechnicianName ??
    item.subjectUserName
  if (!name || name === item.actorName) return null
  return { label: TARGET_EVENTS.has(item.type) ? 'target' : 'subject', name }
}

/** Agrupa la línea de tiempo por ciclo de atención, en orden ascendente. */
export function groupTimelineByCycle(
  items: TicketTimelineItem[],
): TimelineCycle[] {
  const grouped = new Map<number, TicketTimelineItem[]>()
  for (const item of items) {
    const list = grouped.get(item.cycle)
    if (list) {
      list.push(item)
    } else {
      grouped.set(item.cycle, [item])
    }
  }
  return [...grouped.entries()]
    .sort(([a], [b]) => a - b)
    .map(([cycle, cycleItems]) => ({ cycle, items: cycleItems }))
}
