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
  await page.getByLabel('Usuario').pressSequentially(email, { delay: 5 })
  await page
    .getByLabel('Contraseña')
    .pressSequentially(DEMO_PASSWORD, { delay: 5 })
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

  await page.getByRole('button', { name: 'Agregar', exact: true }).click()
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

  await page.getByRole('button', { name: 'Agregar', exact: true }).click()
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

test('@smoke muestra datos derivados y contrae motivos', async ({ page }) => {
  await signIn(page, 'demo.admin')

  await page.goto('/admin/catalogos?catalog=dependencies')
  const dependencies = page.getByRole('table')
  await expect(
    dependencies.getByRole('columnheader', { name: 'Ubicaciones' }),
  ).toBeVisible()
  await expect(
    dependencies.getByRole('columnheader', { name: 'Edificios', exact: true }),
  ).toBeVisible()

  await page.goto('/admin/catalogos?catalog=reasons')
  const reasons = page.getByRole('table')
  const flowTitle = page.getByText('Flujo de pausa')
  await expect(flowTitle).toBeVisible()
  const catalogNav = page.getByRole('navigation', { name: 'Catálogos' })
  const navBox = await catalogNav.boundingBox()
  const flowBox = await flowTitle.boundingBox()
  expect(navBox && flowBox).toBeTruthy()
  if (navBox && flowBox) {
    expect(flowBox.x).toBeGreaterThanOrEqual(navBox.x + navBox.width)
  }
  const search = page.getByRole('textbox', { name: 'Buscar…', exact: true })
  await search.fill('En compra externa o cotización')
  await expect(
    reasons.getByText('En compra externa o cotización'),
  ).toBeVisible()
  await search.fill('')
  await expect(
    reasons.getByText('Falta de material', { exact: true }).first(),
  ).toBeVisible()

  await page
    .getByRole('button', { name: 'Contraer: Falta de material' })
    .click()
  await expect(reasons.getByText('En compra externa o cotización')).toHaveCount(
    0,
  )
})

test('@smoke ofrece orden y jerarquía en pantalla angosta', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await signIn(page, 'demo.admin')
  await page.goto('/admin/catalogos?catalog=reasons')

  const sort = page.getByLabel('Ordenar por')
  await expect(sort).toBeVisible()
  await expect(sort.getByRole('option', { name: 'Nombre' })).toHaveCount(1)
  await sort.selectOption('Nombre')
  await expect(page.getByRole('button', { name: 'Descendente' })).toBeVisible()
  await expect(
    page.getByText('Falta de material', { exact: true }).first(),
  ).toBeVisible()
})

test('@smoke crea motivos activos con subestados del mismo uso', async ({
  page,
}) => {
  const name = `Pausa E2E ${crypto.randomUUID().slice(0, 8)}`
  await signIn(page, 'demo.admin')
  await page.goto('/admin/catalogos?catalog=reasons')
  await expect(
    page.getByRole('heading', { name: 'Motivos', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Agregar', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Uso', { exact: true }).selectOption('pause')
  await dialog.getByLabel('Nombre', { exact: true }).fill(name)
  await dialog.getByLabel('Clasificación de reloj').selectOption('counted')
  await expect(
    dialog.getByRole('checkbox', { name: 'Activo', exact: true }),
  ).toBeChecked()
  await dialog.getByRole('button', { name: 'Guardar' }).click()
  await expect(dialog).not.toBeVisible()
  await page.getByRole('button', { name: 'Agregar', exact: true }).click()
  await dialog.getByLabel('Uso', { exact: true }).selectOption('pause')
  await dialog.getByLabel('Nombre', { exact: true }).fill(`${name} disponible`)
  await dialog.getByLabel('Motivo padre').selectOption({ label: name })
  await dialog.getByLabel('Clasificación de reloj').selectOption('counted')
  await expect(
    dialog
      .getByLabel('Motivo padre')
      .locator('option', { hasText: 'A petición del solicitante' }),
  ).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Guardar' }).click()
  await expect(dialog).not.toBeVisible()
  await page.getByRole('textbox', { name: 'Buscar…', exact: true }).fill(name)
  await expect(
    page.getByRole('table').getByText(`${name} disponible`),
  ).toBeVisible()
})

test('@smoke elimina un registro sin uso y bloquea el que está en uso', async ({
  page,
}) => {
  const suffix = crypto.randomUUID().slice(0, 8)
  const building = `Edificio E2E ${suffix}`
  const location = `Ubicación E2E ${suffix}`
  await signIn(page, 'demo.admin')

  await page.goto('/admin/catalogos?catalog=buildings')
  await page.getByRole('button', { name: 'Agregar', exact: true }).click()
  await page.getByLabel('Nombre').fill(building)
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('table').getByText(building)).toBeVisible()

  await page.goto('/admin/catalogos?catalog=locations')
  await page.getByRole('button', { name: 'Agregar', exact: true }).click()
  const locationDialog = page.getByRole('dialog')
  await locationDialog.getByLabel('Edificio').selectOption({ label: building })
  await locationDialog.getByLabel('Nombre').fill(location)
  await locationDialog.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('table').getByText(location)).toBeVisible()

  await page.goto('/admin/catalogos?catalog=buildings')
  await page.getByRole('button', { name: `Editar: ${building}` }).click()
  await page.getByRole('menuitem', { name: 'Eliminar' }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Eliminar' })
    .click()
  await expect(page.getByText(/Tiene ubicaciones/)).toBeVisible()
  await expect(page.getByRole('table').getByText(building)).toBeVisible()

  await page.goto('/admin/catalogos?catalog=locations')
  await page.getByRole('button', { name: `Editar: ${location}` }).click()
  await page.getByRole('menuitem', { name: 'Eliminar' }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Eliminar' })
    .click()
  await expect(page.getByRole('table').getByText(location)).toHaveCount(0)

  await page.goto('/admin/catalogos?catalog=buildings')
  await page.getByRole('button', { name: `Editar: ${building}` }).click()
  await page.getByRole('menuitem', { name: 'Eliminar' }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Eliminar' })
    .click()
  await expect(page.getByRole('table').getByText(building)).toHaveCount(0)
})
