import { sql, type SQL } from 'drizzle-orm'

export type TicketFilters = {
  status?: string
  statuses?: string[]
  buildingId?: string
  categoryId?: string
  search?: string
  assigneeTechnicianId?: string
  offerSupervisorUserId?: string
  excludeFinal?: boolean
}

function baseConditions(filters: TicketFilters): SQL[] {
  const conditions: SQL[] = []
  if (filters.status) conditions.push(sql`t.status = ${filters.status}`)
  if (filters.statuses?.length) {
    const statuses = filters.statuses.map((status) => sql`${status}`)
    conditions.push(sql`t.status in (${sql.join(statuses, sql`, `)})`)
  }
  if (filters.buildingId) {
    conditions.push(sql`t.building_id = ${filters.buildingId}`)
  }
  if (filters.categoryId) {
    conditions.push(sql`t.category_id = ${filters.categoryId}`)
  }
  const search = filters.search?.replace(/[\\%_(),]/g, '').trim()
  if (search) {
    const term = `%${search}%`
    conditions.push(sql`(t.folio ilike ${term} or t.description ilike ${term})`)
  }
  return conditions
}

function assignmentConditions(filters: TicketFilters): SQL[] {
  const conditions: SQL[] = []
  if (filters.assigneeTechnicianId) {
    conditions.push(sql`exists (
      select 1
      from public.ticket_assignments a
      where a.ticket_id = t.id
        and a.ended_at is null
        and a.assignee_technician_id = ${filters.assigneeTechnicianId}
    )`)
  }
  if (filters.offerSupervisorUserId) {
    conditions.push(sql`exists (
      select 1
      from public.ticket_offers o
      where o.ticket_id = t.id
        and o.supervisor_user_id = ${filters.offerSupervisorUserId}
        and o.status = 'offered'
    )`)
  }
  if (filters.excludeFinal) {
    conditions.push(
      sql`t.status not in ('closed', 'rejected', 'cancelled', 'duplicate')`,
    )
  }
  return conditions
}

export function filterConditions(filters: TicketFilters): SQL[] {
  return [...baseConditions(filters), ...assignmentConditions(filters)]
}
