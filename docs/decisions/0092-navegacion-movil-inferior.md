# 0092 — Navegación inferior y acción fija en móvil

- Fecha: 2026-10-29
- Estado: aceptada

## Contexto

El recorte móvil del ADR 0091 ajustó el contenido por rol, pero la interacción seguía siendo
la de escritorio: un cajón lateral para navegar, una barra superior con cinco controles y sin
contexto de la ruta (las migas se ocultan bajo `md`), acciones del tiquet dentro del flujo de
la página, filtros que empujaban la lista y un diálogo centrado para la búsqueda. En campo eso
obliga a dos toques para cambiar de sección y deja la acción principal fuera del pulgar.

## Decisión

- **Barra inferior de tres pestañas por rol + “Más”.** `mobileTabs(identity)` toma los tres
  primeros destinos visibles de una lista ordenada (`panel`, `tickets`, `my-work`, `metrics`,
  `inbox`). Técnico: Panel · Tiquets · Mi trabajo. Supervisor y administrador: Panel · Tiquets ·
  Métricas. “Más” abre el cajón existente con el resto de destinos y el tema.
- **Barra superior contextual.** Se retira la hamburguesa. Solo el detalle muestra “volver” y el
  título; el resto de páginas ya tienen su `h1` inmediatamente debajo, así que repetirlo era ruido.
  La búsqueda y los avisos siguen visibles; el disparador de la cola offline pasa a 44 px. Todos
  los controles conservan el mínimo táctil.
- **Búsqueda a pantalla completa por debajo de `sm`** reutilizando el `Dialog` existente; en
  escritorio sigue siendo la paleta centrada con `Ctrl/⌘ K`.
- **Detalle con barra de acción fija.** En móvil la acción primaria vive al pie, con el resto en
  un menú “Más” que abre los mismos formularios en hoja inferior; el selector de “actuar a nombre
  de” se muestra en la propia barra. La sección “Acciones” de la página se reserva a escritorio y
  la barra inferior de pestañas se oculta en el detalle para no apilar dos barras.
- **Filtros en hoja inferior** con contador de filtros activos; la búsqueda por folio o descripción
  queda siempre visible y las hojas llevan su propio formulario (los campos viven en un portal
  fuera del `<form>` de la página).
- **Secciones planas en móvil** en el detalle (sin tarjeta anidada) y **metadatos de la lista en
  una sola línea**, con fecha y tiempo transcurrido fijos a la derecha.
- **Base de PWA instalada:** `viewport-fit=cover` y `env(safe-area-inset-bottom)` en la barra
  inferior, la barra de acción, la hoja de filtros y el aviso de actualización.

## Alternativas consideradas

- **Conservar el cajón como navegación principal:** menos código, pero mantiene el patrón de
  escritorio y el coste de dos toques por cambio de sección.
- **Duplicar el panel de acciones en la página y en la barra:** dos estados y dos formularios
  montados; se prefiere una sola instancia que cambia de modo.
- **“Cargar más” en la lista:** habría cambiado el contrato de búsqueda de la ruta; se conserva la
  paginación.

## Consecuencias

- Se actualizan las pruebas de la barra superior (tres controles), del detalle (sin sección
  “Acciones” en móvil) y de la hora manual (las acciones pueden vivir en el menú “Más”), y se añade
  `e2e/mobile-navigation.spec.ts`.
- Los baselines visuales móviles (panel, métricas y detalle) cambian a propósito.
- El estado activo de la navegación usa `aria-current="page"` en lugar de la clase `active`, que
  TanStack Router no aplica cuando se define `activeProps`; también corrige el resaltado del
  sidebar de escritorio.
- El ADR 0091 sigue vigente: el recorte de contenido por rol no cambia.
