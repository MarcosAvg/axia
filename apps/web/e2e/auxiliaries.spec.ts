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

test('el administrador agrega un auxiliar y reasigna al supervisor', async ({
  page,
}) => {
  const description = `Auxiliar E2E ${crypto.randomUUID()}`
  await signIn(page, 'admin@axia.test')

  await page.goto('/tickets/nuevo')
  await page
    .getByLabel('Solicitante', { exact: true })
    .selectOption({ label: 'Ana Pérez (ejemplo)' })
  await page
    .getByLabel('Edificio')
    .selectOption({ label: 'Edificio Central (ejemplo)' })
  await page
    .getByLabel('Ubicación')
    .selectOption({ label: 'Planta baja (ejemplo)' })
  await page
    .getByLabel('Dependencia solicitante')
    .selectOption({ label: 'Sistemas (ejemplo)' })
  await page
    .getByLabel('Categoría', { exact: true })
    .selectOption({ label: 'Eléctrico (ejemplo)' })
  await page
    .getByLabel('Tipo de servicio')
    .selectOption({ label: 'Correctivo (ejemplo)' })
  await page.getByLabel('Prioridad').selectOption({ label: 'Media (ejemplo)' })
  await page.getByLabel('Canal').selectOption({ label: 'Web (ejemplo)' })
  await page.getByLabel('Descripción del problema').fill(description)
  await page.getByRole('button', { name: 'Registrar tiquet' }).click()
  await expect(page.getByText(description)).toBeVisible()

  // Asigna técnico y agrega un auxiliar.
  await page.getByRole('button', { name: 'Asignar técnico' }).click()
  await page
    .getByLabel('Técnico', { exact: true })
    .selectOption({ label: 'Luis Gómez (ejemplo)' })
  await clickAndWait(page, 'Confirmar', 'ticket_assign_technician')

  await page.getByRole('button', { name: 'Más acciones' }).click()
  await page.getByRole('menuitem', { name: 'Agregar auxiliar' }).click()
  await page
    .getByLabel('Técnico', { exact: true })
    .selectOption({ label: 'Marta Ruiz (ejemplo)' })
  await page.getByLabel('Motivo').selectOption({ index: 1 })
  await clickAndWait(page, 'Confirmar', 'ticket_add_auxiliary')
  await expect(page.getByText('Marta Ruiz (ejemplo) · Auxiliar')).toBeVisible()

  // Reasigna a otro equipo (acción secundaria, dentro del menú).
  await page.getByRole('button', { name: 'Más acciones' }).click()
  await page.getByRole('menuitem', { name: 'Reasignar supervisor' }).click()
  await page.getByLabel('Equipo').selectOption({ label: 'Seguridad (ejemplo)' })
  await page.getByLabel('Motivo').selectOption({ index: 1 })
  await clickAndWait(page, 'Confirmar', 'ticket_assign_supervisor')
  await expect(
    page.getByText('Registrado', { exact: true }).first(),
  ).toBeVisible()
})
