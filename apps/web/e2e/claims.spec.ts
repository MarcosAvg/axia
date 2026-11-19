import { expect, test } from '@playwright/test'
import {
  selectDefaultClassification,
  submitTicketForm,
  testImage,
  signIn,
} from './fixtures.js'

const ATTENDED_TICKET = 'de000000-0000-4000-8000-000000000005'

test('@smoke un solicitante abre una reclamación con evidencia', async ({
  page,
}) => {
  await signIn(page, 'demo.requester')
  await page.goto(`/tickets/${ATTENDED_TICKET}`)
  await expect(
    page.getByText('Atendido', { exact: true }).first(),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Abrir reclamación' }).click()
  await page.getByLabel('Motivo').selectOption({ index: 1 })
  await page
    .getByLabel('Describe la reclamación')
    .fill('La falla volvió a aparecer después del servicio')
  await page.getByLabel('Evidencia: Reclamación').setInputFiles({
    name: 'reclamacion.png',
    mimeType: 'image/png',
    buffer: testImage,
  })
  await page.getByRole('button', { name: 'Confirmar' }).click()

  await expect(page.getByText('En reclamación', { exact: true })).toBeVisible()
})

test('un solicitante registra un tiquet con foto', async ({ page }) => {
  const description = `Solicitud con foto ${crypto.randomUUID()}`
  await signIn(page, 'demo.requester')

  await page.goto('/tickets/nuevo')
  await page.getByLabel('Edificio').selectOption({ label: 'Edificio Central' })
  await page.getByLabel('Ubicación').selectOption({ label: 'Planta baja' })
  await page
    .getByLabel('Categoría', { exact: true })
    .selectOption({ label: 'Eléctrico' })
  await selectDefaultClassification(page)
  await page.getByLabel('Descripción del problema').fill(description)
  await page.getByLabel('Foto de la solicitud (opcional)').setInputFiles({
    name: 'solicitud.png',
    mimeType: 'image/png',
    buffer: testImage,
  })
  await submitTicketForm(page)

  await expect(page.getByText(description)).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Ampliar evidencia: Solicitud' }),
  ).toBeVisible({ timeout: 15_000 })
})
