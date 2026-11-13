import { expect, test } from '@playwright/test'
import { signIn } from './metrics-session.js'

test('el administrador abre las métricas', async ({ page }) => {
  await signIn(page, 'demo.admin')
  await expect(page.getByText(/Hola, Administrador Demo/)).toBeVisible()

  await page
    .getByRole('navigation', { name: 'Navegación principal' })
    .getByRole('link', { name: 'Métricas' })
    .click()
  await expect(page.getByRole('heading', { name: 'Métricas' })).toBeVisible()
  await expect(
    page.getByText('No se pudieron cargar las métricas.'),
  ).toHaveCount(0)
})

test('calidad agrupa salud, diagnóstico y motivos de salida', async ({
  page,
}) => {
  await signIn(page, 'demo.admin')
  await page
    .getByRole('navigation', { name: 'Navegación principal' })
    .getByRole('link', { name: 'Métricas' })
    .click()
  await page.getByRole('tab', { name: 'Calidad' }).click()

  const quality = page.getByRole('tabpanel')
  await expect(
    quality.getByRole('heading', { name: 'Salud de calidad' }),
  ).toBeVisible()
  await expect(
    quality.getByRole('heading', { name: 'Dónde falla' }),
  ).toBeVisible()
  await expect(
    quality.getByRole('heading', { name: 'Motivos y salidas' }),
  ).toBeVisible()
  await expect(
    quality.getByRole('heading', { name: 'Calidad del tiempo' }),
  ).toBeVisible()

  await quality
    .getByRole('combobox', { name: 'Señal de riesgo' })
    .selectOption({ label: 'Recaptura' })
  await quality.getByRole('button', { name: 'Duplicados', exact: true }).click()
  await expect(quality.getByText('Detalle por agrupación')).toBeVisible()
  await quality
    .getByRole('button', { name: 'Rechazos y cancelaciones' })
    .click()
  await expect(
    quality.getByRole('heading', { name: 'Rechazos y cancelaciones' }),
  ).toBeVisible()
})

test('el riesgo de retrabajo compara cada categoría con el promedio', async ({
  page,
}) => {
  await signIn(page, 'demo.admin')
  await page
    .getByRole('navigation', { name: 'Navegación principal' })
    .getByRole('link', { name: 'Métricas' })
    .click()
  await page.getByRole('tab', { name: 'Calidad' }).click()

  const risk = page
    .locator('[data-slot="card"]')
    .filter({ hasText: 'Riesgo de retrabajo' })
  await expect(
    risk.getByRole('heading', { name: 'Riesgo de retrabajo' }),
  ).toBeVisible()
  await expect(risk.getByText('Eléctrico', { exact: true })).toBeVisible()
  await expect(risk.getByText(/Promedio/).first()).toBeVisible()

  const rows = risk.locator('[data-risk-row]')
  await expect(rows).not.toHaveCount(0)
  await expect(rows.first()).toContainText('%')

  await risk
    .getByRole('combobox', { name: 'Señal de riesgo' })
    .selectOption({ label: 'Recaptura' })
  await expect(risk.getByText(/Promedio/).first()).toBeVisible()
})

test('la pestaña de tiempos agrupa ciclo, dimensiones y personas', async ({
  page,
}) => {
  await signIn(page, 'demo.admin')
  await page
    .getByRole('navigation', { name: 'Navegación principal' })
    .getByRole('link', { name: 'Métricas' })
    .click()
  await page.getByRole('tab', { name: 'Tiempos' }).click()

  const times = page.getByRole('tabpanel')
  await expect(
    times.getByRole('heading', { name: 'Tiempos del periodo' }),
  ).toBeVisible()
  await expect(
    times.getByRole('heading', { name: 'Ciclo y fases' }),
  ).toBeVisible()
  await expect(
    times.getByRole('heading', { name: 'Por dimensión', exact: true }),
  ).toBeVisible()
  await expect(times.getByRole('heading', { name: 'Personas' })).toBeVisible()

  await times.getByRole('button', { name: 'Solicitantes' }).click()
  await expect(times.getByText('Tiempos por solicitante')).toBeVisible()
})

test('el tooltip de la gráfica de técnicos muestra el nombre', async ({
  page,
}) => {
  await signIn(page, 'demo.admin')
  await page
    .getByRole('navigation', { name: 'Navegación principal' })
    .getByRole('link', { name: 'Métricas' })
    .click()
  await page.getByRole('tab', { name: 'Tiempos' }).click()

  const scatter = page.locator('.recharts-scatter-symbol').first()
  await expect(scatter).toBeVisible()
  await scatter.hover()

  const tooltip = page.locator('.recharts-tooltip-wrapper')
  await expect(tooltip).toBeVisible()
  await expect(tooltip).toContainText(
    /Luis Gómez|Marta Ruiz|Diana Torres|Sofía Vega|Omar Castillo/,
  )
})

