# Diseño de interfaz

Sistema visual de Axia: tokens, temas, layout, componentes y accesibilidad. Es la referencia
para el rediseño de interfaz (Fase 8). El código vive en `apps/web/src`; los tokens en
`apps/web/src/styles/themes.css`.

## 1. Tokens y temas

### Cómo se aplica un tema

El tema se fija en el elemento `<html>` con el atributo `data-theme` y el modo con la clase
`.dark`:

```html
<html data-theme="ocean" class="dark">
```

El script en línea de `apps/web/index.html` lee la preferencia de `localStorage` y aplica tema y
modo **antes del primer pintado** (sin parpadeo). Después, `ThemeProvider`
(`components/shared/theme-provider.tsx`) mantiene el estado y lo persiste.

- Clave de tema: `axia.theme`
- Clave de modo: `axia.color-mode`
- Lógica pura y resolución: `apps/web/src/lib/theme.ts`

### Temas disponibles

| Tema | Acento | Uso |
|---|---|---|
| `ocean` | Azul | **Predeterminado** |
| `neutral` | Gris | Base sobria |
| `emerald` | Verde | Alternativa |
| `violet` | Violeta / índigo | Alternativa |
| `contrast` | Azul de alto contraste | Campo y plena luz |

Cada tema define el conjunto completo de tokens en claro y oscuro.

### Catálogo de tokens

Los tokens de shadcn/ui más los propios de Axia:

- **Superficies**: `--background`, `--foreground`, `--card`, `--card-foreground`, `--popover`,
  `--popover-foreground`.
- **Acento e interacción**: `--primary`, `--primary-foreground`, `--secondary`,
  `--secondary-foreground`, `--accent`, `--accent-foreground`, `--ring`.
- **Apoyo**: `--muted`, `--muted-foreground`, `--border`, `--input`, `--destructive`.
- **Barra lateral**: `--sidebar`, `--sidebar-foreground`, `--sidebar-primary`,
  `--sidebar-accent`, `--sidebar-border`, `--sidebar-ring` (y sus `-foreground`).
- **Gráficos**: `--chart-1` … `--chart-5`, cinco tonos distinguibles en todos los temas.
- **Semánticos** (propios de Axia): `--success`, `--warning`, `--info` (y sus `-foreground`).
- **Radio**: `--radius`.

### Uso en la interfaz

Tailwind expone los tokens como utilidades (`@theme inline` en `index.css`):

```tsx
// Superficie y texto
<div className="bg-card text-card-foreground" />

// Acento
<button className="bg-primary text-primary-foreground" />

// Semánticos
<span className="bg-success/10 text-success" />
<span className="bg-warning/10 text-warning" />
<span className="bg-info/10 text-info" />
```

Para estados y prioridades se usan las insignias del feature de tiquets, que aplican estos
tokens; **no se inventan colores sueltos en los componentes**.

### Cómo añadir un tema

1. Añade el nombre al arreglo `THEMES` de `apps/web/src/lib/theme.ts`.
2. Agrega el bloque claro `[data-theme='<nombre>']` y el oscuro `[data-theme='<nombre>'].dark`
   en `apps/web/src/styles/themes.css`, copiando todos los tokens.
3. Agrega la etiqueta en español en `messages.theme.themes` (`lib/i18n.ts`).
4. Comprueba el contraste AA en ambos modos.

## 2. Layout y navegación

El armazón vive en `features/shell` (ver ADR 0039).

- **Barra lateral** (`app-sidebar.tsx`): persistente y colapsable en escritorio (`lg+`), cajón en
  móvil. Agrupa los destinos por áreas (Operación, Análisis, Administración y Cuenta) con iconos,
  estado activo y tooltips al colapsar. Los destinos se definen en `components/nav-items.tsx`.
- **Barra superior** (`app-topbar.tsx`): botón de menú (móvil), migas de pan, búsqueda global,
  indicador offline, selector de tema y menú de usuario.
- **Búsqueda global** (`global-search.tsx`): paleta con `Cmd/Ctrl+K`; ofrece navegación rápida y
  tiquets por folio.
- **Migas de pan** (`breadcrumbs.tsx`): derivadas de la ruta activa.
- El contenido usa todo el ancho disponible (hasta `1600px`), en lugar de una sola columna
  estrecha.

## 2.bis Panel de inicio

El Panel (`/`) es un **centro de bandejas con métricas propias del usuario** (`features/dashboard`,
ver ADR 0041 y 0052):

