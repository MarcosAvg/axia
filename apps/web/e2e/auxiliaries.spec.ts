import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

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

test('el administrador agrega un auxiliar y reasigna al supervisor', async ({
  page,
}) => {
  const description = `Auxiliar E2E ${crypto.randomUUID()}`
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

  // Asigna técnico y agrega un auxiliar.
  await page.getByRole('button', { name: 'Asignar técnico' }).click()
  await page
    .getByLabel('Técnico', { exact: true })
    .selectOption({ label: 'Luis Gómez' })
  await clickAndWait(page, 'Confirmar', 'ticket_assign_technician')

  await page.getByRole('button', { name: 'Agregar auxiliar' }).click()
  await page
    .getByLabel('Técnico', { exact: true })
    .selectOption({ label: 'Marta Ruiz' })
  await page.getByLabel('Motivo').selectOption({ index: 1 })
  await clickAndWait(page, 'Confirmar', 'ticket_add_auxiliary')
  await expect(page.getByText('Marta Ruiz · Auxiliar')).toBeVisible()

  // Reasigna a otro equipo.
  await page.getByRole('button', { name: 'Reasignar supervisor' }).click()
  await page.getByLabel('Equipo').selectOption({ label: 'Seguridad' })
  await page.getByLabel('Motivo').selectOption({ index: 1 })
  await clickAndWait(page, 'Confirmar', 'ticket_assign_supervisor')
  await expect(
    page.getByText('Registrado', { exact: true }).first(),
  ).toBeVisible()
})
