import { createRequire } from 'node:module'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const DEMO_PASSWORD = process.env.AXIA_DEMO_PASSWORD ?? 'E2ePassword123!'
const nodeRequire = createRequire(import.meta.url)

/** Deja solo dos hojas para no reescribir todos los catálogos junto al resto de E2E. */
async function trimWorkbook(path: string): Promise<string> {
  const ExcelJS = nodeRequire('exceljs') as typeof import('exceljs')
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(path)
  const dependencies = workbook.getWorksheet('Dependencias')
  expect(dependencies?.getRow(1).values).toEqual(
    expect.arrayContaining(['Nombre', 'Activo', 'Edificio', 'Ubicación']),
  )
  expect(dependencies?.rowCount ?? 0).toBeGreaterThan(1)
  for (const sheet of [...workbook.worksheets]) {
    if (!['Equipos', 'Categorías'].includes(sheet.name)) {
      workbook.removeWorksheet(sheet.id)
    }
  }
  const target = `${path}.trimmed.xlsx`
  await workbook.xlsx.writeFile(target)
  return target
}

async function signIn(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Usuario').fill(email)
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
  await signIn(page, 'demo.admin')

  await page.goto('/admin/catalogos')
  await expect(page.getByRole('heading', { name: 'Equipos' })).toBeVisible()

  await page.getByRole('button', { name: 'Agregar' }).click()
  await page.getByLabel('Nombre').fill(name)
  await page.getByRole('button', { name: 'Guardar' }).click()

  await expect(page.getByRole('table').getByText(name)).toBeVisible()
})

test('@smoke crea una dependencia con ubicación', async ({ page }) => {
  const name = `Dependencia E2E ${crypto.randomUUID().slice(0, 8)}`
  await signIn(page, 'demo.admin')
  await page.goto('/admin/catalogos?catalog=dependencies')
  await expect(
    page.getByRole('heading', { name: 'Dependencias' }),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Agregar' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Nueva dependencia')).toBeVisible()
  await dialog.getByLabel('Nombre').fill(name)
  await dialog.getByRole('checkbox', { name: 'Planta baja' }).first().check()
  await dialog.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Dependencia guardada.')).toBeVisible()
  await expect(page.getByRole('table').getByText(name)).toBeVisible()

  await page.getByRole('button', { name: `Editar: ${name}` }).click()
  await page.getByRole('menuitem', { name: 'Editar' }).click()
  await expect(
    page
      .getByRole('dialog')
      .getByRole('checkbox', { name: 'Planta baja' })
      .first(),
  ).toBeChecked()
})

test('@smoke exporta y reimporta los catálogos sin inválidas', async ({
  page,
}) => {
  await signIn(page, 'demo.admin')
  await page.goto('/admin/catalogos')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar' }).click()
  const path = await (await downloadPromise).path()
  if (!path) throw new Error('La exportación no generó un archivo')

  await page
    .locator('input[type="file"]')
    .setInputFiles(await trimWorkbook(path))
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Importar catálogos')).toBeVisible()
  await dialog.getByRole('button', { name: 'Importar', exact: true }).click()

  await expect(dialog.getByRole('status')).toContainText(
    /0 nuevas, \d+ actualizadas, 0 inválidas, 0 errores/,
    { timeout: 60_000 },
  )
  await expect(dialog.getByText('Sin incidencias.')).toBeVisible()
})
