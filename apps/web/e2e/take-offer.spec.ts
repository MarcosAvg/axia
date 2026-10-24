import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const DEMO_PASSWORD = process.env.AXIA_DEMO_PASSWORD ?? 'E2ePassword123!'

async function signIn(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Usuario').fill(email)
  await page.getByLabel('Contraseña').fill(DEMO_PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.getByRole('button', { name: 'Menú de usuario' }).waitFor()
}

async function signOut(page: Page) {
  await page.getByRole('button', { name: 'Menú de usuario' }).click()
  await page.getByRole('menuitem', { name: 'Cerrar sesión' }).click()
}

test('@smoke el supervisor toma la oferta al pulsar Tomar tiquet', async ({
  page,
}) => {
  const description = `Toma E2E ${crypto.randomUUID()}`
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
  const ticketUrl = page.url()

  await signOut(page)
  await signIn(page, 'demo.supervisor')
  await page.goto(ticketUrl)

  // La oferta se muestra como una acción explícita; no se toma al abrir.
  await expect(
    page.getByText('Tienes una oferta para este tiquet'),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Tomar tiquet' }).click()
  await expect(
    page.getByText('Tomado por supervisor', { exact: true }).first(),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Asignar técnico' }),
  ).toBeVisible()
})
