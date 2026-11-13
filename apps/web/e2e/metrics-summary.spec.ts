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