- **KPI según rol** (hasta 6): mi trabajo / ofertas / activos / en pausa / por validar / sin asignar /
  cerrados, más **trabajo activo** y **primera resolución** (técnico), **SLA** (supervisor/admin) y
  **satisfacción** (admin); calculados de lo que el RLS deja ver.
- **Gráfica**: **tiquets por mes** (línea).
- **Actividad reciente**: últimos eventos visibles (folio, tipo y fecha).
- **Bandejas según rol**, con el **tiempo transcurrido** en cada tiquet:
  - **Técnico**: "Tus tiquets activos".
  - **Supervisor**: "Ofertas para ti" + "Tiquets del equipo".
  - **Admin**: "Tiquets activos" + "Ofertas para ti" (si las hay).
- **Acciones rápidas** según permisos.
- Es distinto del **tablero global** de `/metricas` (permiso `metrics.view`).

La **semilla de demostración** (`supabase/seed.sql`) crea tiquets en todos los estados, con nombres y
descripciones legibles, y los reparte a lo largo de **varios meses** para que las gráficas y el panel
tengan datos al evaluar la interfaz. Las pruebas e2e crean datos temporales que se **purgan** con
`pnpm db:clean`.

## 3. Componentes y patrones

Componentes compartidos en `components/shared` (ver ADR 0040):

- **`data-table.tsx`**: tabla densa para escritorio. Recibe columnas, filas y un `getRowId`;
  opcionalmente `onRowClick` (con navegación por teclado). Cada columna puede ocultarse por
  punto de quiebre (`hideBelow`).
- **`page-header.tsx`**: título, descripción y acciones de una vista.
- **`empty-state.tsx`**: estado vacío homogéneo con icono y acción opcionales.
- **`async-state.tsx`**: `LoadingList` (esqueletos) y `ErrorAlert`.
- **`form-section.tsx`** y **`form-actions-bar.tsx`**: secciones de formulario y barra de guardado.
- **`filter-chips.tsx`**: chips de filtros activos con quitar individual.

Patrones de operación (ADR 0042):

- **Alta**: secciones (Ubicación, Clasificación, Solicitante, Descripción), dos columnas con el
  aviso de duplicados al lado y barra de guardado fija; aviso de cambios sin guardar. La
  **clasificación** pide categoría, subcategoría y problema; la **prioridad se deriva del problema**
  (respaldo en la instancia) y el **tipo de servicio se captura en la atención**. El **canal** solo se
  elige al registrar **a nombre de otro** (el propio solicitante usa el canal de plataforma). El
  **solicitante** sale del catálogo (preseleccionado "a mi nombre"; ADR 0056).
- **Detalle**: encabezado con folio/estado/prioridad; la **data es la columna principal**
  (acciones, captura, evidencias, participantes, tiempos, calificación) y la **actividad va en el
  sidebar** derecho.
- **Acciones visibles por estado**: se muestran **todas** las acciones permitidas como botones
  según estado y permiso, con la **primaria destacada** y los **descartes** (Rechazar, Cancelar,
  Marcar duplicado) al final y en estilo de peligro (ADR 0045).
- **Contenedor de acciones**: cada acción abre un **modal centrado en escritorio** y una **hoja
  inferior (bottom sheet) en móvil**, con alto máximo y desplazamiento; sin borde interno en los
  formularios (el contenedor aporta el marco).
- **Acciones guiadas con evidencia**: cada acción pide lo que exige; iniciar la evidencia "antes",
  atender el **tipo de servicio**, la descripción y "después", reclamar motivo, descripción y
  evidencia, y **`during`** es el paso "Registrar avance" (archivo + nota) (ADR 0044, 0045, 0056).
- **Pausa y subestados**: al pausar se elige el **motivo** (nodo **raíz** del árbol); mientras está
  pausada se **gestiona** eligiendo cualquier **subestado** del motivo; **reanudar exige un subestado**
  (**hijo directo** del motivo); el detalle muestra **motivo**, **subestado actual** e **historial de
  pasos** con fechas; el tiempo de pausa se mide **por subestado** (ADR 0011, 0060, 0061).
- **Evidencia acotada y por rol**: el subidor ofrece solo los tipos válidos para el estado y se
  muestra únicamente a quien tenga `evidence.attach` (supervisor/admin); el alta permite adjuntar
  la foto de solicitud.
