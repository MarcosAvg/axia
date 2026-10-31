import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { loadActor, type Actor } from '../../src/auth/authorization.js'
import {
  byTechnician,
  duplicateAlerts,
  duplicateTickets,
  duplicatesByDimension,
  pausesByReason,
  rejectCancel,
  routing,
  satisfaction,
  sla,
  slaByPriority,
} from '../../src/metrics/service.js'
import {
  pauseSubstates,
  supervisors,
  technicianTimes,
} from '../../src/metrics/people.js'
import { seedMetrics } from './metrics-fixture.js'
import {
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'

let context: TicketHttpContext
let actor: Actor
let teamA: string
let teamB: string

beforeAll(async () => {
  context = await buildTicketHttpApp()
  await seedMetrics(context)
  await context.db.execute(sql`
    update public.tickets set closed_at = reported_at + interval '2 hours'
  `)
  await context.db.execute(sql`
    update public.ticket_participants set ended_at = started_at + interval '90 minutes'
  `)
  const users = await context.db.execute(sql`
    select id from public.users where username = 'supervisor-access'
  `)
  const loaded = await loadActor(context.db, String(users.rows[0]?.id))
  if (!loaded) throw new Error('Missing supervisor')
  actor = loaded
  const teams = await context.db.execute(sql`select id, name from public.teams`)
  teamA = String(teams.rows.find((row) => row.name === 'Equipo A')?.id)
  teamB = String(teams.rows.find((row) => row.name === 'Equipo B')?.id)
}, 60_000)

afterAll(async () => closeTicketHttpApp(context))

function withScope(scope: string): Actor {
  return { ...actor, permissions: [{ id: 'metrics.view', scope }] }
}

async function teamCounts(scopedActor: Actor, teamId?: string) {
  return (await duplicatesByDimension(context.db, scopedActor, { teamId }))
    .filter((row) => row.dimension === 'team')
    .map((row) => ({ id: row.dimension_id, tickets: row.tickets }))
}

describe('alcance único de métricas', () => {
  it('intersecta el filtro A con equipos A+B sin repetir concesiones', async () => {
    const scopedActor = { ...withScope('team'), teamIds: [teamA, teamB, teamA] }
    expect(await teamCounts(scopedActor, teamA)).toEqual([
      { id: teamA, tickets: 3 },
    ])
  })

  it('no convierte un ámbito sin edificios en acceso al equipo completo', async () => {
    const outsider = await context.db.execute(sql`
      select id from public.users where username = 'other-supervisor'
    `)
    const loaded = await loadActor(context.db, String(outsider.rows[0]?.id))
    if (!loaded) throw new Error('Missing supervisor without buildings')
    expect(await teamCounts(loaded)).toEqual([])
  })

  it('devuelve vacío para un filtro fuera del equipo autorizado', async () => {
    expect(
      await teamCounts({ ...withScope('team'), teamIds: [teamA] }, teamB),
    ).toEqual([])
  })

  it('intersecta el edificio solicitado con el ámbito del supervisor', async () => {
    const result = await context.db.execute(sql`
      select building_id from public.tickets where id = ${context.ids.ticketA2}
    `)
    const buildingId = String(result.rows[0]?.building_id)
    expect(
      await duplicatesByDimension(context.db, actor, { buildingId }),
    ).toEqual([])
  })

  it('usa metrics.view aunque ticket.view conceda otro alcance', async () => {
    const scopedActor = {
      ...withScope('all'),
      permissions: [
        { id: 'metrics.view', scope: 'all' },
        { id: 'ticket.view', scope: 'own' },
      ],
    }
    const rows = await technicianTimes(context.db, scopedActor, {})
    expect(rows).toHaveLength(1)
    expect(Number(rows[0]?.tickets)).toBe(1)
  })

  it('conserva acceso positivo por edificio y niega métricas sin permiso', async () => {
    expect(await teamCounts(actor)).toEqual([{ id: teamA, tickets: 2 }])
    expect(await teamCounts({ ...actor, permissions: [] })).toEqual([])
  })

  it('conserva el resultado de administrador y los ceros del conjunto vacío', async () => {
    expect(await teamCounts(withScope('all'))).toEqual(
      expect.arrayContaining([
        { id: teamA, tickets: 3 },
        { id: teamB, tickets: 1 },
      ]),
    )
    expect(
      await routing(context.db, { ...actor, permissions: [] }, {}),
    ).toEqual([
      { offers: 0, pending_offers: 0, taken: 0, avg_time_to_take: '00:00:00' },
    ])
  })
})

it.each([
  ['pauses', pausesByReason],
  ['duplicate-tickets', duplicateTickets],
  ['duplicate-alerts', duplicateAlerts],
  ['dimensions', duplicatesByDimension],
  ['satisfaction', satisfaction],
  ['sla', sla],
  ['sla-by-priority', slaByPriority],
  ['by-technician', byTechnician],
  ['reject-cancel', rejectCancel],
  ['routing', routing],
  ['technician-times', technicianTimes],
  ['supervisors', supervisors],
  ['pause-substates', pauseSubstates],
] as const)(
  '%s agrega una sola vez el conjunto filtrado por su permiso',
  async (_, load) => {
    const admin = withScope('all')
    const scopedActor = {
      ...withScope('team'),
      teamIds: [teamA, teamB, teamA],
      permissions: [
        { id: 'metrics.view', scope: 'team' },
        { id: 'ticket.view', scope: 'own' },
      ],
    }
    const expected = await load(context.db, admin, { teamId: teamA })
    expect(await load(context.db, scopedActor, { teamId: teamA })).toEqual(
      expected,
    )
    expect(
      await load(context.db, withScope('team'), { teamId: teamB }),
    ).toEqual(await load(context.db, { ...actor, permissions: [] }, {}))
  },
)
