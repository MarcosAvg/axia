import { randomUUID } from 'node:crypto'

import { sql } from 'drizzle-orm'

import { cookieFrom, headers, login } from './auth-helpers.js'
import type { TicketHttpContext } from './tickets-http-helpers.js'

const WRITE_PASSWORD = 'TicketPassword123!'

export type WriteRefs = {
  buildingId: string
  locationId: string
  dependencyId: string
  categoryId: string
  subcategoryId: string
  problemId: string
  categoryIdB: string
  subcategoryIdB: string
  problemIdB: string
  teamIdB: string
  serviceTypeId: string
  priorityId: string
  channelId: string
  requesterId: string
  technicianId: string
  teamId: string
  pauseReasonId: string
  pauseStepId: string
  pauseExitId: string
}

type RefsRow = {
  building_id: string
  location_id: string
  dependency_id: string
  category_id: string
  subcategory_id: string
  problem_id: string
  category_b_id: string
  subcategory_b_id: string
  problem_b_id: string
  team_b_id: string
  service_type_id: string
  priority_id: string
  channel_id: string
  requester_id: string
  technician_id: string
  team_id: string
}

async function loadRefsRow(context: TicketHttpContext): Promise<RefsRow> {
  const result = await context.db.execute(sql`
    select
      (select id from public.buildings where name = 'Edificio A1') as building_id,
      (select id from public.locations where name = 'Sala A1') as location_id,
      (select id from public.dependencies where name = 'Dependencia') as dependency_id,
      (select id from public.categories where name = 'Categoría A') as category_id,
      (select id from public.subcategories where name = 'Subcategoría A') as subcategory_id,
      (select id from public.problems where name = 'Problema A') as problem_id,
      (select id from public.categories where name = 'Categoría B') as category_b_id,
      (select id from public.subcategories where name = 'Subcategoría B') as subcategory_b_id,
      (select id from public.problems where name = 'Problema B') as problem_b_id,
      (select id from public.teams where name = 'Equipo B') as team_b_id,
      (select id from public.service_types where name = 'Correctivo') as service_type_id,
      (select id from public.priorities where name = 'Media') as priority_id,
      (select id from public.channels where name = 'Teléfono') as channel_id,
      (select id from public.requesters where full_name = 'Solicitante vinculado') as requester_id,
      (select id from public.technicians where full_name = 'Técnico A') as technician_id,
      (select id from public.teams where name = 'Equipo A') as team_id
  `)
  const row = result.rows[0] as RefsRow | undefined
  if (!row) throw new Error('Write refs could not be loaded')
  return row
}

export async function loadWriteRefs(
  context: TicketHttpContext,
): Promise<WriteRefs> {
  const row = await loadRefsRow(context)
  const pause = await ensurePauseFlow(context)
  return {
    buildingId: row.building_id,
    locationId: row.location_id,
    dependencyId: row.dependency_id,
    categoryId: row.category_id,
    subcategoryId: row.subcategory_id,
    problemId: row.problem_id,
    categoryIdB: row.category_b_id,
    subcategoryIdB: row.subcategory_b_id,
    problemIdB: row.problem_b_id,
    teamIdB: row.team_b_id,
    serviceTypeId: row.service_type_id,
    priorityId: row.priority_id,
    channelId: row.channel_id,
    requesterId: row.requester_id,
    technicianId: row.technician_id,
    teamId: row.team_id,
    pauseReasonId: pause.rootId,
    pauseStepId: pause.stepId,
    pauseExitId: pause.exitId,
  }
}

/** Flujo mínimo y estable para las pruebas de pausa: raíz → paso → salida. */
async function ensurePauseFlow(context: TicketHttpContext): Promise<{
  rootId: string
  stepId: string
  exitId: string
}> {
  const root = await context.db.execute(sql`
    select id from public.reasons
    where use = 'pause' and parent_id is null and name = 'Falta de material'
  `)
  const rootId = (root.rows[0] as { id: string }).id
  const step = await context.db.execute(sql`
    insert into public.reasons (use, name, parent_id)
    values ('pause', 'Paso de prueba', ${rootId})
    on conflict (use, parent_id, name) do update set name = excluded.name
    returning id
  `)
  const stepId = (step.rows[0] as { id: string }).id
  const exit = await context.db.execute(sql`
    insert into public.reasons (use, name, parent_id, pause_step_kind)
    values ('pause', 'Salida de prueba', ${rootId}, 'exit')
    on conflict (use, parent_id, name) do update set name = excluded.name
    returning id
  `)
  const exitId = (exit.rows[0] as { id: string }).id
  await context.db.execute(sql`
    insert into public.pause_transitions (from_reason_id, to_reason_id)
    values (${rootId}, ${stepId}), (${stepId}, ${exitId})
    on conflict (from_reason_id, to_reason_id) do nothing
  `)
  return { rootId, stepId, exitId }
}

/** Crea una ubicación y una dependencia alternas para probar el ámbito. */
export async function addDuplicateScopeRefs(
  context: TicketHttpContext,
  refs: WriteRefs,
): Promise<{ locationId: string; dependencyId: string }> {
  const location = await context.db.execute(sql`
    insert into public.locations (building_id, name)
    values (${refs.buildingId}, 'Sala A1 bis') returning id
  `)
  const dependency = await context.db.execute(sql`
    insert into public.dependencies (name)
    values ('Dependencia bis') returning id
  `)
  const locationId = (location.rows[0] as { id: string }).id
  const dependencyId = (dependency.rows[0] as { id: string }).id
  await context.db.execute(sql`
    insert into public.dependency_locations (dependency_id, location_id)
    values
      (${refs.dependencyId}, ${locationId}),
      (${dependencyId}, ${refs.locationId})
  `)
  return { locationId, dependencyId }
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

export async function takeTicket(
  context: TicketHttpContext,
  ticketId: string,
): Promise<void> {
  const response = await context.app.inject({
    method: 'POST',
    url: `/api/tickets/${ticketId}/actions`,
    headers: headers(context.cookies.supervisor),
    payload: { action: 'take', clientRequestId: randomUUID() },
  })
  if (response.statusCode !== 200) {
    throw new Error(`Take failed: ${response.statusCode}`)
  }
}
