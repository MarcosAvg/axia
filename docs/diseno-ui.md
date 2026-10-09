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
ver ADR 0041):

- **Números según rol**: mi trabajo / ofertas / activos / en pausa / por validar / sin asignar /
  cerrados, calculados de las bandejas del usuario (el RLS ya limita lo que ve).
- **Bandejas**: ofertas para ti, mi trabajo y tiquets activos, con "Ver todos" y estado vacío.
- **Acciones rápidas** según permisos.
- Es distinto del **tablero global** de `/metricas` (permiso `metrics.view`).

La **semilla de demostración** (`supabase/seed.sql`) crea tiquets en todos los estados para que
estas vistas tengan datos al evaluar la interfaz.

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
  aviso de duplicados al lado y barra de guardado fija; aviso de cambios sin guardar.
- **Detalle**: encabezado con folio/estado/prioridad; la **data es la columna principal**
  (acciones, captura, evidencias, participantes, tiempos, calificación) y la **actividad va en el
  sidebar** derecho.
- **Acciones visibles por estado**: se muestran **todas** las acciones permitidas como botones
  según estado y permiso, con la **primaria destacada** y los **descartes** (Rechazar, Cancelar,
  Marcar duplicado) al final y en estilo de peligro (ADR 0045).
- **Acciones guiadas con evidencia**: cada acción abre un diálogo con lo que exige; iniciar pide
  la evidencia "antes", atender la descripción y "después", reclamar motivo, descripción y
  evidencia, y **`during`** es el paso "Registrar avance" (archivo + nota) (ADR 0044, 0045).
- **Evidencia acotada y por rol**: el subidor ofrece solo los tipos válidos para el estado y se
  muestra únicamente a quien tenga `evidence.attach` (supervisor/admin); el alta permite adjuntar
  la foto de solicitud.
- **Bandejas**: conteo por estado (`TicketStatusSummary`).

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
