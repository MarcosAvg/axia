import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

// Usuarios demo sembrados en supabase/seed.sql (solo entorno local).
const DEMO_PASSWORD = 'AxiaDemo2026!'

async function signIn(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña').fill(DEMO_PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
}

test('sin sesión, la raíz redirige al acceso', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
})

test('un administrador inicia sesión y ve el panel', async ({ page }) => {
  await signIn(page, 'admin@axia.test')

  await expect(page.getByText(/Hola, Admin Demo/)).toBeVisible()
  await expect(page.getByRole('link', { name: 'Catálogos' })).toBeVisible()
})

test('cerrar sesión vuelve al acceso', async ({ page }) => {
  await signIn(page, 'admin@axia.test')
  await expect(page.getByText(/Hola, Admin Demo/)).toBeVisible()

  await page.getByRole('button', { name: 'Menú de usuario' }).click()
  await page.getByRole('menuitem', { name: 'Cerrar sesión' }).click()

  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
})

test('un supervisor no entra a la administración', async ({ page }) => {
  await signIn(page, 'supervisor@axia.test')
  await expect(page.getByText(/Hola, Supervisor Demo/)).toBeVisible()

  await page.goto('/admin')

  await expect(page.getByText('Sin acceso')).toBeVisible()
})
