import { expect, test } from '@playwright/test'
import { openMetrics } from './metrics-session.js'

test('el resumen muestra los indicadores y el bento vigente', async ({
  page,
}) => {
  await openMetrics(page)

  const summary = page.getByRole('tabpanel')
  const health = summary.getByRole('region', { name: 'Salud del periodo' })

  for (const label of [
    'Total de tiquets',
    'Tiquets activos',
    'Sin asignar',
    'En pausa',
    'Cerrados',
    'Cumplimiento SLA',
    'Satisfacción',
    '1ª resolución',
  ]) {
    await expect(health.getByText(label, { exact: true })).toBeVisible()
  }

  await expect(
    summary.getByRole('heading', { name: 'Estado actual' }),
  ).toBeVisible()
  await expect(summary.getByText('Ciclo y fases')).toHaveCount(0)
  await expect(summary.getByText('Detalle por estado')).toHaveCount(0)
})

test('las tablas por equipo muestran el mismo promedio con los tres relojes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await openMetrics(page)
  const panel = page.getByRole('tabpanel')
  for (const clock of ['Continuo', 'Laboral', 'Extra']) {
    await page.getByRole('button', { name: clock, exact: true }).click()
    await page.getByRole('tab', { name: 'Equipo', exact: true }).click()
    const teamRow = panel.getByRole('row').nth(1)
    const team = await teamRow.getByRole('cell').first().innerText()
    const active = await teamRow.getByRole('cell').nth(3).innerText()
    const total = await teamRow.getByRole('cell').nth(4).innerText()

    await page.getByRole('tab', { name: 'Distribución' }).click()
    await panel.getByRole('combobox', { name: 'Ver por' }).selectOption('team')
    const distributionRow = panel.getByRole('row').filter({
      has: page.getByText(team, { exact: true }),
    })
    const headers = await panel.locator('thead th').allTextContents()
    for (const [name, value] of [
      ['Trabajo activo promedio', active],
      ['Tiempo total promedio', total],
    ] as const) {
      const index = headers.findIndex((header) => header.trim() === name)
      expect(index).toBeGreaterThanOrEqual(0)
      await expect(distributionRow.locator('td').nth(index)).toHaveText(value)
    }
  }
})

test('el SLA indica el reloj efectivo al entrar y al cambiar la selección', async ({
  page,
}) => {
  const initialSla = page.waitForRequest((request) => {
    const url = new URL(request.url())
    return (
      url.pathname === '/api/metrics/sla' &&
      url.searchParams.get('clock') === 'calendar'
    )
  })
  await openMetrics(page)
  await initialSla
  await expect(page.getByText('Reloj de SLA · Continuo')).toBeVisible()

  await page.getByRole('button', { name: 'Laboral', exact: true }).click()
  await expect(page.getByText('Reloj de SLA · Laboral')).toBeVisible()

  await page.getByRole('button', { name: 'Extra', exact: true }).click()
  const label = page.getByText(
    /Reloj de SLA · (Continuo|Laboral) \(instancia\)/,
  )
  await expect(label).toBeVisible()
  const effectiveClock = (await label.innerText()).includes('Laboral')
    ? 'laboral'
    : 'calendar'

  const sla = page
    .locator('section')
    .filter({
      has: page.getByRole('heading', { name: 'Tiempos objetivo (SLA)' }),
    })
    .last()
  await sla
    .getByRole('button', { name: /^Tiempos objetivo \(SLA\) · / })
    .first()
    .click()
  await expect(
    page
      .getByRole('dialog')
      .getByRole('link', { name: 'Abrir en la lista completa' }),
  ).toHaveAttribute('href', new RegExp(`slaClock=${effectiveClock}`))
})
