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

test('la tabla de distribución abre e invierte un subconjunto', async ({
  page,
}) => {
  await openMetrics(page)
  await page.getByRole('tab', { name: 'Tiempos' }).click()
  await page
    .getByRole('combobox', { name: 'Elegir la medida de tiempos' })
    .selectOption({ label: 'Mediana' })

  const row = page.locator('tr').filter({ hasText: 'Trabajo activo' })
  await row.getByRole('button', { name: /Hasta el P90/ }).click()

  const sheet = page.getByRole('dialog')
  await expect(
    sheet.getByRole('heading', { name: /Hasta el P90/ }),
  ).toBeVisible()
  await expect(
    sheet.getByRole('link', { name: 'Abrir en la lista completa' }),
  ).toHaveAttribute('href', /phaseMinutesMax=/)

  await sheet.getByRole('button', { name: 'Invertir' }).click()
  await expect(
    sheet.getByRole('heading', { name: /Por encima del P90/ }),
  ).toBeVisible()
  await expect(
    sheet.getByRole('link', { name: 'Abrir en la lista completa' }),
  ).toHaveAttribute('href', /phaseMinutesAbove=/)
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
