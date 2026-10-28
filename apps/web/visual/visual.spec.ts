import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

// Regresión visual (opt-in): `pnpm test:visual`. Se enmascaran las gráficas y
// los bloques con datos relativos a la fecha para que las capturas sean estables.

const DEMO_PASSWORD = process.env.AXIA_DEMO_PASSWORD ?? 'E2ePassword123!'

async function signIn(page: Page, username: string) {
  await page.goto('/login')
  await page.getByLabel('Usuario').fill(username)
  await page.getByLabel('Contraseña').fill(DEMO_PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
}

test('acceso', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
  await expect(page).toHaveScreenshot('acceso.png', { fullPage: true })
})

test('panel móvil', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await signIn(page, 'demo.admin')
  await expect(page.getByText(/Hola, Administrador Demo/)).toBeVisible()
  await expect(page).toHaveScreenshot('panel-movil.png', {
    fullPage: true,
    mask: [
      page.locator('time'),
      page.locator('svg.recharts-surface'),
      page.locator('[data-elapsed]'),
    ],
  })
})

test('panel y métricas', async ({ page }) => {
  await signIn(page, 'demo.admin')
  await expect(page.getByText(/Hola, Administrador Demo/)).toBeVisible()
  await expect(page).toHaveScreenshot('panel.png', {
    fullPage: true,
    mask: [
      page.locator('time'),
      page.locator('svg.recharts-surface'),
      page.locator('[data-elapsed]'),
    ],
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
      page.locator('table').filter({ hasText: 'Antigüedad' }),
    ],
  })
})

test('métricas móvil', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await signIn(page, 'demo.admin')
  await expect(page.getByText(/Hola, Administrador Demo/)).toBeVisible()
  await page.goto('/metricas')
  await expect(page.getByRole('tab', { name: 'Resumen' })).toBeVisible()
  await page.getByRole('tab', { name: 'Calidad' }).click()
  await expect(page.getByText('Duplicados por dimensión')).toBeVisible()
  await expect(page).toHaveScreenshot('metricas-movil.png', {
    fullPage: true,
    mask: [
      page.locator('svg.recharts-surface'),
      page.locator('table').filter({ hasText: 'Antigüedad' }),
    ],
  })
})
