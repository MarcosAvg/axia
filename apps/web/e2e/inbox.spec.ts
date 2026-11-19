import { expect, test } from '@playwright/test'
import { signIn } from './fixtures.js'

test('la bandeja ofrece tomar un tiquet sin abrir el detalle', async ({
  page,
}) => {
  await signIn(page, 'demo.supervisor')
  await page.goto('/inbox')

  const offers = page.getByRole('heading', { name: /Ofertas para ti/ })
  await expect(offers).toBeVisible()
  const takeButton = page.getByRole('button', { name: 'Tomar tiquet' })
  const emptyOffers = page.getByText('No tienes ofertas pendientes.')
  await expect
    .poll(async () => (await takeButton.count()) + (await emptyOffers.count()))
    .toBeGreaterThan(0)
  if ((await takeButton.count()) > 0) {
    await expect(takeButton.first()).toBeVisible()
  } else {
    await expect(emptyOffers).toBeVisible()
  }
  await expect(page.getByText(/Tiquets del equipo/)).toBeVisible()
})