test('explora dimensiones y filtra por edificio', async ({ page }) => {
  await signIn(page, 'demo.admin')
  await page
    .getByRole('navigation', { name: 'Navegación principal' })
    .getByRole('link', { name: 'Métricas' })
    .click()

  await page.getByRole('tab', { name: 'Distribución' }).click()
  await page
    .getByRole('combobox', { name: 'Ver por' })
    .selectOption({ label: 'Solicitante' })
  await expect(
    page.getByRole('columnheader', { name: 'Agrupación' }),
  ).toBeVisible()

  await page
    .getByRole('combobox', { name: 'Ver por' })
    .selectOption({ label: 'Problema' })
  await expect(
    page.getByRole('img', {
      name: 'Categoría → Subcategoría → Problema',
    }),
  ).toBeVisible()

  await expect(page.locator('#metrics-catalog-filters')).toHaveCount(0)
  await page.getByRole('button', { name: 'Filtros', exact: true }).click()
  await page
    .getByRole('combobox', { name: 'Edificio' })
    .selectOption({ label: 'Edificio Central' })
  await page.keyboard.press('Escape')
  await expect(
    page.getByRole('button', { name: 'Quitar Edificio Central' }),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Quitar Edificio Central' }).click()
  await expect(
    page.getByRole('button', { name: 'Quitar Edificio Central' }),
  ).toHaveCount(0)

  await page.getByRole('button', { name: 'Filtros', exact: true }).click()
  await page
    .getByRole('combobox', { name: 'Desenlace' })
    .selectOption({ label: 'Cancelados' })
  await page.keyboard.press('Escape')
  await expect(
    page.getByRole('button', { name: 'Quitar Cancelados' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Quitar Cancelados' }).click()
})

test('alterna la medida de tiempos entre promedio, acumulado y mediana', async ({
  page,
}) => {
  await signIn(page, 'demo.admin')
  await page
    .getByRole('navigation', { name: 'Navegación principal' })
    .getByRole('link', { name: 'Métricas' })
    .click()
  await page.getByRole('tab', { name: 'Tiempos' }).click()

  await expect(
    page.getByText('Trabajo activo', { exact: true }).first(),
  ).toBeVisible()
  await expect(page.getByText('Sin clasificar')).toHaveCount(0)
  const measure = page.getByRole('combobox', {
    name: 'Elegir la medida de tiempos',
  })
  await measure.selectOption({ label: 'Acumulado' })
  await expect(
    page.getByText('Trabajo activo (acumulado)').first(),
  ).toBeVisible()

  await measure.selectOption({ label: 'Mediana' })
  await expect(page.getByText('Trabajo activo (mediana)').first()).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Perfil de fases' }),
  ).toBeVisible()
  await expect(page.getByText(/Barra: P25–P75/)).toBeVisible()
  await page
    .getByRole('button', { name: /Trabajo activo/ })
    .first()
    .hover()
  await expect(page.getByRole('tooltip', { name: /P25/ })).toContainText('P25')
  await expect(
    page.getByRole('heading', { name: 'Distribución y atípicos' }),
  ).toBeVisible()
  await expect(page.getByText('n / N')).toBeVisible()
  await expect(page.locator('[data-active="true"]')).toContainText('Mediana')
  await page.getByRole('button', { name: 'Más información: n / N' }).focus()
  await expect(
    page.getByRole('tooltip', { name: /Tiquets que tuvieron la fase/ }),
  ).toContainText('No cambia con la medida')
})

test('en móvil las métricas se navegan por pestañas', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await signIn(page, 'demo.admin')
  await expect(page.getByText(/Hola, Administrador Demo/)).toBeVisible()
  await page.goto('/metricas')

  await page.getByRole('tab', { name: 'Calidad' }).click()
  await expect(
    page.getByRole('heading', { name: 'Motivos y salidas' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Duplicados', exact: true }).click()
  await expect(page.getByText('Detalle por agrupación')).toBeVisible()
})

test('el equipo cambia entre equipos, supervisores y técnicos', async ({
  page,
}) => {
  await signIn(page, 'demo.admin')
  await page
    .getByRole('navigation', { name: 'Navegación principal' })
    .getByRole('link', { name: 'Métricas' })
    .click()
  await page.getByRole('tab', { name: 'Equipo' }).click()
  await expect(page.getByText('Resumen por equipo')).toBeVisible()
  await page.getByRole('button', { name: 'Supervisores' }).click()
  await expect(page.getByText('Ruteo y toma')).toBeVisible()
  await page.getByRole('button', { name: 'Técnicos' }).click()
  await expect(page.getByText('Carga por técnico')).toBeVisible()
})

test('equipo conserva los tiempos y añade lectura de carga', async ({
  page,
}) => {
  await signIn(page, 'demo.admin')
  await page
    .getByRole('navigation', { name: 'Navegación principal' })
    .getByRole('link', { name: 'Métricas' })
    .click()
  await page.getByRole('tab', { name: 'Equipo' }).click()

  const team = page.getByRole('tabpanel')
  await expect(team.getByText('Resumen por equipo')).toBeVisible()
  await team.getByRole('button', { name: 'Supervisores' }).click()
  await expect(team.getByText('Ruteo y toma')).toBeVisible()
  await expect(
    team.getByRole('columnheader', { name: 'Tasa de toma' }),
  ).toBeVisible()
  await expect(
    team.getByRole('columnheader', { name: /continuo/ }),
  ).toBeVisible()

  await team.getByRole('button', { name: 'Técnicos' }).click()
  await expect(team.getByText('Carga por técnico')).toBeVisible()
  await expect(
    team.getByRole('textbox', { name: 'Buscar técnico o categoría' }),
  ).toBeVisible()
})

test('cambia el periodo desde el popover', async ({ page }) => {
  await signIn(page, 'demo.admin')
  await page
    .getByRole('navigation', { name: 'Navegación principal' })
    .getByRole('link', { name: 'Métricas' })
    .click()

  await page.getByRole('button', { name: /^Periodo:/ }).click()
  await page.getByRole('button', { name: '7 días' }).click()
  await expect(page.getByRole('button', { name: /^Periodo:/ })).toContainText(
    '7 días',
  )
})
