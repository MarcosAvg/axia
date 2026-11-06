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

type Row = Record<string, unknown>

async function list(table: string, query = ''): Promise<Row[]> {
  const response = await context.app.inject({
    method: 'GET',
    url: `/api/admin/catalogs/${table}${query}`,
    headers: authHeaders(context.cookies.admin),
  })
  expect(response.statusCode).toBe(200)
  return (response.json() as { items: Row[] }).items
}

async function createReason(name: string, parentId?: string): Promise<string> {
  const response = await context.app.inject({
    method: 'POST',
    url: '/api/admin/catalogs/reasons',
    headers: authHeaders(context.cookies.admin),
    payload: {
      use: 'pause',
      name,
      clock_class: 'counted',
      active: true,
      ...(parentId ? { parent_id: parentId } : {}),
    },
  })
  expect(response.statusCode).toBe(201)
  return (response.json() as { id: string }).id
}

async function insertDependency(
  name: string,
  locationIds: string[],
): Promise<string> {
  const result = await context.db.execute(sql`
    insert into public.dependencies (name) values (${name}) returning id
  `)
  const id = (result.rows[0] as { id: string }).id
  for (const locationId of locationIds) {
    await context.db.execute(sql`
      insert into public.dependency_locations (dependency_id, location_id)
      values (${id}, ${locationId})
    `)
  }
  return id
}

function postProblem(payload: Record<string, unknown>) {
  return context.app.inject({
    method: 'POST',
    url: '/api/admin/catalogs/problems',
    headers: authHeaders(context.cookies.admin),
    payload: {
      subcategory_id: refs.subcategoryId,
      team_id: refs.teamId,
      name: `Problema ${Math.random().toString(36).slice(2)}`,
      active: true,
      ...payload,
    },
  })
}

beforeAll(async () => {
  context = await buildTicketHttpApp()
  refs = await loadWriteRefs(context)
}, 60_000)

afterAll(async () => {
  await closeTicketHttpApp(context)
})

describe('lectura de catálogos con datos derivados', () => {
  it('muestra la cuenta vinculada de solicitantes y el nulo de quienes no la tienen', async () => {
    const rows = await list('requesters')
    const linked = rows.find((row) => row.full_name === 'Solicitante vinculado')
    const withoutAccount = rows.find(
      (row) => row.full_name === 'Solicitante sin cuenta',
    )
    expect(linked).toMatchObject({ user_label: 'requester-access' })
    expect(withoutAccount?.user_label).toBeNull()
  })

  it('cuenta las designaciones de un técnico', async () => {
    await context.db.execute(sql`
      insert into public.technician_categories (technician_id, category_id)
      values (${refs.technicianId}, ${refs.categoryId})
      on conflict do nothing
    `)
    const rows = await list('technicians')
    const technician = rows.find((row) => row.full_name === 'Técnico A')
    expect(technician).toMatchObject({
      user_label: 'technician-access',
      categories_count: 1,
      category_names: 'Categoría A',
    })
  })

  it('cuenta ubicaciones y edificios de una dependencia', async () => {
    const otherLocation = await context.db.execute(sql`
      select id from public.locations where name = 'Sala B1'
    `)
    const locationB = (otherLocation.rows[0] as { id: string }).id
    const dependencyId = await insertDependency('Dependencia con dos sedes', [
      refs.locationId,
      locationB,
    ])
    const rows = await list('dependencies')
    const dependency = rows.find((row) => row.id === dependencyId)
    expect(dependency).toMatchObject({ locations_count: 2, buildings_count: 2 })
    expect(String(dependency?.building_names)).toContain('Edificio A1')
    expect(String(dependency?.building_names)).toContain('Edificio B1')
  })
})

describe('datos derivados de motivos y clasificación', () => {
  it('calcula la ruta y la profundidad de los motivos jerárquicos', async () => {
    const root = await createReason('Raíz de ruta derivada')
    const child = await createReason('Hija de ruta derivada', root)
    const rows = await list('reasons')
    expect(rows.find((row) => row.id === child)).toMatchObject({
      path: 'Raíz de ruta derivada › Hija de ruta derivada',
      depth: 2,
      children_count: 0,
    })
    expect(Number(rows.find((row) => row.id === root)?.children_count)).toBe(1)
  })

  it('expone la categoría de cada problema', async () => {
    const rows = await list('problems')
    expect(rows.find((row) => row.name === 'Problema A')).toMatchObject({
      category_id: refs.categoryId,
      category_name: 'Categoría A',
    })
  })
})

describe('orden natural del admin', () => {
  it('ordena las ubicaciones por el número dentro del nombre', async () => {
    const building = await context.db.execute(sql`
      insert into public.buildings (name)
      values ('Edificio admin orden natural') returning id
    `)
    const buildingId = (building.rows[0] as { id: string }).id
    for (const name of ['Piso 10', 'Piso 2', 'Piso 1']) {
      await context.db.execute(sql`
        insert into public.locations (building_id, name)
        values (${buildingId}, ${name})
      `)
    }
    const expected = ['Piso 1', 'Piso 2', 'Piso 10']
    const names = (rows: Row[]) =>
      rows
        .filter((row) => row.building_id === buildingId)
        .map((row) => String(row.name))

    expect(names(await list('locations'))).toEqual(expected)
    expect(names(await list('locations', '?orderBy=name'))).toEqual(expected)
  })
})

describe('orden y permisos de lectura', () => {
  it('ordena por columnas derivadas y rechaza columnas desconocidas', async () => {
    expect(await list('problems', '?orderBy=category_name')).not.toHaveLength(0)
    expect(await list('reasons', '?orderBy=path')).not.toHaveLength(0)
    const invalid = await context.app.inject({
      method: 'GET',
      url: '/api/admin/catalogs/reasons?orderBy=nope',
      headers: authHeaders(context.cookies.admin),
    })
    expect(invalid.statusCode).toBe(400)
  })

  it('exige catalog.manage para leer catálogos', async () => {
    const response = await context.app.inject({
      method: 'GET',
      url: '/api/admin/catalogs/teams',
      headers: authHeaders(context.cookies.requester),
    })
    expect(response.statusCode).toBe(403)
  })
})

describe('adjuntos en el catálogo de problemas', () => {
  it('guarda los tipos y la instrucción del problema', async () => {
    const response = await postProblem({
      name: 'Problema con cotización',
      attachment_required_types: ['application/pdf'],
      attachment_instructions: 'Adjunta la cotización',
    })
    expect(response.statusCode).toBe(201)
    const id = (response.json() as { id: string }).id
    const rows = await list('problems')
    expect(rows.find((row) => row.id === id)).toMatchObject({
      attachment_required_types: ['application/pdf'],
      attachment_instructions: 'Adjunta la cotización',
    })
  })

  it('rechaza tipos desconocidos y duplicados', async () => {
    const unknown = await postProblem({
      attachment_required_types: ['text/html'],
    })
    expect(unknown.statusCode).toBe(400)
    const duplicate = await postProblem({
      attachment_required_types: ['application/pdf', 'application/pdf'],
    })
    expect(duplicate.statusCode).toBe(400)
  })
})
