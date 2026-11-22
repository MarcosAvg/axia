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
  table: 'outbox' | 'actionDrafts' | 'retryableEvidence',
): Promise<number> {
  const result = await page.evaluate(`(async () => {
    const open = indexedDB.open('axia')
    const db = await new Promise((resolve, reject) => {
      open.onsuccess = () => resolve(open.result)
      open.onerror = () => reject(open.error)
    })
    const kind = ${JSON.stringify(table)}
    const table = kind === "retryableEvidence" ? "outbox" : kind
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
    if (kind === 'retryableEvidence') {
      return all.filter((item) => item.type === 'evidence_upload' && item.state === 'pending' && item.attempts > 0).length
    }
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
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByText('Pendiente de subir')).toBeVisible()
  return page
}

async function blockPreparation(page: Page, description: string) {
  await createAssignedTicket(page, description)
  const ticketId = new URL(page.url()).pathname.split('/').at(-1)
  await page.route(`**/api/tickets/${ticketId}`, (route) => route.abort())
}

async function verifyUnpreparedTicket(page: Page, description: string) {
  await page.getByRole('link').filter({ hasText: description }).click()
  await expect(
    page.getByText('Este tiquet no está disponible sin conexión'),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Volver a Mi trabajo' }).click()
}

async function pauseOffline(page: Page) {
  await page.getByRole('button', { name: 'Pausar' }).click()
  await page.getByLabel('Motivo').selectOption({ label: 'Falta de material' })
  await page.getByRole('button', { name: 'Confirmar' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect.poll(() => localCount(page, 'outbox')).toBe(2)
  await expect.poll(() => localCount(page, 'actionDrafts')).toBe(0)
}

async function reconnectWithInterruptedUpload(page: Page) {
  const upload = '**/api/uploads'
  let initialUpload = true
  await page.route(upload, async (route) => {
    if (initialUpload && route.request().method() === 'POST') {
      initialUpload = false
      const response = await route.fetch()
      expect(response.ok()).toBe(true)
    }
    await route.abort('internetdisconnected')
  })
  await page.context().setOffline(false)
  await expect.poll(() => localCount(page, 'retryableEvidence')).toBe(1)
  await page.context().setOffline(true)
  await page.unroute(upload)
  await page.context().setOffline(false)
}

async function verifyPauseWhileSending(page: Page) {
  let release = () => {}
  const hold = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route(`**/api${new URL(page.url()).pathname}`, async (route) => {
    await hold
    await route.continue()
  })
  await page.route('**/api/sync/actions', async (route) => {
    const body = route.request().postDataJSON() as {
      items?: { type: string }[]
    }
    if (body.items?.[0]?.type === 'pause') await hold
    await route.continue()
  })
  const started = page.waitForRequest(
    (request) =>
      request.url().endsWith('/api/sync/actions') &&
      (request.postDataJSON() as { items?: { type: string }[] }).items?.[0]
        ?.type === 'pause',
  )
  try {
    await reconnectWithInterruptedUpload(page)
    await started
    await expect.poll(() => localCount(page, 'outbox')).toBe(2)
    await expect(
      page.getByText('Pausado', { exact: true }).first(),
    ).toBeVisible()
    await expect(page.getByText('Sin sincronizar').first()).toBeVisible()
  } finally {
    release()
  }
}

async function verifySyncedPause(page: Page) {
  await expect(page.getByText('Pausado', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Iniciar' })).toHaveCount(0)
  await expect(page.getByText(/Borradores para revisar/)).toHaveCount(0)
}

async function verifyFirstInstall(page: Page) {
  // Una instalación nueva debe controlar la primera pestaña sin recargarla.
  await page.goto('/login')
  await page.waitForFunction('Boolean(navigator.serviceWorker?.controller)')
}

test('@smoke el técnico sube evidencia sin conexión y luego se sincroniza', async ({
  page,
}) => {
  if (testPwa) await verifyFirstInstall(page)
  const id = crypto.randomUUID()
  const description = `Offline E2E ${id}`
  const unprepared = `Sin preparar ${id}`
  await signIn(page, 'demo.admin')
  await createAssignedTicket(page, description)
  if (testPwa) await blockPreparation(page, unprepared)
  await page.getByRole('button', { name: 'Menú de usuario' }).click()
  await page.getByRole('menuitem', { name: 'Cerrar sesión' }).click()

  await signIn(page, 'demo.technician')
  await page.goto('/mi-trabajo')
  await expect(
    page
      .getByRole('listitem')
      .filter({ hasText: description })
      .getByText('Disponible sin conexión', { exact: true }),
  ).toBeVisible()
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
  if (!testPwa) await page.context().setOffline(true)
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

  await pauseOffline(page)

  // La lista también refleja el estado proyectado y su marca de pendiente.
  await page
    .getByRole('link', { name: /^Mi trabajo/ })
    .first()
    .click()
  const card = page.getByRole('listitem').filter({ hasText: description })
  await expect(card.getByText('Pausado', { exact: true })).toBeVisible()
  await expect(card.getByText('Sin sincronizar')).toBeVisible()

  // La conexión vuelve con el detalle abierto y sin recargar la página.
  await card.getByRole('link').click()
  await verifyPauseWhileSending(page)
  await expect(page.getByText('Sin sincronizar')).toHaveCount(0, {
    timeout: 20000,
  })
  await expect.poll(() => localCount(page, 'outbox')).toBe(0)
  await verifySyncedPause(page)
})
