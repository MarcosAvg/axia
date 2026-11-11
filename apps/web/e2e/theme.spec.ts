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

test('el selector aplica los temas Ámbar y Rosa', async ({ page }) => {
  await signIn(page)
  const toggle = page.getByRole('button', { name: 'Cambiar tema y modo' })

  await toggle.click()
  await page.getByRole('menuitemradio', { name: 'Ámbar' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'amber')

  await toggle.click()
  await page.getByRole('menuitemradio', { name: 'Rosa' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'rose')
})
