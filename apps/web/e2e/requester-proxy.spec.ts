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

async function clickAndWait(page: Page, name: string) {
  const done = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      response.url().includes('/api/tickets/'),
  )
  await page.getByRole('button', { name }).click()
  await done
}

async function createAndAttend(page: Page, description: string) {
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

  await page.getByRole('button', { name: 'Asignar técnico' }).click()
  await page
    .getByLabel('Técnico', { exact: true })
    .selectOption({ label: 'Luis Gómez · Líder' })
  await clickAndWait(page, 'Confirmar')
  const ticketUrl = page.url()
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
  await clickAndWait(page, 'Confirmar')
  await page.getByRole('button', { name: 'Marcar atendido' }).click()
  await page
    .getByLabel('Tipo de servicio')
    .selectOption({ label: 'Correctivo' })
  await page
    .getByLabel('Descripción del trabajo')
    .fill('Se revisó la instalación y quedó funcionando')
  await page.getByLabel('Evidencia: Después').setInputFiles({
    name: 'despues.png',
    mimeType: 'image/png',
    buffer: testImage,
  })
  await clickAndWait(page, 'Confirmar')
  await signOut(page)
  return ticketUrl
}

test('@smoke el supervisor valida como proxy del solicitante y luego su propio lado', async ({
  page,
}) => {
  const description = `Proxy E2E ${crypto.randomUUID()}`
  const ticketUrl = await createAndAttend(page, description)

  await signIn(page, 'demo.supervisor')
  await page.goto(ticketUrl)

  // Sin proxy no puede validar el lado del solicitante.
  await expect(
    page.getByText('Esperando la validación del solicitante.'),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Validar' })).toHaveCount(0)

  // Con el solicitante como sujeto, valida su lado y califica en su nombre.
  await page
    .getByLabel('Actuar a nombre de')
    .selectOption({ label: 'Solicitante: Ana Pérez' })
  await page.getByRole('button', { name: 'Validar' }).click()
  await expect(
    page.getByText('Atendido', { exact: true }).first(),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Validar' })).toHaveCount(0)

  await expect(
    page.getByText('La calificación se registra a nombre del solicitante.'),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Calificar' }).click()
  await page.getByRole('button', { name: '5' }).click()
  await page.getByRole('button', { name: 'Enviar calificación' }).click()
  await expect(page.getByText('Calificación registrada').first()).toBeVisible()

  // Después valida su propio lado sin proxy y el tiquet cierra.
  await page
    .getByLabel('Actuar a nombre de')
    .selectOption({ label: 'Nadie (acción propia)' })
  await page.getByRole('button', { name: 'Validar' }).click()
  await expect(page.getByText('Cerrado', { exact: true }).first()).toBeVisible()
})
