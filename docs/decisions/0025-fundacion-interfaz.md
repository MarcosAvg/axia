# 0025 — Fundación de interfaz con shadcn/ui

- Fecha: 2026-10-08
- Estado: aceptada

## Contexto

La app usaba solo `button`, `card`, `input`, `label` y un `chart` compacto de shadcn/ui; el resto de
la UI (formularios, feedback, tablas, insignias) se construía a mano. Con cada pantalla nueva se
repetían patrones (formularios en línea, `<p role="alert">`, tablas crudas) y no se podían usar los
componentes de shadcn tal cual porque los límites de ESLint (`max-lines`, `complexity`) aplican
también a `components/ui/**` y varios los exceden.

## Decisión

- **shadcn/ui como base.** Se instalan las primitivas: `dialog`, `sheet`, `table`, `tabs`, `badge`,
  `checkbox`, `switch`, `radio-group`, `alert`, `separator`, `skeleton`, `tooltip`, `dropdown-menu`,
  `pagination`, `progress`, `sonner` y el `chart` completo. Dependencias nuevas: `lucide-react`
  (ISC) y `sonner` (MIT); `recharts` queda fijado en 3.8.0 (el que usa el `chart` de shadcn).
- **`components/ui/**` es código vendored.** Se relajan `max-lines`, `max-lines-per-function`,
  `max-params`, `max-depth` y `complexity` **solo** para esa carpeta, de forma explícita en
  `eslint.config.js`. knip ya la ignora. No es debilitar la compuerta: es la política para las
  primitivas generadas.
- **Feedback con `sonner`.** `Toaster` y `TooltipProvider` en los providers; los avisos de guardado
  pasan a toasts. Los errores de campo siguen en el formulario.
- **Select nativo.** Se conserva el `<select>` nativo por usabilidad en móvil (decisión previa del
  código); no se adopta el `Select` de shadcn.
- **Migración en olas.** Primera ola: insignia de estado → `Badge`; tabla de métricas → `Table`;
  formularios de acción del tiquet → `Sheet`; formulario de catálogos → `Dialog`; toasts al guardar.

## Alternativas consideradas

- **Mantener componentes propios:** obliga a rehacer cada patrón; descartado.
- **Exigir los límites de ESLint a `components/ui`:** obliga a recortar componentes generados y
  divergir de shadcn; descartado.
- **Adoptar `Select` de shadcn:** peor en móvil; descartado.

## Consecuencias

- La base permite adoptar shadcn de forma orgánica en las siguientes pantallas.
- **Olas pendientes:** migrar `evidence-uploader` a `Progress`, y adoptar `Tooltip`/`Skeleton` en más
  puntos donde aporten. La ola 2 (field/tabs/table/checkbox/alert) ya está aplicada: campos
  compartidos sobre `field`, roles con `Tabs`/`Table`, usuarios con `Switch`/`Checkbox`, estados de
  carga/error con `Skeleton`/`Alert` y formularios de auth/tiquets con `Alert`.
- Los componentes ya migrados se prueban con las E2E existentes (12 en verde).
