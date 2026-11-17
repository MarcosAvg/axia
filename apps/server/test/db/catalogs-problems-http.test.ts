import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  authHeaders,
  buildTicketHttpApp,
  closeTicketHttpApp,
  type TicketHttpContext,
} from './tickets-http-helpers.js'

let context: TicketHttpContext
type ItemsBody = { items: Array<{ id: string }> }

beforeAll(async () => {
  context = await buildTicketHttpApp()
}, 60_000)
afterAll(async () => closeTicketHttpApp(context))

function get(cookie?: string, query = '') {
  return context.app.inject({
    method: 'GET',
    url: `/api/catalogs/problems${query}`,
    headers: authHeaders(cookie),
  })
}

describe('catálogo global de problemas', () => {
  it('incluye problemas de distintas categorías y su clasificación completa', async () => {
    const response = await get(context.cookies.requester)
    expect(response.statusCode).toBe(200)
    expect(response.json().items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: context.catalog.problemA.id,
          categoryId: context.catalog.categoryA.id,
          categoryName: 'Categoría A',
          subcategoryName: 'Subcategoría A',
          subcategoryId: context.catalog.subcategoryA.id,
          requiredAttachmentTypes: [],
          attachmentInstructions: null,
        }),
        expect.objectContaining({ id: context.catalog.problemB.id }),
      ]),
    )
  })

  it('conserva el filtro por subcategoría', async () => {
    const response = await get(
      context.cookies.requester,
      `?subcategoryId=${context.catalog.subcategoryA.id}`,
    )
    expect(response.statusCode).toBe(200)
    expect((response.json() as ItemsBody).items.map(({ id }) => id)).toEqual([
      context.catalog.problemA.id,
    ])
  })

  it.each(['problems', 'subcategories', 'categories'] as const)(
    'excluye problemas con %s inactivos',
    async (table) => {
      const ids = {
        problems: context.catalog.problemA.id,
        subcategories: context.catalog.subcategoryA.id,
        categories: context.catalog.categoryA.id,
      }
      await context.db.execute(sql`
        update ${sql.raw(`public.${table}`)} set active = false where id = ${ids[table]}
      `)
      try {
        const response = await get(context.cookies.requester)
        expect(response.statusCode).toBe(200)
        expect(
          (response.json() as ItemsBody).items.map(({ id }) => id),
        ).toEqual([context.catalog.problemB.id])
      } finally {
        await context.db.execute(sql`
          update ${sql.raw(`public.${table}`)} set active = true where id = ${ids[table]}
        `)
      }
    },
  )

  it('rechaza la lectura sin permiso', async () => {
    expect((await get(context.cookies.noAccess)).statusCode).toBe(403)
  })

  it('rechaza la lectura sin sesión', async () => {
    expect((await get()).statusCode).toBe(401)
  })
})
