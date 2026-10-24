import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const PASSWORD = process.env.AXIA_DEMO_PASSWORD ?? 'E2ePassword123!'
const TICKET_ID = 'de000000-0000-4000-8000-000000000004'

async function signIn(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Usuario').fill('demo.admin')
  await page.getByLabel('Contraseña').fill(PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(
    page.getByRole('button', { name: 'Menú de usuario' }),
  ).toBeVisible()
}

test('@smoke el administrador registra y corrige la hora de una acción', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await signIn(page)
  await page.goto(`/tickets/${TICKET_ID}`)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('AX-')

  await page.getByRole('button', { name: 'Comentar' }).click()
  const timeField = page.locator('#action-occurred-at')
  await expect(timeField).toBeVisible()
  const future = new Date(Date.now() + 60_000)
  const local = new Date(future.getTime() - future.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16)
  await timeField.fill(local)
  await page.getByLabel('Comentario').fill('Hora real desde E2E')
  await page.getByRole('button', { name: 'Confirmar' }).click()

  await expect(page.getByText('Hora real desde E2E')).toBeVisible()
  const adjustButtons = page.getByRole('button', { name: 'Ajustar hora' })
  await expect(adjustButtons.first()).toBeVisible()
  await adjustButtons.last().click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Guardar hora' }).click()
  await expect(dialog).toHaveCount(0)
})
