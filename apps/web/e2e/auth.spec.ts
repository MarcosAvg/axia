import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

// Usuarios de la semilla demo (solo entorno local).
const DEMO_PASSWORD = process.env.AXIA_DEMO_PASSWORD ?? 'E2ePassword123!'

async function signIn(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Usuario').fill(email)
  await page.getByLabel('Contraseña').fill(DEMO_PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
}

test('sin sesión, la raíz redirige al acceso', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
})

test('@smoke un administrador inicia sesión y ve el panel', async ({
  page,
}) => {
  await signIn(page, 'demo.admin')

  await expect(page.getByText(/Hola, Administrador Demo/)).toBeVisible()
  await expect(page.getByRole('link', { name: 'Catálogos' })).toBeVisible()
})

test('cerrar sesión vuelve al acceso', async ({ page }) => {
  await signIn(page, 'demo.admin')
  await expect(page.getByText(/Hola, Administrador Demo/)).toBeVisible()

  await page.getByRole('button', { name: 'Menú de usuario' }).click()
  await page.getByRole('menuitem', { name: 'Cerrar sesión' }).click()

  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
})

test('un supervisor no entra a la administración', async ({ page }) => {
  await signIn(page, 'demo.supervisor')
  await expect(page.getByText(/Hola, Supervisora Demo/)).toBeVisible()

  await page.goto('/admin')

  await expect(page.getByText('Sin acceso')).toBeVisible()
})
