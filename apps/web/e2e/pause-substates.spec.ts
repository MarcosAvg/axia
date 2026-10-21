import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { testImage } from './fixtures.js'

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

async function signOut(page: Page) {
  await page.getByRole('button', { name: 'Menú de usuario' }).click()
  await page.getByRole('menuitem', { name: 'Cerrar sesión' }).click()
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
}

async function clickAndWait(page: Page, name: string, action: string) {
  void action
  const done = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      response.url().includes('/api/tickets/'),
  )
  await page.getByRole('button', { name }).click()
  await done
}

test('el técnico pausa, avanza el subestado y reanuda', async ({ page }) => {
  const description = `Pausa E2E ${crypto.randomUUID()}`

  await signIn(page, 'demo.admin')
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
  await page.getByLabel('Canal').selectOption({ label: 'Web' })
  await page.getByLabel('Descripción del problema').fill(description)
  await page.getByRole('button', { name: 'Registrar tiquet' }).click()
  await expect(page.getByText(description)).toBeVisible()

  await page.getByRole('button', { name: 'Asignar técnico' }).click()
  await page
    .getByLabel('Técnico', { exact: true })
    .selectOption({ label: 'Luis Gómez' })
  await clickAndWait(page, 'Confirmar', 'ticket_assign_technician')
  await signOut(page)

  await signIn(page, 'demo.technician')
  await page.goto('/mi-trabajo')
  await page.getByText(description).click()

  await page.getByRole('button', { name: 'Iniciar' }).click()
  await page.getByLabel('Evidencia: Antes').setInputFiles({
    name: 'antes.png',
    mimeType: 'image/png',
    buffer: testImage,
  })
  await clickAndWait(page, 'Confirmar', 'ticket_start')
  await expect(page.getByText('En proceso', { exact: true })).toBeVisible()

  // Pausa con un motivo (nodo raíz).
  await page.getByRole('button', { name: 'Pausar' }).click()
  await page.getByLabel('Motivo').selectOption({ label: 'Falta de material' })
  await clickAndWait(page, 'Confirmar', 'ticket_pause')
  await expect(page.getByText('Pausado', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Subestado actual').first()).toBeVisible()

  // Gestiona la pausa: baja dos niveles del árbol (cascada).
  await page.getByRole('button', { name: 'Avanzar subestado' }).click()
  await page
    .getByLabel('Nuevo subestado')
    .selectOption({ label: 'Por solicitar' })
  await page
    .getByLabel('Subestado · Por solicitar')
    .selectOption({ label: 'Con proveedor' })
  await clickAndWait(page, 'Confirmar', 'ticket_advance_pause')
  await expect(page.getByText('Con proveedor').first()).toBeVisible()

  // Reanuda: exige un subestado (descendiente del motivo), también en cascada.
  await page.getByRole('button', { name: 'Reanudar' }).click()
  await page
    .getByLabel('Nuevo subestado')
    .selectOption({ label: 'Por solicitar' })
  await page
    .getByLabel('Subestado · Por solicitar')
    .selectOption({ label: 'Sin proveedor' })
  await clickAndWait(page, 'Confirmar', 'ticket_resume')
  await expect(page.getByText('En proceso', { exact: true })).toBeVisible()
})
