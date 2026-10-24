import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { testImage } from './fixtures.js'

const PASSWORD = process.env.AXIA_DEMO_PASSWORD ?? 'E2ePassword123!'

function localInput(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16)
}

async function signIn(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Usuario').fill('demo.admin')
  await page.getByLabel('Contraseña').fill(PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(
    page.getByRole('button', { name: 'Menú de usuario' }),
  ).toBeVisible()
}

async function createTicketAt(page: Page, occurredAt: Date) {
  const description = `Hora por proxy ${crypto.randomUUID()}`
  await page.goto('/tickets/nuevo')
  await page
    .getByLabel('Solicitante', { exact: true })
    .selectOption({ label: 'Ana Pérez' })
  const timeField = page.locator('#create-occurred-at')
  await expect(timeField).toBeVisible()
  await timeField.fill(localInput(occurredAt))
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
  await expect(page.getByRole('heading', { level: 1 })).toContainText('AX-')
  await expect(page.getByText(description)).toBeVisible()
}

test('@smoke la hora manual solo aparece al actuar a nombre de un técnico', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 })
  const createdAt = new Date(Date.now() - 24 * 60 * 60_000)
  await signIn(page)
  await createTicketAt(page, createdAt)

  // Las acciones directas no ofrecen hora manual.
  await page.getByRole('button', { name: 'Comentar' }).click()
  await expect(page.locator('#action-occurred-at')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await page.getByRole('button', { name: 'Asignar técnico' }).click()
  await page
    .getByLabel('Técnico', { exact: true })
    .selectOption({ label: 'Luis Gómez' })
  await page.getByRole('button', { name: 'Confirmar' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await page.getByRole('button', { name: 'Iniciar' }).click()
  await expect(page.locator('#action-occurred-at')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)

  // La asignación también es directa: se corrige desde la línea de tiempo.
  const assignedAt = new Date(createdAt.getTime() + 60 * 60_000)
  await page.getByRole('button', { name: 'Ajustar hora' }).last().click()
  await page.locator('#event-time').fill(localInput(assignedAt))
  await page.getByRole('button', { name: 'Guardar hora' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  // Con técnico sujeto la acción sí permite fijar la hora.
  await page.locator('#proxy-technician').selectOption({ label: 'Luis Gómez' })
  await page.getByRole('button', { name: 'Iniciar' }).click()
  const startedAt = new Date(assignedAt.getTime() + 60 * 60_000)
  await expect(page.locator('#action-occurred-at')).toBeVisible()
  await page.locator('#action-occurred-at').fill(localInput(startedAt))
  await page.getByLabel('Evidencia: Antes').setInputFiles({
    name: 'antes.png',
    mimeType: 'image/png',
    buffer: testImage,
  })
  await page.getByRole('button', { name: 'Confirmar' }).click()
  await expect(page.getByText('En proceso', { exact: true })).toBeVisible()
  await expect(page.getByText('Trabajo iniciado')).toBeVisible()

  // El ajuste auditado sigue disponible.
  await page.getByRole('button', { name: 'Ajustar hora' }).last().click()
  await page.getByRole('button', { name: 'Guardar hora' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})
