import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const PASSWORD = process.env.AXIA_DEMO_PASSWORD ?? 'E2ePassword123!'
const NEW_PASSWORD = 'E2eNuevaPassword123!'
const PROFILE_PASSWORD = 'E2ePerfilPassword123!'

async function submitLogin(page: Page, username: string, password: string) {
  await page.goto('/login')
  await page.getByLabel('Usuario').fill(username)
  await page.getByLabel('Contraseña').fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()
}

async function signIn(page: Page, username: string, password = PASSWORD) {
  await submitLogin(page, username, password)
  await expect(
    page.getByRole('button', { name: 'Menú de usuario' }),
  ).toBeVisible()
}

async function temporaryPasswordFromDialog(page: Page): Promise<string> {
  const password = (
    await page.locator('[role=dialog] code').textContent()
  )?.trim()
  if (!password) throw new Error('No se generó la contraseña temporal')
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Cerrar' })
    .last()
    .click()
  return password
}

async function createAccount(
  page: Page,
  username: string,
  fullName: string,
): Promise<string> {
  await page.getByRole('button', { name: 'Nuevo usuario' }).click()
  await page.locator('#new-user-username').fill(username)
  await page.locator('#new-user-full-name').fill(fullName)
  await page.getByLabel('Solicitante').check()
  await page.getByRole('button', { name: 'Crear cuenta' }).click()
  await expect(page.getByText('Cuenta creada')).toBeVisible()
  return temporaryPasswordFromDialog(page)
}

async function resetAccount(page: Page, fullName: string): Promise<string> {
  await page.getByRole('button', { name: `Editar roles: ${fullName}` }).click()
  await page.getByRole('menuitem', { name: 'Restablecer contraseña' }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Restablecer contraseña' })
    .click()
  await expect(
    page.getByRole('dialog').getByText('Contraseña restablecida'),
  ).toBeVisible()
  return temporaryPasswordFromDialog(page)
}

test('elimina una cuenta nueva', async ({ page }) => {
  const suffix = crypto.randomUUID().slice(0, 8)
  const username = `e2e.delete.${suffix}`
  const fullName = `Usuario eliminado ${suffix}`

  await signIn(page, 'demo.admin')
  await page.goto('/admin/usuarios')
  await createAccount(page, username, fullName)
  await expect(page.getByRole('table').getByText(fullName)).toBeVisible()

  await page.getByRole('button', { name: `Editar roles: ${fullName}` }).click()
  await page.getByRole('menuitem', { name: 'Eliminar cuenta' }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Eliminar' })
    .click()

  await expect(page.getByRole('table').getByText(fullName)).toHaveCount(0)
})

test('crea una cuenta, restablece su contraseña y la cambia desde el perfil', async ({
  page,
}) => {
  const suffix = crypto.randomUUID().slice(0, 8)
  const username = `e2e.${suffix}`
  const fullName = `Usuario E2E ${suffix}`

  await signIn(page, 'demo.admin')
  await page.goto('/admin/usuarios')
  await createAccount(page, username, fullName)
  await expect(page.getByRole('table').getByText(fullName)).toBeVisible()
  const resetPassword = await resetAccount(page, fullName)

  await page.getByRole('button', { name: /Menú de usuario/ }).click()
  await page.getByRole('menuitem', { name: 'Cerrar sesión' }).click()
  await submitLogin(page, username, resetPassword)
  await expect(page.getByText('Cambia tu contraseña')).toBeVisible()

  await page.locator('#current-password').fill(resetPassword)
  await page.locator('#new-password').fill(NEW_PASSWORD)
  await page.locator('#confirm-password').fill(NEW_PASSWORD)
  await page.getByRole('button', { name: 'Guardar contraseña' }).click()
  await expect(
    page.getByRole('button', { name: /Menú de usuario/ }),
  ).toBeVisible()

  await page.goto('/perfil')
  await page.locator('#current-password').fill(NEW_PASSWORD)
  await page.locator('#new-password').fill(PROFILE_PASSWORD)
  await page.locator('#confirm-password').fill(PROFILE_PASSWORD)
  await page.getByRole('button', { name: 'Guardar contraseña' }).click()
  await expect(page.getByText('Tu contraseña se actualizó.')).toBeVisible()

  await page.getByRole('button', { name: /Menú de usuario/ }).click()
  await page.getByRole('menuitem', { name: 'Cerrar sesión' }).click()
  await signIn(page, username, PROFILE_PASSWORD)
  await expect(
    page.getByRole('button', { name: /Menú de usuario/ }),
  ).toBeVisible()
})
