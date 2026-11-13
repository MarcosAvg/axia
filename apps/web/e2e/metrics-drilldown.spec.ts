import { expect, test } from '@playwright/test'
import { openMetrics } from './metrics-session.js'

test('el resumen abre el desglose de tiquets de un indicador', async ({
  page,
}) => {
  await openMetrics(page)
  await page.getByTitle('Ver tiquets · Total de tiquets').click()

  const sheet = page.getByRole('dialog')
  await expect(
    sheet.getByRole('heading', { name: 'Ver tiquets · Total de tiquets' }),
  ).toBeVisible()
  await expect(
    sheet.getByRole('link', { name: 'Abrir en la lista completa' }),
  ).toBeVisible()

  await sheet.getByRole('button', { name: 'Siguiente' }).click()
  await expect(sheet.getByText(/^Página 2 de/)).toBeVisible()

  await sheet.locator('a[href^="/tickets/"]').first().click()
  await page.waitForURL(/\/tickets\/[0-9a-f-]+/)
})

test('la tabla de distribución abre un subconjunto de tiquets', async ({
  page,
}) => {
  await openMetrics(page)
  await page.getByRole('tab', { name: 'Tiempos' }).click()
  await page
    .getByRole('combobox', { name: 'Elegir la medida de tiempos' })
    .selectOption({ label: 'Mediana' })

  await page
    .getByRole('button', { name: 'Ver tiquets: Trabajo activo' })
    .click()
  await page.getByRole('menuitem', { name: /Por encima del P90/ }).click()

  const sheet = page.getByRole('dialog')
  await expect(
    sheet.getByRole('heading', { name: /Por encima del P90/ }),
  ).toBeVisible()
  await expect(
    sheet.getByRole('link', { name: 'Abrir en la lista completa' }),
  ).toHaveAttribute('href', /phaseMinutesMin=/)
})

test('la lista completa avisa de los filtros heredados', async ({ page }) => {
  await openMetrics(page)
  await page.getByRole('tab', { name: 'Calidad' }).click()
  await page.getByRole('button', { name: 'Pausas', exact: true }).click()

  const reason = page
    .getByRole('tabpanel')
    .getByTitle(/^Ver tiquets · /)
    .first()
  await reason.click()
  const sheet = page.getByRole('dialog')
  await sheet.getByRole('link', { name: 'Abrir en la lista completa' }).click()

  await expect(
    page.getByText('Esta lista incluye filtros aplicados desde Métricas.'),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Quitar filtros de Métricas' }),
  ).toBeVisible()
})
