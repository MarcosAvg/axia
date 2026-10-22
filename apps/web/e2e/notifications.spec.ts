import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const PASSWORD = process.env.AXIA_DEMO_PASSWORD ?? 'E2ePassword123!'

async function signIn(page: Page, username: string) {
  await page.goto('/login')
  await page.getByLabel('Usuario').fill(username)
  await page.getByLabel('Contraseña').fill(PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(
    page.getByRole('button', { name: 'Menú de usuario' }),
  ).toBeVisible()
}

async function openNotifications(page: Page) {
  await page.getByRole('link', { name: /^Avisos/ }).click()
  await expect(page.getByRole('heading', { name: 'Avisos' })).toBeVisible()
}

test('un administrador ve el estado vacío de avisos', async ({ page }) => {
  await signIn(page, 'demo.admin')
  await openNotifications(page)
  await expect(page.getByText('No hay avisos.')).toBeVisible()
})

test('un solicitante recibe un aviso en vivo por SSE', async ({ browser }) => {
  const requesterContext = await browser.newContext()
  const adminContext = await browser.newContext()
  const requester = await requesterContext.newPage()
  const admin = await adminContext.newPage()

  try {
    await signIn(requester, 'demo.requester')
    await openNotifications(requester)

    await signIn(admin, 'demo.admin')
    await admin.goto('/tickets/nuevo')
    await admin
      .getByLabel('Solicitante', { exact: true })
      .selectOption({ label: 'Ana Pérez' })
    await admin
      .getByLabel('Edificio')
      .selectOption({ label: 'Edificio Central' })
    await admin.getByLabel('Ubicación').selectOption({ label: 'Planta baja' })
    await admin
      .getByLabel('Dependencia solicitante')
      .selectOption({ label: 'Sistemas' })
    await admin
      .getByLabel('Categoría', { exact: true })
      .selectOption({ label: 'Eléctrico' })
    await admin.getByLabel('Canal').selectOption({ label: 'Web' })
    await admin
      .getByLabel('Descripción del problema')
      .fill(`Aviso SSE ${crypto.randomUUID()}`)
    await admin.getByRole('button', { name: 'Registrar tiquet' }).click()

    const heading = admin.getByRole('heading', { level: 1 })
    await expect(heading).toContainText('AX-')
    const folio = (await heading.innerText()).trim()

    await admin.getByRole('button', { name: 'Rechazar' }).click()
    await admin.getByLabel('Motivo').selectOption({ index: 1 })
    await admin.getByRole('button', { name: 'Confirmar' }).click()
    await expect(
      admin.getByText('Rechazado', { exact: true }).first(),
    ).toBeVisible()

    await expect(
      requester.getByRole('link', { name: new RegExp(folio) }),
    ).toBeVisible({ timeout: 15_000 })
    await expect(requester).toHaveURL(/\/avisos$/)
  } finally {
    await requesterContext.close()
    await adminContext.close()
  }
})

test('un solicitante consulta y marca sus avisos como leídos', async ({
  page,
}) => {
  await signIn(page, 'demo.requester')
  await openNotifications(page)

  const notificationLinks = page.locator('main a[href^="/tickets/"]')
  await expect(notificationLinks.first()).toBeVisible()
  const firstTicketUrl = await notificationLinks.first().getAttribute('href')
  expect(firstTicketUrl).toContain('/tickets/')

  await page.getByRole('button', { name: 'Marcar todas' }).click()
  await expect(
    page.getByRole('link', { name: 'Avisos', exact: true }),
  ).toBeVisible()

  await notificationLinks.first().click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('AX-')
})
