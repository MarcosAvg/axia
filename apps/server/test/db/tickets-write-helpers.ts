import { sql } from 'drizzle-orm'

import { cookieFrom, login } from './auth-helpers.js'
import type { TicketHttpContext } from './tickets-http-helpers.js'

const WRITE_PASSWORD = 'TicketPassword123!'

export type WriteRefs = {
  buildingId: string
  locationId: string
  dependencyId: string
  categoryId: string
  serviceTypeId: string
  priorityId: string
  channelId: string
  requesterId: string
  technicianId: string
  teamId: string
}

export async function loadWriteRefs(
  context: TicketHttpContext,
): Promise<WriteRefs> {
  const result = await context.db.execute(sql`
    select
      (select id from public.buildings where name = 'Edificio A1') as building_id,
      (select id from public.locations where name = 'Sala A1') as location_id,
      (select id from public.dependencies where name = 'Dependencia') as dependency_id,
      (select id from public.categories where name = 'Categoría A') as category_id,
      (select id from public.service_types where name = 'Correctivo') as service_type_id,
      (select id from public.priorities where name = 'Media') as priority_id,
      (select id from public.channels where name = 'Teléfono') as channel_id,
      (select id from public.requesters where full_name = 'Solicitante vinculado') as requester_id,
      (select id from public.technicians where full_name = 'Técnico A') as technician_id,
      (select id from public.teams where name = 'Equipo A') as team_id
  `)
  const row = result.rows[0] as
    | {
        building_id: string
        location_id: string
        dependency_id: string
        category_id: string
        service_type_id: string
        priority_id: string
        channel_id: string
        requester_id: string
        technician_id: string
        team_id: string
      }
    | undefined
  if (!row) throw new Error('Write refs could not be loaded')
  return {
    buildingId: row.building_id,
    locationId: row.location_id,
    dependencyId: row.dependency_id,
    categoryId: row.category_id,
    serviceTypeId: row.service_type_id,
    priorityId: row.priority_id,
    channelId: row.channel_id,
    requesterId: row.requester_id,
    technicianId: row.technician_id,
    teamId: row.team_id,
  }
}

export async function addSecondSupervisor(
  context: TicketHttpContext,
  refs: WriteRefs,
): Promise<string> {
  const source = await context.db.execute(sql`
    select password_hash from public.users where username = 'supervisor-access'
  `)
  const passwordHash = (source.rows[0] as { password_hash: string })
    .password_hash
  const user = await context.db.execute(sql`
    insert into public.users (
      username, full_name, password_hash, must_change_password
    ) values ('supervisor-a2', 'Supervisor A2', ${passwordHash}, false)
    returning id
  `)
  const userId = (user.rows[0] as { id: string }).id
  await context.db.execute(sql`
    insert into public.user_roles (user_id, role_id)
    select ${userId}, id from public.roles where name = 'supervisor'
  `)
  const scope = await context.db.execute(sql`
    insert into public.supervisor_scopes (user_id, team_id)
    values (${userId}, ${refs.teamId})
    returning id
  `)
  const scopeId = (scope.rows[0] as { id: string }).id
  await context.db.execute(sql`
    insert into public.supervisor_scope_buildings (scope_id, building_id)
    values (${scopeId}, ${refs.buildingId})
  `)
  const response = await login(context.app, 'supervisor-a2', WRITE_PASSWORD)
  if (response.statusCode !== 200) {
    throw new Error(`Second supervisor login failed: ${response.statusCode}`)
  }
  return cookieFrom(response)
}
