import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const PASSWORD = process.env.AXIA_DEMO_PASSWORD ?? 'E2ePassword123!'
const TICKET_ID = 'de000000-0000-4000-8000-000000000004'

async function signIn(page: Page, username: string) {
  await page.goto('/login')
  await page.getByLabel('Usuario').pressSequentially(username, { delay: 5 })
  await page.getByLabel('Contraseña').pressSequentially(PASSWORD, { delay: 5 })
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(
    page.getByRole('button', { name: 'Menú de usuario' }),
  ).toBeVisible()
}

test('la barra inferior navega y deja el resto en Más', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await signIn(page, 'demo.technician')

  const tabbar = page.getByRole('navigation', { name: 'Navegación inferior' })
  await expect(tabbar).toBeVisible()
  await expect(tabbar.getByRole('link')).toHaveCount(3)
  await expect(tabbar.getByRole('link', { name: /^Mi trabajo/ })).toBeVisible()

  await tabbar.getByRole('link', { name: /^Tiquets/ }).click()
  await expect(page).toHaveURL(/\/tickets/)
  await expect(tabbar.getByRole('link', { name: /^Tiquets/ })).toHaveAttribute(
    'aria-current',
    'page',
  )

  await tabbar.getByRole('button', { name: 'Más', exact: true }).click()
  const drawer = page.getByRole('dialog')
  await expect(drawer.getByRole('link', { name: 'Mi perfil' })).toBeVisible()
  await expect(
    drawer.getByRole('button', { name: 'Cambiar tema y modo' }),
  ).toBeVisible()
})

test('el administrador cambia Mi trabajo por Métricas', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await signIn(page, 'demo.admin')

  const tabbar = page.getByRole('navigation', { name: 'Navegación inferior' })
  await expect(tabbar.getByRole('link', { name: /^Métricas/ })).toBeVisible()
  await expect(tabbar.getByRole('link', { name: /^Mi trabajo/ })).toHaveCount(0)
})

test('el detalle cambia la barra inferior por la acción fija', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await signIn(page, 'demo.technician')
  await page.goto(`/tickets/${TICKET_ID}`)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('AX-')

  await expect(
    page.getByRole('navigation', { name: 'Navegación inferior' }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Más', exact: true }),
  ).toBeVisible()

  const overflow = await page.evaluate(
    'document.documentElement.scrollWidth - document.documentElement.clientWidth',
  )
  expect(overflow).toBeLessThanOrEqual(1)
})

test('el detalle pausado muestra el motivo y enlaza a evidencias', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await signIn(page, 'demo.technician')
  await page.goto('/mi-trabajo')
  await page.getByRole('link', { name: /^AX-2026-64 Pausado/ }).click()

  await expect(page.getByText('Motivo:', { exact: true })).toBeInViewport()
  await expect(
    page.getByText('Subestado actual:', { exact: true }),
  ).toBeInViewport()
  const shortcut = page.getByRole('link', { name: 'Evidencias', exact: true })
  const evidence = page.getByRole('heading', { name: /^Evidencias/ })
  await shortcut.press('Enter')
  await expect(evidence).toBeInViewport()
  await expect(evidence).toBeFocused()
  await page.getByRole('button', { name: 'Volver', exact: true }).click()
  await expect(page).toHaveURL(/\/mi-trabajo$/)
})

test('el solicitante encuentra Marcar duplicado en el menú táctil', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 })
  await signIn(page, 'demo.requester')
  await page.goto('/tickets/de000000-0000-4000-8000-000000000001')

  const more = page.getByRole('button', { name: 'Más', exact: true })
  await expect(more).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Marcar duplicado', exact: true }),
  ).toHaveCount(0)
  await more.click()
  const duplicate = page.getByRole('menuitem', { name: 'Marcar duplicado' })
  await expect(duplicate).toBeVisible()
  await expect
    .poll(async () => (await duplicate.boundingBox())?.height ?? 0)
    .toBeGreaterThanOrEqual(44)
})

test('volver desde el detalle horizontal conserva Mi trabajo', async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 })
  await signIn(page, 'demo.technician')
  await page.goto('/mi-trabajo')
  const ticket = page.getByRole('link', { name: /^AX-2026-4 En proceso/ })
  await ticket.click()
  await page.getByRole('button', { name: 'Volver', exact: true }).click()
  await expect(page).toHaveURL(/\/mi-trabajo$/)
})

test('las tarjetas conservan edificio y ubicación a 320 px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 650 })
  await signIn(page, 'demo.admin')
  await page.goto('/tickets')
  const card = page.getByRole('link', { name: /^AX-2026-1 Registrado/ })
  const place = card.getByText('Edificio Central · Planta baja', {
    exact: true,
  })
  await expect(place).toBeVisible()
  expect(await place.evaluate((node) => node.scrollWidth)).toBeLessThanOrEqual(
    await place.evaluate((node) => node.clientWidth),
  )
})

test('aplicar y limpiar filtros son visibles antes de desplazar la hoja', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 650 })
  await signIn(page, 'demo.admin')
  await page.goto('/tickets')
  await page.getByRole('button', { name: 'Filtros', exact: true }).click()
  const sheet = page.getByRole('dialog', { name: 'Filtros' })
  const apply = sheet.getByRole('button', { name: 'Aplicar' })
  await expect(apply).toBeInViewport({ ratio: 1 })
  await expect(
    sheet.getByRole('button', { name: 'Limpiar filtros' }),
  ).toBeInViewport({ ratio: 1 })
  await sheet.getByLabel('Estado', { exact: true }).selectOption('paused')
  await apply.click()
  await expect(page).toHaveURL(/status=paused/)
})

test('la barra de acciones avisa cuando se pierde la conexión', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await signIn(page, 'demo.technician')
  await page.goto(`/tickets/${TICKET_ID}`)
  await expect(
    page.getByRole('button', { name: 'Marcar atendido' }),
  ).toBeVisible()

  const offline = page.getByText('Sin conexión', { exact: true }).filter({
    visible: true,
  })
  await page.context().setOffline(true)
  await expect(offline).toBeInViewport()
  await page.context().setOffline(false)
  await expect(offline).toBeHidden()
})
