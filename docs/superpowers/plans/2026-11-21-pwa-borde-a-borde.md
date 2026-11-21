# Plan de implementación de PWA de borde a borde

> Para ejecutar este plan, usa la guía superpowers:executing-plans y completa las tareas en orden.

### Objetivo

Que las listas y tarjetas se vean desplazándose detrás de la barra de gestos cuando el sistema lo permita, con los controles de Axia siempre accesibles y la barra de estado en el color del fondo del tema activo.

### Diseño acordado

La barra superior debe ser opaca. La inferior debe dejar ver el contenido en movimiento. El menú flotante de Axia y las acciones del tiquet quedan encima del área de gestos. El modo translúcido superior queda como una opción de diseño futura.

### Tecnología

React, CSS y Tailwind existentes, manifiesto PWA en modo `standalone`, Vitest y Playwright. El cambio no requiere dependencias.

## 1. Sincronizar el color de la barra de estado

- [ ] En `apps/web/src/components/shared/theme-provider.tsx`, leer el color de fondo efectivo después de llamar a `applyTheme`. Usar el fondo calculado de la página, que proviene de `--background`. Actualizar `meta[name="theme-color"]` con un color sRGB opaco compatible con el navegador. Los fondos actuales están en OKLCH. Si hace falta convertirlos para el metadato, usar Canvas 2D y conservar un color válido de reserva si la conversión falla.
- [ ] Revisar `apps/web/index.html` y `apps/web/vite.config.ts`. Alinear los colores de arranque y del manifiesto con el tema predeterminado. Mantener el arranque claro u oscuro según la preferencia ya guardada y sincronizar el color exacto cuando la hoja de estilos esté disponible. Retirar `THEME_COLOR` de `apps/web/src/lib/theme.ts` si ya no tiene consumidores.
- [ ] Mantener el estilo de barra de estado predeterminado en iOS. Comprobar en una instalación real qué color aplica iOS, cuánto tarda en actualizarse al cambiar de tema y si el reloj y los iconos se leen en ambos modos. Registrar el comportamiento que el sistema permita.
- [ ] Añadir un caso en `apps/web/e2e/theme.spec.ts` que compare el metadato con el fondo calculado en sRGB. Cubrir la carga con una preferencia guardada, el cambio de paleta sin cambiar el modo y el cambio de la preferencia del sistema cuando Axia está en modo automático. La comparación se hace sobre colores normalizados, no sobre cadenas CSS.

## 2. Extender el desplazamiento hasta el borde inferior

- [ ] Conservar `viewport-fit=cover` en `apps/web/index.html`. Antes de tocar el CSS, abrir la PWA instalada en Android con navegación por gestos, hacer scroll y comprobar si las tarjetas cruzan el indicador inferior. Repetir en iPhone. Medir `env(safe-area-inset-bottom)` mediante un elemento de diagnóstico y revisar qué elemento se desplaza. Esto distingue un recorte del layout de una barra que pinta el sistema.
- [ ] Si el layout recorta el contenido, ajustar `apps/web/src/features/shell/components/app-shell.tsx` para que el área desplazable llegue al borde. Aplicar el espacio inferior como relleno al final del flujo. Evitar una franja fija inferior o un margen que reduzca el área visible durante el scroll. Aprovechar el layout actual si la prueba en dispositivo ya muestra contenido detrás de los gestos.
- [ ] Mantener el menú de `app-tabbar.tsx` y las acciones de `apps/web/src/features/tickets/components/ticket-action-bar.tsx` sobre `env(safe-area-inset-bottom)`. Revisar la reserva `pb-44` de `ticket-detail-layout.tsx` con las acciones largas o en dos filas y ampliarla si la última acción del contenido queda tapada. Comprobar también el menú «Más» y los filtros móviles.
- [ ] En `apps/web/e2e/mobile-navigation.spec.ts`, simular un área segura inferior de 24 px mediante una variable CSS que en producción resuelva a `env(safe-area-inset-bottom)` si se necesita controlar la geometría desde la prueba. Verificar que el menú y la barra de acciones queden por encima del área de gestos y que el último elemento de cada pantalla se pueda desplazar por encima de los controles y activar. Probar un viewport de escritorio para comprobar que el espacio extra sea solo móvil.
- [ ] Si el sistema reserva una barra opaca, conservar el desplazamiento normal y los controles accesibles. Documentar esa limitación en `docs/reference/limitaciones.md` si se reproduce con la PWA instalada.

## 3. Validar y cerrar

- [ ] Ejecutar `pnpm check:fast`, `pnpm test:affected` y `pnpm test:e2e:smoke`. Incluir los casos nuevos con `@smoke`. Ejecutar `pnpm check` antes de integrar a `main`.
- [ ] En Android instalado, comprobar gestos y navegación de tres botones donde esté disponible. En iPhone instalado desde inicio, comprobar claro y oscuro. En ambos, revisar orientación vertical y horizontal, apertura y cierre del teclado, una lista larga y un detalle con acciones. Playwright comprueba el layout web. La transparencia y el color de las barras del sistema se comprueban en dispositivo.
- [ ] Dar por cumplido el efecto visual en una plataforma cuando se vea una tarjeta moverse por detrás del indicador de gestos, el último elemento pueda tocarse por encima de la botonera y la barra de estado sea legible con el tema aplicado. Anotar por separado los resultados de cada dispositivo, versión y modo de navegación.
- [ ] Registrar los cambios visibles en `CHANGELOG.md` y hacer commits pequeños con Conventional Commits.

## Referencias

- [Chrome para Android de borde a borde](https://developer.chrome.com/docs/css-ui/edge-to-edge)
- [Arquitectura de PWA instaladas en Android](https://chromium.googlesource.com/chromium/src/+/HEAD/components/webapps/docs/android_architecture.md)
- [Barra de estado de las apps web en iOS](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariHTMLRef/Articles/MetaTags.html)
