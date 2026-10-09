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

async function signOut(page: Page) {
  await page.getByRole('button', { name: 'Menú de usuario' }).click()
  await page.getByRole('menuitem', { name: 'Cerrar sesión' }).click()
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
}

async function clickAndWait(page: Page, name: string, rpc: string) {
  const done = page.waitForResponse((response) =>
    response.url().includes(`/rpc/${rpc}`),
  )
  await page.getByRole('button', { name }).click()
  await done
}

test('el técnico recibe, atiende con evidencias y cierra su parte', async ({
  page,
}) => {
  const description = `Flujo técnico E2E ${crypto.randomUUID()}`

  // El administrador registra y asigna el tiquet al técnico.
  await signIn(page, 'admin@axia.test')
  await page.goto('/tickets/nuevo')
  await page
    .getByLabel('Solicitante', { exact: true })
    .selectOption({ label: 'Ana Pérez' })
  await page.getByLabel('Edificio').selectOption({ label: 'Edificio Central' })
  await page.getByLabel('Ubicación').selectOption({ label: 'Planta baja' })
  await page
    .getByLabel('Dependencia solicitante')
    .selectOption({ label: 'Sistemas' })
  await page
    .getByLabel('Categoría', { exact: true })
    .selectOption({ label: 'Eléctrico' })
  await page
    .getByLabel('Tipo de servicio')
    .selectOption({ label: 'Correctivo' })
  await page.getByLabel('Prioridad').selectOption({ label: 'Media' })
  await page.getByLabel('Canal').selectOption({ label: 'Web' })
  await page.getByLabel('Descripción del problema').fill(description)
  await page.getByRole('button', { name: 'Registrar tiquet' }).click()
  await expect(page.getByText(description)).toBeVisible()

  await page.getByRole('button', { name: 'Asignar técnico' }).click()
  await page
    .getByLabel('Técnico', { exact: true })
    .selectOption({ label: 'Luis Gómez' })
  await clickAndWait(page, 'Confirmar', 'ticket_assign_technician')
  await expect(page.getByText('Asignado', { exact: true })).toBeVisible()
  await signOut(page)

  // El técnico ve el tiquet en su bandeja, sube evidencia e inicia.
  await signIn(page, 'tecnico@axia.test')
  await page.goto('/mi-trabajo')
  await page.getByText(description).click()

  // Iniciar pide la evidencia "antes".
  await page.getByRole('button', { name: 'Iniciar' }).click()
  await page.getByLabel('Evidencia: Antes').setInputFiles({
    name: 'antes.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from('antes'),
  })
  await clickAndWait(page, 'Confirmar', 'ticket_start')
  await expect(page.getByText('En proceso', { exact: true })).toBeVisible()

  // Atender pide descripción y evidencia "después".
  await page.getByRole('button', { name: 'Marcar atendido' }).click()
  await page
    .getByLabel('Descripción del trabajo')
    .fill('Se revisó la instalación y quedó funcionando')
  await page.getByLabel('Evidencia: Después').setInputFiles({
    name: 'despues.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from('despues'),
  })
  await clickAndWait(page, 'Confirmar', 'ticket_attend')
  await expect(
    page.getByText('Atendido', { exact: true }).first(),
  ).toBeVisible()
})
