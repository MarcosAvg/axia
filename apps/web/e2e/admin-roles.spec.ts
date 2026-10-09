import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const DEMO_PASSWORD = 'AxiaDemo2026!'

async function signIn(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña').fill(DEMO_PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(
    page.getByRole('button', { name: 'Menú de usuario' }),
  ).toBeVisible()
}

test('el administrador crea un rol en la administración', async ({ page }) => {
  const label = `Rol E2E ${crypto.randomUUID().slice(0, 8)}`
  await signIn(page, 'admin@axia.test')

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
