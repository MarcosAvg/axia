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

_(Pendiente: Fase 1 del rediseño — armazón con barra lateral, barra superior, breadcrumbs y
búsqueda global.)_

## 3. Componentes y patrones

_(Pendiente: Fases 2 y 3 — tabla de datos, estados, filtros e insignias semánticas.)_

## 4. Accesibilidad

- Foco visible y navegación por teclado en todos los controles.
- Contraste suficiente (AA) en los cinco temas.
- Objetivos táctiles de al menos 44 px en móvil.
- Tema `contrast` para condiciones de mucha luz.
