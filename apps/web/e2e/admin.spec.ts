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

test('el administrador crea un equipo desde la administración', async ({
  page,
}) => {
  const name = `Equipo E2E ${crypto.randomUUID().slice(0, 8)}`
  await signIn(page, 'admin@axia.test')

  await page.goto('/admin/catalogos')
  await expect(page.getByRole('heading', { name: 'Equipos' })).toBeVisible()

  await page.getByRole('button', { name: 'Agregar' }).click()
  await page.getByLabel('Nombre').fill(name)
  await page.getByRole('button', { name: 'Guardar' }).click()

  await expect(page.getByText(name)).toBeVisible()
})

test('el administrador descarga la plantilla de catálogos', async ({
  page,
}) => {
  await signIn(page, 'admin@axia.test')

  await page.goto('/admin/catalogos')
  await page.getByRole('button', { name: 'Importar archivo' }).click()
  await expect(
    page.getByRole('button', { name: 'Descargar plantilla' }),
  ).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Descargar plantilla' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toContain('.xlsx')
})
