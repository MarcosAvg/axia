import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

// Regresión visual (opt-in): `pnpm test:visual`. Se enmascaran las gráficas y
// los bloques con datos relativos a la fecha para que las capturas sean estables.

const DEMO_PASSWORD = 'AxiaDemo2026!'

async function signIn(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña').fill(DEMO_PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
}

test('acceso', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
  await expect(page).toHaveScreenshot('acceso.png', { fullPage: true })
})

test('panel y métricas', async ({ page }) => {
  await signIn(page, 'admin@axia.test')
  await expect(page.getByText(/Hola, Rosa Delgado/)).toBeVisible()
  await expect(page).toHaveScreenshot('panel.png', {
    fullPage: true,
    mask: [page.locator('time')],
  })

  await page
    .getByRole('navigation', { name: 'Navegación principal' })
    .getByRole('link', { name: 'Métricas' })
    .click()
  await expect(page.getByRole('heading', { name: 'Métricas' })).toBeVisible()
  await expect(
    page.getByText('No se pudieron cargar las métricas.'),
  ).toHaveCount(0)
  await expect(page.locator('svg.recharts-surface').first()).toBeVisible()

  await expect(page).toHaveScreenshot('metricas.png', {
    fullPage: true,
    mask: [
      page.locator('svg.recharts-surface'),
      page.getByText('Antigüedad de pendientes'),
    ],
  })
})
