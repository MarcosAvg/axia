import { expect, test } from '@playwright/test'
import { signIn } from './fixtures.js'

// Usuarios de la semilla demo (solo entorno local).

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
