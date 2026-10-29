import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const PASSWORD = process.env.AXIA_DEMO_PASSWORD ?? 'E2ePassword123!'

async function signIn(page: Page, username: string) {
  await page.goto('/login')
  await page.getByLabel('Usuario').fill(username)
  await page.getByLabel('Contraseña').fill(PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(
    page.getByRole('button', { name: 'Menú de usuario' }),
  ).toBeVisible()
}

test('el panel móvil del técnico prioriza su trabajo y oculta análisis', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await signIn(page, 'demo.technician')

  await expect(
    page.getByRole('link', { name: 'Mi trabajo' }).first(),
  ).toBeVisible()
  await expect(page.getByText('Tiquets por mes')).toHaveCount(0)
})

test('el panel móvil del solicitante no muestra análisis', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await signIn(page, 'demo.requester')

  await expect(
    page.getByRole('link', { name: 'Nuevo tiquet' }).first(),
  ).toBeVisible()
  await expect(page.getByText('Tiquets por mes')).toHaveCount(0)
})

test('el panel móvil del administrador conserva el análisis', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await signIn(page, 'demo.admin')

  await expect(page.getByText('Tiquets por mes')).toBeVisible()
})
