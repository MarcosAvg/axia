export type CreateTicketInput = {
  buildingId: string
  locationId: string
  dependencyId: string
  categoryId: string
  subcategoryId: string
  problemId: string
  serviceTypeId?: string
  priorityId?: string
  channelId?: string
  description: string
  requesterId: string
  requesterName?: string
  requesterContact?: string
  occurredAt?: string
  clientRequestId: string
}

export type CreateTicketResult = {
  ticketId: string
  folio: string
  possibleDuplicate: boolean
  replayed: boolean
}

export type TicketSummaryRow = {
  id: string
  folio: string
  possible_duplicate: boolean
}
