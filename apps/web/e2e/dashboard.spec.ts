import { expect, test } from '@playwright/test'
import { signIn } from './fixtures.js'

test('el panel prioriza bandejas accionables y enlaza sus cifras', async ({
  page,
}) => {
  await signIn(page, 'demo.admin')

  const panel = page.locator('#main-content')
  await expect(panel.getByRole('link', { name: 'Bandeja' })).toBeVisible()
  await expect(
    panel.getByRole('link', { name: /Ofertas pendientes/ }),
  ).toBeVisible()
  await expect(panel.getByText('Tiquets del equipo')).toBeVisible()
  await expect(panel.getByText('Actividad reciente')).toBeVisible()

  await panel.getByRole('link', { name: /En pausa/ }).click()
  await expect(page).toHaveURL(/status=paused/)
})
