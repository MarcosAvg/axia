import { expect, test } from '@playwright/test'
import { signIn } from './fixtures.js'

test('la bandeja permite abrir una oferta para tomarla desde el detalle', async ({
  page,
}) => {
  await signIn(page, 'demo.supervisor')
  await page.goto('/inbox')

  const offers = page.locator('section').filter({
    has: page.getByRole('heading', { name: /Ofertas para ti/ }),
  })
  const offer = offers.getByRole('link', { name: /^AX-/ }).first()
  await expect(offer).toBeVisible()
  await expect(page.getByRole('button', { name: 'Tomar tiquet' })).toHaveCount(
    0,
  )
  await expect(page.getByText(/Tiquets del equipo/)).toBeVisible()

  await offer.click()
  await expect(page).toHaveURL(/\/tickets\//)
  await expect(page.getByRole('button', { name: 'Tomar tiquet' })).toBeVisible()
})
