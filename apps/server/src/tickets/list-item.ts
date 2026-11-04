import { iso, optionalIso } from './format.js'

export type TicketListItem = {
  id: string
  folio: string
  status: string
  reportedAt: string
  closedAt: string | null
  description: string
  requesterName: string
  possibleDuplicate: boolean
  buildingName: string | null
  categoryName: string | null
  priorityName: string | null
  priorityPosition: number | null
  teamName: string | null
  isUnrouted: boolean
}

export type ListRow = {
  id: string
  folio: string
  status: string
  reported_at: Date | string
  closed_at: Date | string | null
  description: string
  requester_name: string
  possible_duplicate: boolean
  building_name: string | null
  category_name: string | null
  priority_name: string | null
  priority_position: number | null
  team_name: string | null
  is_unrouted: boolean
  total: number
}

export function toListItem(
  row: ListRow,
  canSeeRouting: boolean,
): TicketListItem {
  return {
    id: row.id,
    folio: row.folio,
    status: row.status,
    reportedAt: iso(row.reported_at),
    closedAt: optionalIso(row.closed_at),
    description: row.description,
    requesterName: row.requester_name,
    possibleDuplicate: row.possible_duplicate,
    buildingName: row.building_name,
    categoryName: row.category_name,
    priorityName: row.priority_name,
    priorityPosition: row.priority_position,
    teamName: row.team_name,
    isUnrouted: canSeeRouting && row.is_unrouted,
  }
}
