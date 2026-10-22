import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const PASSWORD = process.env.AXIA_DEMO_PASSWORD ?? 'E2ePassword123!'

const EXPECTED_NAV = {
  'demo.admin': [
    'Panel',
    'Tiquets',
    'Bandeja',
    'Métricas',
    'Catálogos',
    'Roles',
    'Usuarios',
    'Ámbitos',
    'Calendarios',
    'Configuración',
    'Mi perfil',
  ],
  'demo.supervisor': ['Panel', 'Tiquets', 'Bandeja', 'Métricas', 'Mi perfil'],
  'demo.technician': ['Panel', 'Tiquets', 'Mi trabajo', 'Mi perfil'],
  'demo.requester': ['Panel', 'Tiquets', 'Mi perfil'],
} as const

async function signIn(page: Page, username: keyof typeof EXPECTED_NAV) {
  await page.goto('/login')
  await page.getByLabel('Usuario').fill(username)
  await page.getByLabel('Contraseña').fill(PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(
    page.getByRole('button', { name: 'Menú de usuario' }),
  ).toBeVisible()
}

test.describe('vistas por rol', () => {
  for (const username of Object.keys(EXPECTED_NAV) as Array<
    keyof typeof EXPECTED_NAV
  >) {
    test(`${username} ve solo sus destinos`, async ({ page }) => {
      const forbidden: string[] = []
      page.on('response', (response) => {
        if (response.status() === 403) forbidden.push(response.url())
      })

      await signIn(page, username)

      const labels = await page
        .locator('nav[aria-label="Navegación principal"] a')
        .allInnerTexts()
      expect(labels).toEqual(EXPECTED_NAV[username])

      await page.waitForTimeout(800)
      await expect(page.getByText('No se pudo cargar el panel.')).toHaveCount(0)
      expect(forbidden).toEqual([])
    })
  }
})

test.describe('acciones por rol', () => {
  test('el detalle no pide ofertas a quien no puede tomarlas', async ({
    page,
  }) => {
    const forbidden: string[] = []
    page.on('response', (response) => {
      if (response.status() === 403) forbidden.push(response.url())
    })
    await signIn(page, 'demo.requester')
    await page.goto('/tickets/de000000-0000-4000-8000-000000000001')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('AX-')
    await page.waitForTimeout(500)
    expect(forbidden).toEqual([])
  })

  test('las vistas ocultas también bloquean el acceso directo', async ({
    page,
  }) => {
    await signIn(page, 'demo.requester')
    await page.goto('/inbox')
    await expect(page.getByText('Sin acceso')).toBeVisible()
    await page.goto('/mi-trabajo')
    await expect(page.getByText('Sin acceso')).toBeVisible()

    await page.getByRole('button', { name: 'Menú de usuario' }).click()
    await page.getByRole('menuitem', { name: 'Cerrar sesión' }).click()
    await signIn(page, 'demo.supervisor')
    await page.goto('/admin')
    await expect(page.getByText('Sin acceso')).toBeVisible()
  })

  test('Nuevo tiquet solo aparece con permiso de creación', async ({
    page,
  }) => {
    await signIn(page, 'demo.supervisor')
    await page.goto('/tickets')
    await expect(page.getByRole('link', { name: 'Nuevo tiquet' })).toHaveCount(
      0,
    )

    await page.getByRole('button', { name: 'Menú de usuario' }).click()
    await page.getByRole('menuitem', { name: 'Cerrar sesión' }).click()
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()

    await signIn(page, 'demo.requester')
    await page.goto('/tickets')
    await expect(page.getByRole('link', { name: 'Nuevo tiquet' })).toBeVisible()
  })
})
