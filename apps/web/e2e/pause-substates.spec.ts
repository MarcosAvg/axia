import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import {
  selectDefaultClassification,
  submitTicketForm,
  testImage,
} from './fixtures.js'

const DEMO_PASSWORD = process.env.AXIA_DEMO_PASSWORD ?? 'E2ePassword123!'

async function signIn(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Usuario').pressSequentially(email, { delay: 5 })
  await page
    .getByLabel('Contraseña')
    .pressSequentially(DEMO_PASSWORD, { delay: 5 })
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

async function createTicket(page: Page, description: string) {
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
}

test('@smoke pausa, subestado y reanudación', async ({ page }) => {
  const description = `Pausa E2E ${crypto.randomUUID()}`
  await signIn(page, 'demo.admin')
  await createTicket(page, description)
  await page.getByRole('button', { name: 'Asignar técnico' }).click()
  await page
    .getByLabel('Técnico', { exact: true })
    .selectOption({ label: 'Luis Gómez · Líder' })
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
  const header = page.locator('h1').locator('..')
  await expect(header.getByText('En proceso', { exact: true })).toBeVisible()

  // Pausa con un motivo (nodo raíz).
  await page.getByRole('button', { name: 'Pausar' }).click()
  await page.getByLabel('Motivo').selectOption({ label: 'Falta de material' })
  await clickAndWait(page, 'Confirmar', 'ticket_pause')
  await expect(page.getByText('Pausado', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Subestado actual').first()).toBeVisible()
  await expect(page.getByText('Sin subestado').first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Reanudar' })).toHaveCount(0)

  // El primer paso no habilita la reanudación: solo describe el avance.
  await page.getByRole('button', { name: 'Avanzar subestado' }).click()
  await page
    .getByLabel('Siguiente subestado')
    .selectOption({ label: 'Solicitado' })
  await clickAndWait(page, 'Confirmar', 'ticket_advance_pause')
  await expect(page.getByText('Solicitado').first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Reanudar' })).toHaveCount(0)

  // El segundo paso habilita las salidas.
  await page.getByRole('button', { name: 'Avanzar subestado' }).click()
  await page
    .getByLabel('Siguiente subestado')
    .selectOption({ label: 'En compra externa o cotización' })
  await clickAndWait(page, 'Confirmar', 'ticket_advance_pause')
  await expect(page.getByText('Salidas disponibles').first()).toBeVisible()
  await page.getByRole('button', { name: 'Reanudar' }).click()
  await page.getByLabel('Salida').selectOption({ label: 'Recibido' })
  await clickAndWait(page, 'Confirmar', 'ticket_resume')
  await expect(header.getByText('En proceso', { exact: true })).toBeVisible()
  await expect(page.getByText('Cerrada con: Recibido').first()).toBeVisible()

  // Un motivo con salida directa se reanuda sin recorrer pasos.
  await page.getByRole('button', { name: 'Pausar' }).click()
  await page.getByLabel('Motivo').selectOption({ label: 'Falta de personal' })
  await clickAndWait(page, 'Confirmar', 'ticket_pause')
  await expect(page.getByRole('button', { name: 'Reanudar' })).toBeVisible()
  await page.getByRole('button', { name: 'Reanudar' }).click()
  await page.getByLabel('Salida').selectOption({ label: 'Personal disponible' })
  await clickAndWait(page, 'Confirmar', 'ticket_resume')
  await expect(header.getByText('En proceso', { exact: true })).toBeVisible()
  await expect(
    page.getByText('Cerrada con: Personal disponible').first(),
  ).toBeVisible()
})
