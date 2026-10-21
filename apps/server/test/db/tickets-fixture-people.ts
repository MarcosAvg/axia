import { sql } from 'drizzle-orm'

import type { Database } from '../../src/db/client.js'
import { insertOne, type Catalog } from './tickets-fixture-catalog.js'

async function createUser(
  db: Database,
  username: string,
  roleName: string,
  active = true,
): Promise<string> {
  const role = await db.execute(sql`
    select id from public.roles where name = ${roleName} limit 1
  `)
  const roleId = (role.rows[0] as { id: string } | undefined)?.id
  if (!roleId) throw new Error(`Missing role ${roleName}`)
  const user = await insertOne(
    db,
    sql`insert into public.users (
      username, full_name, password_hash, must_change_password, active
    ) values (${username}, ${username}, 'x', false, ${active})
    returning id`,
  )
  await db.execute(sql`
    insert into public.user_roles (user_id, role_id) values (${user.id}, ${roleId})
  `)
  return user.id
}

export type People = Awaited<ReturnType<typeof createPeople>>

async function createUsers(db: Database) {
  const adminId = await createUser(db, 'admin-access', 'administrator')
  const requesterUserId = await createUser(db, 'requester-access', 'requester')
  const technicianUserId = await createUser(
    db,
    'technician-access',
    'technician',
  )
  const otherTechnicianId = await createUser(
    db,
    'other-technician-access',
    'technician',
  )
  const supervisorUserId = await createUser(
    db,
    'supervisor-access',
    'supervisor',
  )
  const outsiderId = await createUser(db, 'outsider-access', 'requester')
  const inactiveId = await createUser(db, 'inactive-access', 'requester', false)
  return {
    adminId,
    requesterUserId,
    technicianUserId,
    otherTechnicianId,
    supervisorUserId,
    outsiderId,
    inactiveId,
  }
}

export async function createPeople(db: Database, catalog: Catalog) {
  const users = await createUsers(db)
  const requesterRow = await insertOne(
    db,
    sql`insert into public.requesters (full_name, user_id)
        values ('Solicitante vinculado', ${users.requesterUserId}) returning id`,
  )
  const otherRequester = await insertOne(
    db,
    sql`insert into public.requesters (full_name)
        values ('Solicitante sin cuenta') returning id`,
  )
  const technicianRow = await insertOne(
    db,
    sql`insert into public.technicians (full_name, user_id, team_id)
        values ('Técnico A', ${users.technicianUserId}, ${catalog.teamA.id}) returning id`,
  )
  await insertOne(
    db,
    sql`insert into public.technicians (full_name, user_id, team_id)
        values ('Técnico B', ${users.otherTechnicianId}, ${catalog.teamB.id}) returning id`,
  )
  const scope = await insertOne(
    db,
    sql`insert into public.supervisor_scopes (user_id, team_id)
        values (${users.supervisorUserId}, ${catalog.teamA.id}) returning id`,
  )
  await db.execute(sql`
    insert into public.supervisor_scope_buildings (scope_id, building_id)
    values (${scope.id}, ${catalog.buildingA1.id})
  `)

  return {
    ...users,
    requesterRow,
    otherRequester,
    technicianRow,
  }
}
