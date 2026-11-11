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

async function ticketActionCount(page: Page): Promise<number> {
  const result = await page.evaluate(`(async () => {
    const open = indexedDB.open('axia')
    const db = await new Promise((resolve, reject) => {
      open.onsuccess = () => resolve(open.result)
      open.onerror = () => reject(open.error)
    })
    if (!db.objectStoreNames.contains('outbox')) return 0
    const store = db.transaction('outbox', 'readonly').objectStore('outbox')
    const all = await new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    db.close()
    return all.filter((item) => item.type === 'ticket_action').length
  })()`)
  return Number(result)
}

async function createAssignedTicket(page: Page, description: string) {
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

  await page.getByRole('button', { name: 'Asignar técnico' }).click()
  await page
    .getByLabel('Técnico', { exact: true })
    .selectOption({ label: 'Luis Gómez · Líder' })
  await clickAndWait(page, 'Confirmar', 'ticket_assign_technician')
}

test('@smoke el técnico sube evidencia sin conexión y luego se sincroniza', async ({
  page,
}) => {
  const description = `Offline E2E ${crypto.randomUUID()}`
  await signIn(page, 'demo.admin')
  await createAssignedTicket(page, description)
  await page.getByRole('button', { name: 'Menú de usuario' }).click()
  await page.getByRole('menuitem', { name: 'Cerrar sesión' }).click()

  await signIn(page, 'demo.technician')
  await page.goto('/mi-trabajo')
  await page.getByText(description).click()
  // El técnico no ve el subidor libre (solo supervisor/admin tienen `evidence.attach`).
  await expect(page.getByLabel('Tipo de evidencia')).toHaveCount(0)
  // Espera a que el detalle cargue antes de desconectar.
  await expect(page.getByRole('button', { name: 'Iniciar' })).toBeVisible()

  // Sin conexión: iniciar pide la evidencia "antes" y ambas quedan en cola.
  await page.context().setOffline(true)
  await page.getByRole('button', { name: 'Iniciar' }).click()
  await page.getByLabel('Evidencia: Antes').setInputFiles({
    name: 'antes.png',
    mimeType: 'image/png',
    buffer: testImage,
  })
  await page.getByRole('button', { name: 'Confirmar' }).click()
  await expect(page.getByText('Pendiente de subir')).toBeVisible()
  // La vista avanza con el estado proyectado, no espera a recuperar la red.
  await expect(
    page.getByText('En proceso', { exact: true }).first(),
  ).toBeVisible()
  await expect(page.getByText('Sin sincronizar')).toBeVisible()
  await expect(
    page.getByText('Cambios pendientes de sincronizar'),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Iniciar' })).toHaveCount(0)
  // Una sola acción en la cola (sin doble envío).
  await expect.poll(() => ticketActionCount(page)).toBe(1)

  // La lista también refleja el estado proyectado y su marca de pendiente.
  await page
    .getByRole('link', { name: /^Mi trabajo/ })
    .first()
    .click()
  const card = page.getByRole('listitem').filter({ hasText: description })
  await expect(card.getByText('En proceso', { exact: true })).toBeVisible()
  await expect(card.getByText('Sin sincronizar')).toBeVisible()

  // Vuelve la conexión: el evento 'online' sincroniza la evidencia y el inicio.
  await page.context().setOffline(false)
  await expect(card.getByText('En proceso', { exact: true })).toBeVisible({
    timeout: 20000,
  })
  await expect(card.getByText('Sin sincronizar')).toHaveCount(0, {
    timeout: 20000,
  })
  await expect.poll(() => ticketActionCount(page)).toBe(0)
})
