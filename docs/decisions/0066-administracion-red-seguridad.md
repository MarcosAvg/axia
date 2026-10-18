# 0066 — Administración con red de seguridad

## Contexto

La auditoría de UI/UX con la aplicación en vivo encontró que las pantallas de
administración eran funcionales pero no seguras: se podía desactivar al último
administrador, quitarse el rol administrativo, borrar ámbitos o festivos sin
confirmación y perder cambios porque algunas mutaciones se guardaban al instante
y otras no. Además, el móvil de roles desbordaba y la tabla de usuarios dejaba
acciones fuera de vista.

## Decisión

1. **Confirmaciones explícitas.** `ConfirmDialog` es el patrón único para
   acciones destructivas. Se aplica a desactivar cuentas, quitar ámbitos y
   borrar franjas o días no laborables.
2. **Guardarraíles de acceso.** Funciones puras en `domain/access-guards.ts`:
   - no se puede desactivar la propia cuenta;
   - no se puede desactivar al último administrador activo;
   - no se puede quitar el rol administrativo al último administrador activo;
   - el rol `administrator` no se desactiva ni se le editan permisos desde la UI.
3. **Un modelo de guardado por pantalla.** La matriz de permisos guarda al
   instante y lo dice; la configuración usa guardado explícito con estado sucio y
   aviso antes de salir; los diálogos se cierran solo cuando la mutación tiene
   éxito. Las mutaciones de acceso muestran error y, cuando aplica, éxito.
4. **Administración móvil usable.** Los permisos se muestran como filas
   apiladas con selector a ancho completo; los usuarios pasan a tarjetas en
   móvil; los catálogos usan un selector en lugar de una tira horizontal.
5. **Datos internos no se filtran.** La columna “Uso” de Motivos muestra la
   etiqueta en español, no el valor del enum.
6. **Fechas de calendario legibles.** Los días no laborables se muestran en la
   zona de la institución (`1 ene 2026`), no en ISO.
7. **Confianza en el Panel.** La identidad se espera antes de pintar el armazón;
   el Panel muestra skeletons mientras carga, un error con reintento y no
   presenta ceros falsos. Tomar una oferta es una acción explícita.
8. **Color con significado.** Los KPI dejan de rotar colores por índice; el color
   queda para estado, prioridad, SLA y acciones destructivas. Se ajustan los
   tokens de éxito, información, advertencia y destrucción para cumplir AA en
   claro, y se refuerzan bordes de campo, foco y objetivos táctiles.

## Alternativas consideradas

- **Deshabilitar por completo el rol Administrador.** Se prefirió proteger solo
  su estado y sus permisos, dejando editable la etiqueta.
- **Guardar la matriz de permisos con un botón.** Se mantuvo el guardado
  inmediato por ser una matriz de muchos cambios, pero se hizo explícito en la
  interfaz y se protegieron los casos de bloqueo.
- **Añadir `alert-dialog` de shadcn/ui.** Se reutilizó `Dialog` para no sumar una
  dependencia y conservar el estilo existente.

## Consecuencias

- Nuevas pruebas puras de guardarraíles, filtros de permisos, etiquetas de
  catálogo, fechas y paginación.
- Se actualizó la prueba e2e de toma de oferta para pulsar “Tomar tiquet”.
- Se regeneraron las capturas visuales; `pnpm test:visual` pasa.
- No hay migraciones ni dependencias nuevas.
- Quedan pendientes: correo y alta/restablecimiento de cuentas, reglas de
  notificación/escalamiento, parámetros de duplicados en administración,
  auditoría de cambios administrativos y el rediseño completo de la matriz de
  roles.
