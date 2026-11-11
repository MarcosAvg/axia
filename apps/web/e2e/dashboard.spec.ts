import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const PASSWORD = process.env.AXIA_DEMO_PASSWORD ?? 'E2ePassword123!'

async function signIn(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Usuario').pressSequentially('demo.admin', { delay: 5 })
  await page.getByLabel('Contraseña').pressSequentially(PASSWORD, { delay: 5 })
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(
    page.getByRole('button', { name: 'Menú de usuario' }),
  ).toBeVisible()
}

test('el panel prioriza bandejas accionables y enlaza sus cifras', async ({
  page,
}) => {
  await signIn(page)

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
