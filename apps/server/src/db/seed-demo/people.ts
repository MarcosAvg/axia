import type { Client } from 'pg'

import type { DemoCatalogs } from './catalogs.js'
import {
  ID,
  REQUESTERS,
  TECHNICIANS,
  USERS,
  type RequesterKey,
  type TechnicianKey,
  type UserSpec,
} from './data.js'

type IdRow = { id: string }

async function one(
  client: Client,
  sql: string,
  params: unknown[] = [],
): Promise<string> {
  const result = await client.query<IdRow>(sql, params)
  const row = result.rows[0]
  if (!row) throw new Error('The demo seed expected one row')
  return row.id
}

async function ensureUser(
  client: Client,
  spec: UserSpec,
  passwordHash: string,
  resetPasswords: boolean,
) {
  const inserted = await client.query<IdRow>(
    `insert into public.users (
       id, username, full_name, password_hash, must_change_password,
       password_changed_at, active
     ) values ($1, $2, $3, $4, false, now(), true)
     on conflict (username) do nothing
     returning id`,
    [spec.id, spec.username, spec.fullName, passwordHash],
  )
  const id =
    inserted.rows[0]?.id ??
    (await one(client, 'select id from public.users where username = $1', [
      spec.username,
    ]))
  if (resetPasswords) {
    await client.query(
      `update public.users
       set password_hash = $2, must_change_password = false,
           password_changed_at = now(), active = true
       where id = $1`,
      [id, passwordHash],
    )
  }
  await client.query(
    `insert into public.user_roles (user_id, role_id)
     select $1, id from public.roles where name = $2
     on conflict do nothing`,
    [id, spec.role],
  )
  return { id, created: inserted.rowCount === 1 }
}

async function ensureTechnician(
  client: Client,
  spec: { id: string; fullName: string; teamId: string; userId?: string },
) {
  if (spec.userId) {
    return one(
      client,
      `insert into public.technicians (id, full_name, team_id, user_id)
       values ($1, $2, $3, $4)
       on conflict (user_id) do update
         set full_name = excluded.full_name, team_id = excluded.team_id
       returning id`,
      [spec.id, spec.fullName, spec.teamId, spec.userId],
    )
  }
  return one(
    client,
    `insert into public.technicians (id, full_name, team_id)
     values ($1, $2, $3)
     on conflict (id) do update set full_name = excluded.full_name
     returning id`,
    [spec.id, spec.fullName, spec.teamId],
  )
}

async function ensureRequester(
  client: Client,
  spec: {
    id: string
    fullName: string
    contact: string
    dependencyId: string
    userId?: string
  },
) {
  if (spec.userId) {
    return one(
      client,
      `insert into public.requesters (
         id, full_name, contact, dependency_id, user_id
       ) values ($1, $2, $3, $4, $5)
       on conflict (user_id) do update
         set full_name = excluded.full_name,
             contact = excluded.contact,
             dependency_id = excluded.dependency_id
       returning id`,
      [spec.id, spec.fullName, spec.contact, spec.dependencyId, spec.userId],
    )
  }
  return one(
    client,
    `insert into public.requesters (
       id, full_name, contact, dependency_id
     ) values ($1, $2, $3, $4)
     on conflict (id) do update
       set full_name = excluded.full_name,
           contact = excluded.contact,
           dependency_id = excluded.dependency_id
     returning id`,
    [spec.id, spec.fullName, spec.contact, spec.dependencyId],
  )
}

async function ensureUsers(
  client: Client,
  passwordHash: string,
  resetPasswords: boolean,
) {
  const users = new Map<string, { id: string; created: boolean }>()
  for (const spec of USERS) {
    users.set(
      spec.username,
      await ensureUser(client, spec, passwordHash, resetPasswords),
    )
  }
  return users
}

async function ensureTechnicians(
  client: Client,
  catalogs: DemoCatalogs,
  technicianUserId: string,
) {
  const ids = {} as Record<TechnicianKey, string>
  for (const spec of TECHNICIANS) {
    const technicianId = await ensureTechnician(client, {
      id: spec.id,
      fullName: spec.fullName,
      teamId:
        spec.team === 'maintenance' ? catalogs.maintenance : catalogs.security,
      ...(spec.key === 'lead' ? { userId: technicianUserId } : {}),
    })
    ids[spec.key] = technicianId
    for (const category of spec.categories) {
      await client.query(
        `insert into public.technician_categories (technician_id, category_id)
         values ($1, $2) on conflict do nothing`,
        [technicianId, catalogs[category]],
      )
    }
  }
  return ids
}

async function ensureRequesters(
  client: Client,
  catalogs: DemoCatalogs,
  requesterUserId: string,
) {
  const ids = {} as Record<RequesterKey, string>
  for (const spec of REQUESTERS) {
    ids[spec.key] = await ensureRequester(client, {
      id: spec.id,
      fullName: spec.fullName,
      contact: spec.contact,
      dependencyId:
        spec.dependency === 'Sistemas' ? catalogs.systems : catalogs.hr,
      ...(spec.key === 'ana' ? { userId: requesterUserId } : {}),
    })
  }
  return ids
}

async function ensureScopes(
  client: Client,
  catalogs: DemoCatalogs,
  supervisorId: string,
) {
  for (const [scopeId, teamId] of [
    [ID.scopeMaintenance, catalogs.maintenance],
    [ID.scopeSecurity, catalogs.security],
  ] as const) {
    await client.query(
      `insert into public.supervisor_scopes (id, user_id, team_id)
       values ($1, $2, $3)
       on conflict (user_id, team_id) do update set active = true
       returning id`,
      [scopeId, supervisorId, teamId],
    )
    for (const buildingId of [catalogs.central, catalogs.north]) {
      await client.query(
        `insert into public.supervisor_scope_buildings (scope_id, building_id)
         values ($1, $2) on conflict do nothing`,
        [scopeId, buildingId],
      )
    }
  }
}

export type DemoPeople = {
  users: Map<string, { id: string; created: boolean }>
  supervisorId: string
  technicianUserId: string
  requesterUserId: string
  technicians: Record<TechnicianKey, string>
  requesters: Record<RequesterKey, string>
}

export async function buildDemoPeople(
  client: Client,
  catalogs: DemoCatalogs,
  passwordHash: string,
  resetPasswords: boolean,
): Promise<DemoPeople> {
  const users = await ensureUsers(client, passwordHash, resetPasswords)
  const supervisorId = users.get('demo.supervisor')?.id
  const technicianUserId = users.get('demo.technician')?.id
  const requesterUserId = users.get('demo.requester')?.id
  if (!supervisorId || !technicianUserId || !requesterUserId) {
    throw new Error('Demo users could not be resolved')
  }
  return {
    users,
    supervisorId,
    technicianUserId,
    requesterUserId,
    technicians: await ensureTechnicians(client, catalogs, technicianUserId),
    requesters: await ensureRequesters(client, catalogs, requesterUserId),
  }
}

export async function buildDemoScopes(
  client: Client,
  catalogs: DemoCatalogs,
  supervisorId: string,
) {
  await ensureScopes(client, catalogs, supervisorId)
}
