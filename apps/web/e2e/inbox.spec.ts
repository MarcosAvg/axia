import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const PASSWORD = process.env.AXIA_DEMO_PASSWORD ?? 'E2ePassword123!'

async function signIn(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Usuario').pressSequentially('demo.supervisor', {
    delay: 5,
  })
  await page.getByLabel('Contraseña').pressSequentially(PASSWORD, { delay: 5 })
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(
    page.getByRole('button', { name: 'Menú de usuario' }),
  ).toBeVisible()
}

test('la bandeja ofrece tomar un tiquet sin abrir el detalle', async ({
  page,
}) => {
  await signIn(page)
  await page.goto('/inbox')

  const offers = page.getByRole('heading', { name: /Ofertas para ti/ })
  await expect(offers).toBeVisible()
  const match = (await offers.textContent())?.match(/\((\d+)\)/)
  const count = match ? Number(match[1]) : 0
  if (count > 0) {
    await expect(
      page.getByRole('button', { name: 'Tomar tiquet' }).first(),
    ).toBeVisible()
  } else {
    await expect(page.getByText('No tienes ofertas pendientes.')).toBeVisible()
  }
  await expect(page.getByText(/Tiquets del equipo/)).toBeVisible()
})
