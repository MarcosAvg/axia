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

async function expectStatus(page: Page, label: string) {
  await expect(
    page
      .getByRole('heading', { level: 1 })
      .locator('..')
      .getByText(label, { exact: true }),
  ).toBeVisible()
}

async function createAndAssignTicket(page: Page, description: string) {
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
  await clickAndWait(page, 'Confirmar', 'ticket_assign_technician')
  await expect(
    page.getByText('Asignado', { exact: true }).first(),
  ).toBeVisible()
  await signOut(page)
}

async function validateAndRate(page: Page, ticketUrl: string) {
  await page.goto(ticketUrl)
  await page.getByRole('button', { name: 'Validar' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: '5' }).click()
  await page.getByLabel('Comentario (opcional)').fill('Servicio excelente')
  await page.getByRole('button', { name: 'Enviar calificación' }).click()
  await expect(page.getByText('Calificación registrada').first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Validar' })).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Abrir reclamación' }),
  ).toHaveCount(0)

  // La calificación no se puede modificar y las acciones siguen cerradas.
  await page.reload()
  await expect(page.getByText('Calificación registrada').first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Validar' })).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Abrir reclamación' }),
  ).toHaveCount(0)
}

test('@smoke el técnico recibe, atiende con evidencias y cierra su parte', async ({
  page,
}) => {
  const description = `Flujo técnico E2E ${crypto.randomUUID()}`

  // El administrador registra y asigna el tiquet al técnico.
  await createAndAssignTicket(page, description)

  // El técnico ve el tiquet en su bandeja, sube evidencia e inicia.
  await signIn(page, 'demo.technician')
  await page.goto('/mi-trabajo')
  await page.getByText(description).click()

  // Iniciar pide la evidencia "antes".
  await page.getByRole('button', { name: 'Iniciar' }).click()
  await page.getByLabel('Evidencia: Antes').setInputFiles({
    name: 'antes.png',
    mimeType: 'image/png',
    buffer: testImage,
  })
  await clickAndWait(page, 'Confirmar', 'ticket_start')
  await expectStatus(page, 'En proceso')

  // Atender pide tipo de servicio, descripción y evidencia "después".
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
  await clickAndWait(page, 'Confirmar', 'ticket_attend')
  await expect(
    page.getByText('Atendido', { exact: true }).first(),
  ).toBeVisible()

  // El solicitante valida; la calificación aparece en un modal único.
  const ticketUrl = page.url()
  await signOut(page)
  await signIn(page, 'demo.requester')
  await validateAndRate(page, ticketUrl)
})
