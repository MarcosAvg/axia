import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'
import { signIn } from './fixtures.js'

test.setTimeout(180_000)

const AUTHENTICATED_ROUTES = [
  '/',
  '/tickets',
  '/inbox',
  '/metricas',
  '/admin',
  '/admin/catalogos',
  '/admin/usuarios',
  '/admin/roles',
  '/admin/ambitos',
  '/admin/calendarios',
  '/admin/configuracion',
  '/perfil',
  '/tickets/nuevo',
]

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    `(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)()`,
  )
  expect(Number(overflow)).toBeLessThanOrEqual(1)
}

async function expectFullRow(control: Locator) {
  await expect(control).toBeVisible()
  const margins = await control.evaluate((element) => {
    const area = element.closest('main')!
    const padding = area.ownerDocument.defaultView!.getComputedStyle(area)
    const { left, right } = area.getBoundingClientRect()
    const rect = element.getBoundingClientRect()
    return [
      rect.left - left - Number.parseFloat(padding.paddingLeft),
      right - rect.right - Number.parseFloat(padding.paddingRight),
    ]
  })
  for (const margin of margins) expect(Math.abs(margin)).toBeLessThanOrEqual(1)
}

test('el acceso no desborda en móvil ni tiene un h1 oculto', async ({
  page,
}) => {
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/login')
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expectNoHorizontalOverflow(page)
  }
})

// Matriz reducida: móvil pequeño, móvil estándar y escritorio. Los anchos
// intermedios no añadían cobertura funcional y duplicaban el coste.
for (const width of [320, 390, 1440]) {
  test(`las rutas autenticadas no desbordan a ${width} px`, async ({
    page,
  }) => {
    // La matriz no depende de eventos en vivo. Cortar el SSE evita acumular
    // conexiones por cada navegación y el límite del proxy de desarrollo.
    await page.route('**/api/events', (route) => route.abort())
    await page.setViewportSize({ width, height: 1000 })
    await signIn(page, 'demo.admin')

    for (const route of AUTHENTICATED_ROUTES) {
      await page.goto(route)
      await expect(page.locator('h1').first(), route).toBeVisible()
      await expectNoHorizontalOverflow(page)
    }
  })
}

test('mi trabajo de técnico no desborda en móvil', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await signIn(page, 'demo.technician')
  await page.goto('/mi-trabajo')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expectNoHorizontalOverflow(page)
})

test('la barra superior tiene controles táctiles y no desborda', async ({
  page,
}) => {
  await signIn(page, 'demo.admin')

  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')

    const topbar = page.locator('header.sticky')
    const controls = topbar.locator('button:visible, a[href]:visible')
    await expect(controls).toHaveCount(3)
    await expect(topbar.getByRole('link', { name: /^Avisos/ })).toBeVisible()

    for (const control of await controls.all()) {
      const box = await control.boundingBox()
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
    }

    await expectNoHorizontalOverflow(page)

    await page.getByRole('button', { name: 'Más', exact: true }).click()
    await expect(
      page.getByRole('button', { name: 'Cambiar tema y modo' }),
    ).toBeVisible()
    await page.keyboard.press('Escape')
  }
})

test('la búsqueda global muestra un estado vacío', async ({ page }) => {
  await signIn(page, 'demo.admin')
  await page.getByRole('button', { name: 'Abrir búsqueda' }).click()
  await page.getByRole('textbox').fill('termino-que-no-existe')
  await expect(page.getByText('Sin resultados', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar' }).click()
})

test('el título de la pestaña cambia por ruta', async ({ page }) => {
  await signIn(page, 'demo.admin')
  await expect(page).toHaveTitle('Panel · Axia')

  await page.goto('/metricas')
  await expect(page.getByRole('heading', { name: 'Métricas' })).toBeVisible()
  await expect(page).toHaveTitle('Métricas · Axia')
})

test('las acciones principales aprovechan el ancho en móvil', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await signIn(page, 'demo.technician')
  const main = page.getByRole('main')

  await expectFullRow(
    main.getByRole('link', { name: 'Mi trabajo', exact: true }),
  )
  await expectFullRow(
    main.getByRole('link', { name: 'Ver tiquets', exact: true }),
  )
  await page.goto('/mi-trabajo')
  const views = main.getByRole('navigation', { name: 'Vista de tiquets' })
  await expectFullRow(views)
  await expect
    .poll(
      async () =>
        (await views.getByRole('link', { name: 'Ver tablero' }).boundingBox())
          ?.height ?? 0,
    )
    .toBeGreaterThanOrEqual(44)
})

test('la barra de usuarios ocupa el ancho disponible en móvil', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await signIn(page, 'demo.admin')
  await page.goto('/admin/usuarios')
  await expectFullRow(page.getByRole('button', { name: 'Nuevo usuario' }))
})

test('el selector de secciones de métricas usa todo el ancho del tablero', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 })
  await signIn(page, 'demo.admin')
  await page.goto('/metricas')
  await expectFullRow(page.getByRole('tablist'))
  const exportButton = page.getByRole('button', {
    name: 'Exportar',
    exact: true,
  })
  expect((await exportButton.boundingBox())?.width).toBeGreaterThanOrEqual(250)
  const filters = page.getByRole('button', { name: /^Filtros/ })
  await filters.click()
  await page.getByLabel('Edificio', { exact: true }).selectOption({
    label: 'Edificio Central',
  })
  await page.keyboard.press('Escape')
  await expect(filters).toHaveText(/Filtros\s*1/)
  expect(
    await filters.evaluate(
      (element) => element.scrollWidth - element.clientWidth,
    ),
  ).toBeLessThanOrEqual(1)
})

test('la barra de alta reparte el espacio también en horizontal', async ({
  page,
}) => {
  const width = 844
  await page.setViewportSize({ width, height: 390 })
  await signIn(page, 'demo.requester')
  await page.goto('/tickets/nuevo')

  const submit = page.getByRole('button', { name: 'Registrar tiquet' })
  const cancel = page.getByRole('link', { name: 'Cancelar', exact: true })
  await expect(submit).toBeVisible()
  await expect(cancel).toBeVisible()
  expect((await submit.boundingBox())?.width).toBeGreaterThan(width / 3)
  expect((await cancel.boundingBox())?.width).toBeGreaterThan(width / 3)
})

test('la pestaña Calidad mantiene su contenido dentro de 320 px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 })
  await signIn(page, 'demo.admin')
  await page.goto('/metricas')
  await page.getByRole('tab', { name: 'Calidad', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Calidad por dimensión' }),
  ).toBeVisible()
  await expectNoHorizontalOverflow(page)
})
