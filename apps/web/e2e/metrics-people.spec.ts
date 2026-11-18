import { expect, test, type Page } from '@playwright/test'
import { openMetrics } from './metrics-session.js'

function card(page: Page, heading: string) {
  return page.locator('[data-slot="card"]').filter({
    has: page.getByRole('heading', { name: heading }),
  })
}

test('la participación en Tiempos coincide con la carga del Equipo en cada reloj', async ({
  page,
}) => {
  await openMetrics(page)
  for (const clock of ['Continuo', 'Laboral', 'Extra']) {
    await page.getByRole('button', { name: clock, exact: true }).click()
    await page.getByRole('tab', { name: 'Equipo', exact: true }).click()
    await page.getByRole('button', { name: 'Técnicos', exact: true }).click()
    const load = card(page, 'Carga por técnico').getByRole('row').nth(1)
    const name = await load.locator('td').first().innerText()
    const tickets = await load.locator('td').nth(1).innerText()
    const participation = await load.locator('td').nth(4).innerText()

    await page.getByRole('tab', { name: 'Tiempos', exact: true }).click()
    const row = card(page, 'Técnicos')
      .getByRole('row')
      .filter({
        has: page.getByRole('cell', { name, exact: true }),
      })
    await expect(row.locator('td').nth(1)).toHaveText(tickets)
    await expect(row.locator('td')).toHaveCount(6)
    await expect(row.locator('td').nth(3)).toHaveText(participation)
    const ledTickets = await row.locator('td').nth(4).innerText()
    const avgTotal = await row.locator('td').nth(5).innerText()
    await row.getByRole('button', { name, exact: true }).click()
    const detail = page.getByRole('dialog', { name })
    await expect(
      detail.getByRole('heading', {
        name: 'Tiempos de los tiquets que lideró',
      }),
    ).toBeVisible()
    await expect(detail.getByText(`Modo de tiempo · ${clock}`)).toBeVisible()
    await expect(
      detail.getByText(`Tiquets liderados incluidos · ${ledTickets}`),
    ).toBeVisible()
    await expect(
      detail
        .locator('dl > div')
        .filter({
          has: page.getByText('Tiempo total promedio', { exact: true }),
        })
        .locator('dd'),
    ).toHaveText(avgTotal)
    await expect(
      detail.getByRole('heading', { name, exact: true }),
    ).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(detail).toHaveCount(0)
  }
})

test('Solicitantes conserva sus acumulados al elegir otra Medida', async ({
  page,
}) => {
  await openMetrics(page)
  await page.getByRole('tab', { name: 'Tiempos', exact: true }).click()
  await page.getByRole('button', { name: 'Solicitantes', exact: true }).click()
  const table = card(page, 'Tiempos por solicitante').getByRole('table')
  await expect(
    table.getByRole('columnheader', { name: /Espera de validación acumulada/ }),
  ).toBeVisible()
  await expect(
    table.getByRole('columnheader', {
      name: /Tiempo en reclamación acumulado/,
    }),
  ).toBeVisible()
  const firstRow = table.getByRole('row').nth(1)
  const values = await firstRow.innerText()

  await page
    .getByRole('combobox', { name: 'Elegir la medida de tiempos' })
    .selectOption({ label: 'Mediana' })
  await expect(firstRow).toHaveText(values, { useInnerText: true })
})
