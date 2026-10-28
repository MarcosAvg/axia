import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const DEMO_PASSWORD = process.env.AXIA_DEMO_PASSWORD ?? 'E2ePassword123!'

async function signIn(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Usuario').fill(email)
  await page.getByLabel('Contraseña').fill(DEMO_PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
}

test('el administrador abre las métricas', async ({ page }) => {
  await signIn(page, 'demo.admin')
  await expect(page.getByText(/Hola, Administrador Demo/)).toBeVisible()

  await page
    .getByRole('navigation', { name: 'Navegación principal' })
    .getByRole('link', { name: 'Métricas' })
    .click()
  await expect(page.getByRole('heading', { name: 'Métricas' })).toBeVisible()
  await expect(
    page.getByText('No se pudieron cargar las métricas.'),
  ).toHaveCount(0)
})

test('explora dimensiones y filtra por edificio', async ({ page }) => {
  await signIn(page, 'demo.admin')
  await page
    .getByRole('navigation', { name: 'Navegación principal' })
    .getByRole('link', { name: 'Métricas' })
    .click()

  await page.getByRole('tab', { name: 'Distribución' }).click()
  await page
    .getByRole('combobox', { name: 'Ver por' })
    .selectOption({ label: 'Solicitante' })
  await expect(
    page.getByRole('columnheader', { name: 'Agrupación' }),
  ).toBeVisible()

  await page
    .getByRole('combobox', { name: 'Ver por' })
    .selectOption({ label: 'Problema' })
  await expect(
    page.getByRole('img', {
      name: 'Categoría → Subcategoría → Problema',
    }),
  ).toBeVisible()

  await expect(page.locator('#metrics-catalog-filters')).toHaveCount(0)
  await page.getByRole('button', { name: 'Filtros' }).click()
  await page
    .getByRole('combobox', { name: 'Edificio' })
    .selectOption({ label: 'Edificio Central' })
  await page.keyboard.press('Escape')
  await expect(
    page.getByRole('button', { name: 'Quitar Edificio Central' }),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Quitar Edificio Central' }).click()
  await expect(
    page.getByRole('button', { name: 'Quitar Edificio Central' }),
  ).toHaveCount(0)
})

test('alterna la vista de tiempos entre promedio y acumulado', async ({
  page,
}) => {
  await signIn(page, 'demo.admin')
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

test('en móvil las métricas se navegan por pestañas', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await signIn(page, 'demo.admin')
  await expect(page.getByText(/Hola, Administrador Demo/)).toBeVisible()
  await page.goto('/metricas')

  await page.getByRole('tab', { name: 'Calidad' }).click()
  await expect(page.getByText('Detalle por agrupación')).toBeVisible()
})

test('el equipo cambia entre equipos, supervisores y técnicos', async ({
  page,
}) => {
  await signIn(page, 'demo.admin')
  await page
    .getByRole('navigation', { name: 'Navegación principal' })
    .getByRole('link', { name: 'Métricas' })
    .click()
  await page.getByRole('tab', { name: 'Equipo' }).click()
  await expect(page.getByText('Resumen por equipo')).toBeVisible()
  await page.getByRole('button', { name: 'Supervisores' }).click()
  await expect(page.getByText('Ruteo y toma')).toBeVisible()
  await page.getByRole('button', { name: 'Técnicos' }).click()
  await expect(page.getByText('Carga por técnico')).toBeVisible()
})

test('cambia el periodo desde el popover', async ({ page }) => {
  await signIn(page, 'demo.admin')
  await page
    .getByRole('navigation', { name: 'Navegación principal' })
    .getByRole('link', { name: 'Métricas' })
    .click()

  await page.getByRole('button', { name: 'Periodo' }).click()
  await page.getByRole('button', { name: '7 días' }).click()
  await expect(page.getByRole('button', { name: 'Periodo' })).toContainText(
    '7 días',
  )
})
