import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const DEMO_PASSWORD = 'AxiaDemo2026!'

async function signIn(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña').fill(DEMO_PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(
    page.getByRole('button', { name: 'Menú de usuario' }),
  ).toBeVisible()
}

async function clickAndWait(page: Page, name: string, rpc: string) {
  const done = page.waitForResponse((response) =>
    response.url().includes(`/rpc/${rpc}`),
  )
  await page.getByRole('button', { name }).click()
  await done
}

test('el administrador rechaza y reactiva un tiquet', async ({ page }) => {
  const description = `Reactivar E2E ${crypto.randomUUID()}`
  await signIn(page, 'admin@axia.test')

  await page.goto('/tickets/nuevo')
  await page
    .getByLabel('Solicitante', { exact: true })
    .selectOption({ label: 'Ana Pérez' })
  await page.getByLabel('Edificio').selectOption({ label: 'Edificio Central' })
  await page.getByLabel('Ubicación').selectOption({ label: 'Planta baja' })
  await page
    .getByLabel('Dependencia solicitante')
    .selectOption({ label: 'Sistemas' })
  await page
    .getByLabel('Categoría', { exact: true })
    .selectOption({ label: 'Eléctrico' })
  await page
    .getByLabel('Tipo de servicio')
    .selectOption({ label: 'Correctivo' })
  await page.getByLabel('Prioridad').selectOption({ label: 'Media' })
  await page.getByLabel('Canal').selectOption({ label: 'Web' })
  await page.getByLabel('Descripción del problema').fill(description)
  await page.getByRole('button', { name: 'Registrar tiquet' }).click()
  await expect(page.getByText(description)).toBeVisible()

  // Rechazar (acción secundaria, dentro del menú).
  await page.getByRole('button', { name: 'Más acciones' }).click()
  await page.getByRole('menuitem', { name: 'Rechazar' }).click()
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
