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
  await expect(
    page.getByRole('button', { name: 'Menú de usuario' }),
  ).toBeVisible()
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
  await expect(page.getByText('Tiquets por mes')).toBeVisible()

  await expect(page).toHaveScreenshot('metricas.png', {
    fullPage: true,
    mask: [
      page.locator('svg.recharts-surface'),
      page.locator('table').filter({ hasText: 'Folio' }),
    ],
  })
  await page.getByRole('tab', { name: 'Distribución' }).click()
  await expect(
    page.getByRole('heading', { name: 'Distribución' }),
  ).toBeVisible()
  await expect(page).toHaveScreenshot('distribucion.png', {
    fullPage: true,
    mask: [page.locator('svg.recharts-surface')],
  })
  await page
    .getByRole('combobox', { name: 'Ver por' })
    .selectOption({ label: 'Problema' })
  await expect(
    page.getByRole('img', {
      name: 'Categoría → Subcategoría → Problema',
    }),
  ).toBeVisible()
  await expect(page).toHaveScreenshot('distribucion-jerarquia.png', {
    fullPage: true,
  })
})

test('métricas: tiempos, calidad y equipo', async ({ page }) => {
  await signIn(page, 'demo.admin')
  await page
    .getByRole('navigation', { name: 'Navegación principal' })
    .getByRole('link', { name: 'Métricas' })
    .click()

  await page.getByRole('tab', { name: 'Tiempos' }).click()
  await expect(page.getByText('Ciclo medio')).toBeVisible()
  await expect(page).toHaveScreenshot('tiempos.png', {
    fullPage: true,
    mask: [page.locator('svg.recharts-surface')],
  })

  await page.getByRole('tab', { name: 'Calidad' }).click()
  await expect(page.getByRole('heading', { name: 'Duplicados' })).toBeVisible()
  await expect(page).toHaveScreenshot('calidad.png', {
    fullPage: true,
    mask: [page.locator('svg.recharts-surface')],
  })

  await page.getByRole('tab', { name: 'Equipo' }).click()
  await expect(page.getByText('Resumen por equipo')).toBeVisible()
  await expect(page).toHaveScreenshot('equipo.png', { fullPage: true })

  await page.getByRole('button', { name: 'Supervisores' }).click()
  await expect(page.getByText('Ruteo y toma')).toBeVisible()
  await expect(page).toHaveScreenshot('supervisores.png', { fullPage: true })
})

test('métricas en escritorio ancho', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await signIn(page, 'demo.admin')
  await page
    .getByRole('navigation', { name: 'Navegación principal' })
    .getByRole('link', { name: 'Métricas' })
    .click()
  await expect(page.getByRole('heading', { name: 'Métricas' })).toBeVisible()
  await expect(page.getByText('Tiquets por mes')).toBeVisible()

  await expect(page).toHaveScreenshot('metricas-escritorio.png', {
    fullPage: true,
    mask: [
      page.locator('svg.recharts-surface'),
      page.locator('table').filter({ hasText: 'Folio' }),
    ],
  })
})

test('métricas en móvil', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await signIn(page, 'demo.admin')
  await page.getByRole('button', { name: 'Más', exact: true }).click()
  await page
    .getByRole('navigation', { name: 'Navegación principal' })
    .getByRole('link', { name: 'Métricas' })
    .click()
  await expect(page.getByRole('heading', { name: 'Métricas' })).toBeVisible()

  await expect(page).toHaveScreenshot('metricas-movil.png', {
    fullPage: true,
    mask: [
      page.locator('svg.recharts-surface'),
      page.locator('table').filter({ hasText: 'Folio' }),
    ],
  })
})

test('detalle de tiquet en móvil', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await signIn(page, 'demo.technician')
  await page.goto('/tickets/de000000-0000-4000-8000-000000000004')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('AX-')
  await expect(page).toHaveScreenshot('detalle-movil.png', {
    mask: [page.locator('time'), page.locator('[data-elapsed]')],
  })
})
