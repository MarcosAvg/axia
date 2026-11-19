import { expect, test } from '@playwright/test'
import { signIn } from './fixtures.js'

test('el selector aplica los temas Ámbar y Rosa', async ({ page }) => {
  await signIn(page, 'demo.admin')
  const toggle = page.getByRole('button', { name: 'Cambiar tema y modo' })

  await toggle.click()
  await page.getByRole('menuitemradio', { name: 'Ámbar' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'amber')

  await toggle.click()
  await page.getByRole('menuitemradio', { name: 'Rosa' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'rose')
})
