import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { selectDefaultClassification, submitTicketForm } from './fixtures.js'

const DEMO_PASSWORD = process.env.AXIA_DEMO_PASSWORD ?? 'E2ePassword123!'

async function signIn(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Usuario').fill(email)
  await page.getByLabel('Contraseña').fill(DEMO_PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(
    page.getByRole('button', { name: 'Menú de usuario' }),
  ).toBeVisible()
}

async function clickAndWait(page: Page, name: string, action: string) {
  const expected = action.replace(/^ticket_/, '')
  const done = page.waitForResponse((response) => {
    if (response.request().method() !== 'POST') return false
    if (!response.url().includes('/api/tickets/')) return false
    const body = response.request().postDataJSON() as { action?: string } | null
    return body?.action === expected
  })
  await page.getByRole('button', { name }).click()
  await done
}

test('el administrador rechaza y reactiva un tiquet', async ({ page }) => {
  const description = `Reactivar E2E ${crypto.randomUUID()}`
  await signIn(page, 'demo.admin')

  await page.goto('/tickets/nuevo')
  await page
    .getByLabel('Solicitante', { exact: true })
    .selectOption({ label: 'Ana Pérez' })
  await page.getByLabel('Edificio').selectOption({ label: 'Edificio Central' })
  await page.getByLabel('Ubicación').selectOption({ label: 'Planta baja' })
  await page
    .getByLabel('Categoría', { exact: true })
    .selectOption({ label: 'Eléctrico' })
  await selectDefaultClassification(page)
  await page.getByLabel('Canal').selectOption({ label: 'Web' })
  await page.getByLabel('Descripción del problema').fill(description)
  await submitTicketForm(page)
  await expect(page.getByText(description)).toBeVisible()

  // Rechazar.
  await page.getByRole('button', { name: 'Rechazar' }).click()
  await page.getByLabel('Motivo').selectOption({ index: 1 })
  await clickAndWait(page, 'Confirmar', 'ticket_reject')
  await expect(
    page.getByText('Rechazado', { exact: true }).first(),
  ).toBeVisible()

  // Reactivar.
  await page.getByRole('button', { name: 'Reactivar' }).click()
  await page.getByLabel('Motivo').selectOption({ index: 1 })
  await clickAndWait(page, 'Confirmar', 'ticket_reactivate')
  await expect(
    page.getByText('Registrado', { exact: true }).first(),
  ).toBeVisible()
})
