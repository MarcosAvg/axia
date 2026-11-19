import { expect, test } from '@playwright/test'
import { signIn } from './fixtures.js'

test('el administrador crea un rol en la administración', async ({ page }) => {
  const label = `Rol E2E ${crypto.randomUUID().slice(0, 8)}`
  await signIn(page, 'demo.admin')

  await page.goto('/admin/roles')
  await page.getByRole('button', { name: 'Nuevo rol' }).click()
  await expect(page.locator('#role-label')).toBeVisible()

  await page
    .locator('#role-name')
    .fill(`rol_${crypto.randomUUID().slice(0, 8)}`)
  await page.locator('#role-label').fill(label)
  await page.getByRole('button', { name: 'Agregar' }).click()

  await expect(page.getByRole('button', { name: label })).toBeVisible()
})
