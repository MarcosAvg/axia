import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

test.setTimeout(180_000)

const DEMO_PASSWORD = process.env.AXIA_DEMO_PASSWORD ?? 'E2ePassword123!'

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

async function signIn(page: Page, username = 'demo.admin') {
  await page.goto('/login')
  await page.getByLabel('Usuario').fill(username)
  await page.getByLabel('Contraseña').fill(DEMO_PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(
    page.getByRole('button', { name: 'Menú de usuario' }),
  ).toBeVisible()
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    `(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)()`,
  )
  expect(Number(overflow)).toBeLessThanOrEqual(1)
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

for (const width of [320, 360, 390, 768, 1440]) {
  test(`las rutas autenticadas no desbordan a ${width} px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 })
    await signIn(page)

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
  await signIn(page)

  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')

    const topbar = page.locator('header.sticky')
    const controls = topbar.locator('button, a[href]')
    await expect(controls).toHaveCount(5)
    await expect(topbar.getByRole('link', { name: /^Avisos/ })).toBeVisible()

    for (const control of await controls.all()) {
      const box = await control.boundingBox()
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
    }

    await expectNoHorizontalOverflow(page)
  }
})

test('la búsqueda global muestra un estado vacío', async ({ page }) => {
  await signIn(page)
  await page.getByRole('button', { name: 'Abrir búsqueda' }).click()
  await page.getByRole('textbox').fill('termino-que-no-existe')
  await expect(page.getByText('Sin resultados', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar' }).click()
})

test('el título de la pestaña cambia por ruta', async ({ page }) => {
  await signIn(page)
  await expect(page).toHaveTitle('Panel · Axia')

  await page.goto('/metricas')
  await expect(page.getByRole('heading', { name: 'Métricas' })).toBeVisible()
  await expect(page).toHaveTitle('Métricas · Axia')
})
