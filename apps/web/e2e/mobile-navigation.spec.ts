import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const PASSWORD = process.env.AXIA_DEMO_PASSWORD ?? 'E2ePassword123!'
const TICKET_ID = 'de000000-0000-4000-8000-000000000004'

async function signIn(page: Page, username: string) {
  await page.goto('/login')
  await page.getByLabel('Usuario').fill(username)
  await page.getByLabel('Contraseña').fill(PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(
    page.getByRole('button', { name: 'Menú de usuario' }),
  ).toBeVisible()
}

test('la barra inferior navega y deja el resto en Más', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await signIn(page, 'demo.technician')

  const tabbar = page.getByRole('navigation', { name: 'Navegación inferior' })
  await expect(tabbar).toBeVisible()
  await expect(tabbar.getByRole('link')).toHaveCount(3)
  await expect(tabbar.getByRole('link', { name: 'Mi trabajo' })).toBeVisible()

  await tabbar.getByRole('link', { name: 'Tiquets' }).click()
  await expect(page).toHaveURL(/\/tickets/)
  await expect(tabbar.getByRole('link', { name: 'Tiquets' })).toHaveAttribute(
    'aria-current',
    'page',
  )

  await tabbar.getByRole('button', { name: 'Más', exact: true }).click()
  const drawer = page.getByRole('dialog')
  await expect(drawer.getByRole('link', { name: 'Mi perfil' })).toBeVisible()
  await expect(
    drawer.getByRole('button', { name: 'Cambiar tema y modo' }),
  ).toBeVisible()
})

test('el administrador cambia Mi trabajo por Métricas', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await signIn(page, 'demo.admin')

  const tabbar = page.getByRole('navigation', { name: 'Navegación inferior' })
  await expect(tabbar.getByRole('link', { name: 'Métricas' })).toBeVisible()
  await expect(tabbar.getByRole('link', { name: 'Mi trabajo' })).toHaveCount(0)
})

test('el detalle cambia la barra inferior por la acción fija', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await signIn(page, 'demo.technician')
  await page.goto(`/tickets/${TICKET_ID}`)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('AX-')

  await expect(
    page.getByRole('navigation', { name: 'Navegación inferior' }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Más', exact: true }),
  ).toBeVisible()

  const overflow = await page.evaluate(
    'document.documentElement.scrollWidth - document.documentElement.clientWidth',
  )
  expect(overflow).toBeLessThanOrEqual(1)
})
