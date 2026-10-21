import { sql, type SQL } from 'drizzle-orm'

import type { Actor } from '../auth/authorization.js'
import { getPermissionScope, ownKind } from './access.js'

function requesterPredicate(actor: Actor): SQL {
  return sql`r.user_id = ${actor.id}`
}

function technicianPredicate(actor: Actor): SQL {
  return sql`exists (
    select 1
    from public.ticket_assignments a
    join public.technicians te on te.id = a.assignee_technician_id
    where a.ticket_id = t.id
      and a.ended_at is null
      and te.user_id = ${actor.id}
  )`
}

function participantPredicate(actor: Actor): SQL {
  return sql`exists (
    select 1
    from public.ticket_participants p
    join public.technicians te on te.id = p.technician_id
    where p.ticket_id = t.id
      and p.ended_at is null
      and te.user_id = ${actor.id}
  )`
}

function supervisorPredicate(actor: Actor): SQL {
  return sql`exists (
    select 1
    from public.ticket_assignments a
    where a.ticket_id = t.id
      and a.ended_at is null
      and a.assignee_user_id = ${actor.id}
  )`
}

function orFragments(fragments: SQL[]): SQL {
  return sql`(${sql.join(fragments, sql` or `)})`
}

function ownPredicate(actor: Actor, permission: string): SQL {
  const kind = ownKind(permission)
  const requester = requesterPredicate(actor)
  const technician = technicianPredicate(actor)
  const participant = participantPredicate(actor)

  if (kind === 'view') {
    return orFragments([
      requester,
      technician,
      participant,
      supervisorPredicate(actor),
    ])
  }

  if (kind === 'requester') return requester
  if (kind === 'technician') {
    return orFragments([technician, participant])
  }

  if (kind === 'flow') {
    const fragments = [requester, technician, participant]
    if (permission === 'ticket.mark_duplicate') {
      fragments.push(supervisorPredicate(actor))
    }
    return orFragments(fragments)
  }

  return sql`false`
}

/**
 * Condición SQL de alcance para consultas sobre `public.tickets t` con
 * `public.requesters r` unido. Es la única fuente para lista, detalle y
 * timeline.
 */
export function scopePredicate(actor: Actor, permission: string): SQL {
  const scope = getPermissionScope(actor, permission)
  if (!scope) return sql`false`
  if (scope === 'all') return sql`true`

  if (scope === 'team') {
    if (actor.teamIds.length === 0) return sql`false`
    const ids = actor.teamIds.map((id) => sql`${id}::uuid`)
    return sql`t.team_id in (${sql.join(ids, sql`, `)})`
  }

  if (scope === 'buildings') {
    return sql`exists (
      select 1
      from public.supervisor_scopes ss
      join public.supervisor_scope_buildings ssb on ssb.scope_id = ss.id
      where ss.user_id = ${actor.id}
        and ss.active
        and ss.team_id = t.team_id
        and ssb.building_id = t.building_id
    )`
  }

  return ownPredicate(actor, permission)
}
