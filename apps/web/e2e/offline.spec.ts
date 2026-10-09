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

  await page.getByRole('button', { name: 'Asignar técnico' }).click()
  await page
    .getByLabel('Técnico', { exact: true })
    .selectOption({ label: 'Luis Gómez' })
  await clickAndWait(page, 'Confirmar', 'ticket_assign_technician')
}

test('el técnico sube evidencia sin conexión y luego se sincroniza', async ({
  page,
}) => {
  const description = `Offline E2E ${crypto.randomUUID()}`
  await signIn(page, 'admin@axia.test')
  await createAssignedTicket(page, description)
  await page.getByRole('button', { name: 'Menú de usuario' }).click()
  await page.getByRole('menuitem', { name: 'Cerrar sesión' }).click()

  await signIn(page, 'tecnico@axia.test')
  await page.goto('/mi-trabajo')
  await page.getByText(description).click()
  await expect(page.getByLabel('Tipo de evidencia')).toBeVisible()

  // Sin conexión: iniciar pide la evidencia "antes" y ambas quedan en cola.
  await page.context().setOffline(true)
  await page.getByRole('button', { name: 'Iniciar' }).click()
  await page.getByLabel('Evidencia: Antes').setInputFiles({
    name: 'antes.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from('foto-sin-conexion'),
  })
  await page.getByRole('button', { name: 'Confirmar' }).click()
  await expect(page.getByText('Pendiente de subir')).toBeVisible()
  await expect(
    page.getByText('Asignado', { exact: true }).first(),
  ).toBeVisible()
  // Una sola acción en la cola (sin doble envío).
  await expect.poll(() => ticketActionCount(page)).toBe(1)

  // Vuelve la conexión: el evento 'online' sincroniza la evidencia y el inicio.
  await page.context().setOffline(false)
  await expect(page.getByText('En proceso', { exact: true })).toBeVisible({
    timeout: 20000,
  })
})
