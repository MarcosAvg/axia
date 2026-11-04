import { randomUUID } from 'node:crypto'

import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  authHeaders,
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'
import { loadWriteRefs, type WriteRefs } from './tickets-write-helpers.js'

let context: TicketHttpContext
let refs: WriteRefs
let recaptureReason: string

function ticketBody() {
  return {
    buildingId: refs.buildingId,
    locationId: refs.locationId,
    dependencyId: refs.dependencyId,
    categoryId: refs.categoryId,
    subcategoryId: refs.subcategoryId,
    problemId: refs.problemId,
    serviceTypeId: refs.serviceTypeId,
    priorityId: refs.priorityId,
    channelId: refs.channelId,
    description: `Tiquet de recaptura ${randomUUID()}`,
    requesterId: refs.requesterId,
    clientRequestId: randomUUID(),
  }
}

async function action(
  cookie: string,
  ticketId: string,
  payload: Record<string, unknown>,
) {
  return context.app.inject({
    method: 'POST',
    url: `/api/tickets/${ticketId}/actions`,
    headers: authHeaders(cookie),
    payload,
  })
}

async function createTicket() {
  const response = await context.app.inject({
    method: 'POST',
    url: '/api/tickets',
    headers: authHeaders(context.cookies.requester),
    payload: ticketBody(),
  })
  expect(response.statusCode).toBe(201)
  return (response.json() as { ticket: { id: string } }).ticket.id
}

async function takenTicket() {
  const ticketId = await createTicket()
  const take = await action(context.cookies.supervisor, ticketId, {
    action: 'take',
    clientRequestId: randomUUID(),
  })
  expect(take.statusCode).toBe(200)
  return ticketId
}

async function insertDependency(
  name: string,
  locationId: string,
): Promise<string> {
  const inserted = await context.db.execute(sql`
    insert into public.dependencies (name) values (${name}) returning id
  `)
  const dependencyId = (inserted.rows[0] as { id: string }).id
  await context.db.execute(sql`
    insert into public.dependency_locations (dependency_id, location_id)
    values (${dependencyId}, ${locationId})
  `)
  return dependencyId
}

beforeAll(async () => {
  context = await buildTicketHttpApp()
  refs = await loadWriteRefs(context)
  const reason = await context.db.execute(sql`
    insert into public.reasons (use, name)
    values ('recapture', 'Recaptura de prueba') returning id
  `)
  recaptureReason = (reason.rows[0] as { id: string }).id
  await context.db.execute(sql`
    update public.requesters
    set dependency_id = ${refs.dependencyId}
    where id = ${refs.requesterId}
  `)
}, 60_000)

afterAll(async () => {
  await closeTicketHttpApp(context)
})

describe('recapture requester dependency', () => {
  it('rejects a place change outside the requester dependency', async () => {
    const ticketId = await takenTicket()
    const place = await context.db.execute(sql`
      select
        (select id from public.locations where name = 'Sala A2') as location_id,
        (select id from public.buildings where name = 'Edificio A2') as building_id
    `)
    const row = place.rows[0] as { location_id: string; building_id: string }
    const dependencyId = await insertDependency(
      'Dependencia alterna de recaptura',
      row.location_id,
    )

    const response = await action(context.cookies.supervisor, ticketId, {
      action: 'recapture',
      changes: {
        buildingId: row.building_id,
        locationId: row.location_id,
        dependencyId,
        description: 'Lugar fuera de la dependencia del solicitante',
      },
      reasonId: recaptureReason,
      clientRequestId: randomUUID(),
    })
    expect(response.statusCode).toBe(400)
  })

  it('accepts a place change inside the requester dependency', async () => {
    const ticketId = await takenTicket()
    const place = await context.db.execute(sql`
      select
        (select id from public.locations where name = 'Sala A2') as location_id,
        (select id from public.buildings where name = 'Edificio A2') as building_id
    `)
    const row = place.rows[0] as { location_id: string; building_id: string }

    const response = await action(context.cookies.supervisor, ticketId, {
      action: 'recapture',
      changes: {
        buildingId: row.building_id,
        locationId: row.location_id,
        dependencyId: refs.dependencyId,
        description: 'Cambio de lugar dentro de la dependencia',
      },
      reasonId: recaptureReason,
      clientRequestId: randomUUID(),
    })
    expect(response.statusCode).toBe(200)
  })
})

describe('recapture historical captures', () => {
  it('allows text-only recapture when the stored dependency differs', async () => {
    const ticketId = await takenTicket()
    const dependencyId = await insertDependency(
      'Dependencia histórica',
      refs.locationId,
    )
    await context.db.execute(sql`
      update public.tickets
      set dependency_id = ${dependencyId}
      where id = ${ticketId}
    `)

    const response = await action(context.cookies.supervisor, ticketId, {
      action: 'recapture',
      changes: { description: 'Corrección de texto sin mover el lugar' },
      reasonId: recaptureReason,
      clientRequestId: randomUUID(),
    })
    expect(response.statusCode).toBe(200)
  })

  it('allows text-only recapture when the stored pair is no longer linked', async () => {
    const ticketId = await takenTicket()
    await context.db.execute(sql`
      delete from public.dependency_locations
      where dependency_id = ${refs.dependencyId}
        and location_id = ${refs.locationId}
    `)
    try {
      const response = await action(context.cookies.supervisor, ticketId, {
        action: 'recapture',
        changes: {
          buildingId: refs.buildingId,
          locationId: refs.locationId,
          dependencyId: refs.dependencyId,
          description: 'Corrección de texto con el lugar sin cambios',
        },
        reasonId: recaptureReason,
        clientRequestId: randomUUID(),
      })
      expect(response.statusCode).toBe(200)
    } finally {
      await context.db.execute(sql`
        insert into public.dependency_locations (dependency_id, location_id)
        values (${refs.dependencyId}, ${refs.locationId})
        on conflict do nothing
      `)
    }
  })
})

describe('recapture classification', () => {
  it('rejects clearing the problem', async () => {
    const ticketId = await takenTicket()

    const response = await action(context.cookies.supervisor, ticketId, {
      action: 'recapture',
      changes: { subcategoryId: null, problemId: null },
      reasonId: recaptureReason,
      clientRequestId: randomUUID(),
    })
    expect(response.statusCode).toBe(400)
  })
})

describe('recapture catalog integrity', () => {
  it('rejects a location from another building', async () => {
    const ticketId = await takenTicket()
    const other = await context.db.execute(sql`
      select id from public.buildings where name = 'Edificio B1'
    `)
    const buildingB1 = (other.rows[0] as { id: string }).id

    const response = await action(context.cookies.supervisor, ticketId, {
      action: 'recapture',
      changes: {
        buildingId: buildingB1,
        locationId: refs.locationId,
        description: 'Ubicación cruzada',
      },
      reasonId: recaptureReason,
      clientRequestId: randomUUID(),
    })
    expect(response.statusCode).toBe(400)
  })

  it('rejects a subcategory from another category', async () => {
    const ticketId = await takenTicket()

    const response = await action(context.cookies.supervisor, ticketId, {
      action: 'recapture',
      changes: {
        subcategoryId: refs.subcategoryIdB,
        description: 'Subcategoría cruzada',
      },
      reasonId: recaptureReason,
      clientRequestId: randomUUID(),
    })
    expect(response.statusCode).toBe(400)
  })
})
