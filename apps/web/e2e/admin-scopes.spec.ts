import { expect, test, type Page } from '@playwright/test'
import { signIn } from './fixtures.js'

const headers = { origin: 'http://localhost:5174' }

async function createSupervisor(page: Page) {
  const access = await page.request.get('/api/admin/access')
  await expect(access).toBeOK()
  const { roles }: { roles: { id: string; name: string }[] } =
    await access.json()
  const role = roles.find((item) => item.name === 'supervisor')
  if (!role) throw new Error('No se encontró el rol Supervisor')

  const suffix = crypto.randomUUID().slice(0, 8)
  const fullName = `Supervisora de prueba ${suffix}`
  const user = await page.request.post('/api/admin/users', {
    headers,
    data: { username: `supervisor.${suffix}`, fullName, roleIds: [role.id] },
  })
  await expect(user).toBeOK()
  return fullName
}

async function createTeam(page: Page) {
  const name = `Equipo ámbitos ${crypto.randomUUID().slice(0, 8)}`
  const response = await page.request.post('/api/admin/catalogs/teams', {
    headers,
    data: { name },
  })
  await expect(response).toBeOK()
  const { id }: { id: string } = await response.json()
  return { id, name }
}

async function createTechnician(page: Page) {
  const team = await createTeam(page)
  const name = `Técnica de prueba ${crypto.randomUUID().slice(0, 8)}`
  const technician = await page.request.post(
    '/api/admin/catalogs/technicians',
    {
      headers,
      data: { full_name: name, team_id: team.id },
    },
  )
  await expect(technician).toBeOK()
  return name
}

test('@smoke el alta de un ámbito incluye varios edificios y cancelar descarta la edición', async ({
  page,
}) => {
  await signIn(page, 'demo.admin')
  const name = await createSupervisor(page)
  const team = await createTeam(page)
  await page.goto('/admin/ambitos')

  await page.getByRole('button', { name: 'Agregar ámbito' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Usuario').selectOption({ label: name })
  await dialog.getByLabel('Equipo').selectOption({ label: team.name })
  await dialog.getByRole('checkbox', { name: 'Edificio Central' }).check()
  await dialog.getByRole('textbox', { name: 'Buscar edificio…' }).fill('Norte')
  await dialog.getByRole('checkbox', { name: 'Edificio Norte' }).check()
  await expect(dialog.getByRole('status')).toHaveText(
    '2 opciones seleccionadas',
  )
  await dialog.getByRole('button', { name: 'Guardar cambios' }).click()

  const row = page.getByRole('row').filter({ hasText: name })
  await expect(row).toContainText('Edificio Central')
  await expect(row).toContainText('Edificio Norte')
  const edit = row.getByRole('button', { name: /Editar edificios/ })
  await edit.click()
  const central = dialog.getByRole('checkbox', { name: 'Edificio Central' })
  await expect(central).toBeChecked()
  await central.uncheck()
  await dialog.getByRole('button', { name: 'Cancelar' }).click()
  await edit.click()
  await expect(central).toBeChecked()
})

test('@smoke en móvil se agregan y quitan varias categorías de un técnico', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await signIn(page, 'demo.admin')
  const name = await createTechnician(page)
  await page.goto('/admin/ambitos')
  await page.getByRole('tab', { name: 'Designaciones de técnicos' }).click()

  await page.getByRole('button', { name: 'Agregar designación' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Técnico').selectOption({ label: name })
  const electrical = dialog.getByRole('checkbox', { name: 'Eléctrico' })
  const plumbing = dialog.getByRole('checkbox', { name: 'Plomería' })
  const climate = dialog.getByRole('checkbox', { name: 'Clima' })
  await electrical.check()
  await plumbing.check()
  await dialog.getByRole('button', { name: 'Guardar cambios' }).click()

  const card = page.getByRole('listitem').filter({ hasText: name })
  await expect(card).toContainText('Eléctrico')
  await expect(card).toContainText('Plomería')
  await card.getByRole('button', { name: /Editar categorías/ }).click()
  await expect(electrical).toBeChecked()
  await expect(plumbing).toBeChecked()
  await electrical.uncheck()
  await plumbing.uncheck()
  await climate.check()
  await dialog.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(card).toContainText('Clima')
  await expect(card).not.toContainText('Eléctrico')
  await expect(card).not.toContainText('Plomería')
})