- **Campo de archivo (`FileField`)**: botones visibles ("Elegir archivo"/"Sustituir" y "Tomar
  foto" en móvil, que abre la cámara), vista previa en miniatura y acción "Quitar". Se usa en las
  tres ubicaciones: acción guiada, subidor libre y alta.
- **Bandejas**: conteo por estado (`TicketStatusSummary`).
- **Tomar ofertas**: abrir el detalle de un tiquet `registered` con una oferta activa lo **toma**
  (pasa a **"Tomado por supervisor"**); desde ahí el supervisor puede **asignar técnico** o
  **reasignar supervisor** (ADR 0054).

Patrones de métricas (ADR 0047–0051): **barra de filtros** con el **mismo patrón que la lista de
Operación** (contenedor `rounded-xl border bg-card p-4`, controles **en línea** con rangos rápidos
7 · 30 · 90 días y "Todo", fechas y catálogos, y **chips de filtros activos** debajo); la
**exportación CSV/XLSX** vive en las **acciones del encabezado**. Una fila de **KPI destacados** con
**delta contra el periodo anterior**
(tiquets · tiempo activo · SLA · satisfacción · primera solución), que muestra las **fechas
comparadas**; y el resto en **pestañas por tema** (Resumen · Tiempos · Calidad · SLA y satisfacción ·
Equipo) con gráficas y tablas `DataTable`. El **Resumen** muestra **una tarjeta por dimensión**
(equipo · edificio · categoría · dependencia · solicitante), cada una con su **gráfica de tiquets**
(altura fija, top 5) y su **tabla** (Agrupación · Tiquets · Reasignación · Recaptura, con
desplazamiento interno); el **volumen por mes** (gráfica de línea) y ruteo comparten fila, y la
antigüedad va con scroll. En
**Tiempos**, el mismo formato por dimensión con las columnas de tiempo. En **Calidad**, **pausas** y
**rechazos/cancelaciones** van como **gráficas** en una fila; los **duplicados** encabezan con una
**gráfica de tasa por dimensión** y siguen en **tarjeta por dimensión** (Agrupación · Tiquets ·
Duplicados · Tasa); el **tiempo medio hasta marcarse** es un **KPI** más. En **SLA**, el
**cumplimiento por prioridad** es una **gráfica de barras**; en **Equipo**, **tiquets por técnico**
también es una **gráfica**. Los indicadores agregados
(SLA, satisfacción, pausas, duplicados, carga por técnico, rechazos/cancelaciones y ruteo) se calculan
en el servidor con filtros, así que **respetan la barra**. La **regresión visual** con Playwright es
**opt-in** (`pnpm test:visual`), fuera de la compuerta.

Patrones de acceso y perfil (ADR 0047): **acceso** en dos columnas en escritorio; **perfil** por
secciones con roles y zona horaria.

Patrones de administración (ADR 0046, 0057, 0058): encabezado único por pantalla
(`PageHeader`/`AdminPage`); **marco común** con `AdminToolbar` (buscador, contador y acción primaria)
en las listas; **catálogos con rail lateral** en escritorio y **tablas específicas por entidad**
(columnas reales alineadas, relaciones con nombre, estado como `Switch` y acciones en menú `⋯`), con
**búsqueda y orden en cliente**; **diálogos unificados** (`EntityDialog` centrado en escritorio / hoja
inferior en móvil, `EntityForm` con pie de acciones fijo y secciones "Datos"/"Opciones"); **roles en
master-detail** con permisos agrupados por área y alta en diálogo; **usuarios** en pestañas **Cuentas**
(tabla con vínculo y estado) y **Vínculos** (tablas de solicitantes/técnicos con diálogo de búsqueda);
**ámbitos** con tablas (supervisores con edificios en diálogo; designaciones con chips quitables);
**calendarios** con rail + detalle por secciones, alta/edición en diálogo y franjas/festivos como
tablas; **configuración** por secciones con barra de guardado, incluida la **visibilidad del
solicitante** (casillas por tipo de evento, ADR 0055); **integraciones** sobre la misma `DataTable`; e
**importación de catálogos** por plantilla XLSX (dry run, resolución de referencias e historial,
ADR 0059).

Patrones de lista:

- **Tiquets**: tabla en escritorio (`lg+`) y tarjetas en móvil, en el mismo panel.
- **Detalle de tiquet**: dos columnas; contenido a la izquierda y rail de acciones/metadatos a la
  derecha.
- Las **insignias de estado** usan tokens semánticos (`info`, `warning`, `success`,
  `destructive`) y siguen el tema activo.

## 4. Accesibilidad

- Foco visible y navegación por teclado en todos los controles.
- Enlace **"Saltar al contenido"** (visible al enfocar) que apunta a `#main-content`.
- `aria-current="page"` en el destino activo de la navegación.
- Contraste suficiente (AA) en los cinco temas.
- Objetivos táctiles de al menos 44 px en móvil.
- Tema `contrast` para condiciones de mucha luz.
