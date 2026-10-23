import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const PASSWORD = process.env.AXIA_DEMO_PASSWORD ?? 'E2ePassword123!'
const TICKET_ID = 'de000000-0000-4000-8000-000000000004'

async function signIn(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Usuario').fill('demo.admin')
  await page.getByLabel('Contraseña').fill(PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(
    page.getByRole('button', { name: 'Menú de usuario' }),
  ).toBeVisible()
}

test('detecta el tramo abierto y precarga la corrección', async ({ page }) => {
  await signIn(page)
  await page.goto(`/tickets/${TICKET_ID}`)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('AX-')

  await expect(page.getByText('Tramo actual', { exact: true })).toBeVisible()
  await expect(page.getByText(/Trabajo efectivo/)).toBeVisible()
  await page.getByRole('button', { name: 'Corregir tramo actual' }).click()

  await expect(page.getByLabel('Tipo de tramo')).toHaveValue('active_work')
  await expect(page.getByLabel('Inicio')).not.toHaveValue('')
  await expect(page.getByLabel('Técnico').locator('option:checked')).toHaveText(
    'Luis Gómez',
  )
  await page.locator('form').getByRole('button', { name: 'Cancelar' }).click()
})
