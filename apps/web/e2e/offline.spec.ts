import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import {
  selectDefaultClassification,
  submitTicketForm,
  testImage,
  signIn,
} from './fixtures.js'

const testPwa = process.env.AXIA_E2E_PWA === '1'

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

async function localCount(
  page: Page,
  table: 'outbox' | 'actionDrafts',
): Promise<number> {
  const result = await page.evaluate(`(async () => {
    const open = indexedDB.open('axia')
    const db = await new Promise((resolve, reject) => {
      open.onsuccess = () => resolve(open.result)
      open.onerror = () => reject(open.error)
    })
    const table = ${JSON.stringify(table)}
    if (!db.objectStoreNames.contains(table)) {
      db.close()
      return 0
    }
    const store = db.transaction(table, 'readonly').objectStore(table)
    const all = await new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    db.close()
    return table === 'outbox' ? all.filter((item) => item.type === 'ticket_action').length : all.length
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

async function reconnectOfflinePage(page: Page) {
  await page.waitForFunction('Boolean(navigator.serviceWorker?.controller)')
  const context = page.context()
  const url = page.url()
  await page.close()
  await context.setOffline(true)
  const reopened = await context.newPage()
  await reopened.goto(url)
  return reopened
}

async function prepareTicket(page: Page, description: string) {
  await page
    .getByText('Preparar para trabajar sin conexión', { exact: true })
    .click()
  await page.getByRole('checkbox', { name: new RegExp(description) }).check()
  await page.getByRole('button', { name: 'Preparar seleccionados' }).click()
  await expect(
    page.getByRole('checkbox', { name: new RegExp(description) }),
  ).toHaveAccessibleName(/Guardado/)
}

async function restoreAndSubmitEvidence(page: Page) {
  // El técnico puede iniciar trabajo a partir del detalle que preparó.
  await page.getByRole('button', { name: 'Iniciar' }).click()
  await page.getByLabel('Evidencia: Antes').setInputFiles({
    name: 'antes.png',
    mimeType: 'image/png',
    buffer: testImage,
  })
  await expect.poll(() => localCount(page, 'actionDrafts')).toBe(1)
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
  if (testPwa) page = await reconnectOfflinePage(page)
  await page.getByRole('button', { name: 'Iniciar' }).click()
  await page.getByRole('button', { name: 'Retomar borrador' }).click()
  await expect(page.getByText('antes.png', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Confirmar' }).click()
  await expect(page.getByText('Pendiente de subir')).toBeVisible()
  return page
}

async function verifyUnpreparedTicket(page: Page, description: string) {
  await page.getByRole('link').filter({ hasText: description }).click()
  await expect(
    page.getByText('Este tiquet no está disponible sin conexión'),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Volver a Mi trabajo' }).click()
}

test('@smoke el técnico sube evidencia sin conexión y luego se sincroniza', async ({
  page,
}) => {
  const id = crypto.randomUUID()
  const description = `Offline E2E ${id}`
  const unprepared = `Sin preparar ${id}`
  await signIn(page, 'demo.admin')
  await createAssignedTicket(page, description)
  if (testPwa) await createAssignedTicket(page, unprepared)
  await page.getByRole('button', { name: 'Menú de usuario' }).click()
  await page.getByRole('menuitem', { name: 'Cerrar sesión' }).click()

  await signIn(page, 'demo.technician')
  await page.goto('/mi-trabajo')
  await prepareTicket(page, description)
  if (testPwa) {
    page = await reconnectOfflinePage(page)
    await verifyUnpreparedTicket(page, unprepared)
  }
  await page
    .getByRole('checkbox', { name: 'Mostrar solo disponibles sin conexión' })
    .check()
  await page.getByRole('link').filter({ hasText: description }).click()
  await expect(page.getByLabel('Tipo de evidencia')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Iniciar' })).toBeVisible()
  await page.context().setOffline(true)
  page = await restoreAndSubmitEvidence(page)
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
  await expect.poll(() => localCount(page, 'outbox')).toBe(1)
  await expect.poll(() => localCount(page, 'actionDrafts')).toBe(0)

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
  await expect.poll(() => localCount(page, 'outbox')).toBe(0)
})
