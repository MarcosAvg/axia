import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const DEMO_PASSWORD = 'AxiaDemo2026!'

async function signIn(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña').fill(DEMO_PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
}

test('el administrador abre las métricas', async ({ page }) => {
  await signIn(page, 'admin@axia.test')
  await expect(page.getByText(/Hola, Rosa Delgado/)).toBeVisible()

  await page
    .getByRole('navigation', { name: 'Navegación principal' })
    .getByRole('link', { name: 'Métricas' })
    .click()
  await expect(page.getByRole('heading', { name: 'Métricas' })).toBeVisible()
  await expect(
    page.getByText('No se pudieron cargar las métricas.'),
  ).toHaveCount(0)
})

test('alterna la vista de tiempos entre promedio y acumulado', async ({
  page,
}) => {
  await signIn(page, 'admin@axia.test')
  await page
    .getByRole('navigation', { name: 'Navegación principal' })
    .getByRole('link', { name: 'Métricas' })
    .click()
  await page.getByRole('tab', { name: 'Tiempos' }).click()

  await expect(
    page.getByText('Trabajo activo', { exact: true }).first(),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Acumulado' }).click()
  await expect(
    page.getByText('Trabajo activo (acumulado)').first(),
  ).toBeVisible()
})
