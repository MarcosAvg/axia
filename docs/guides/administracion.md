# Administración

Guía de las tareas administrativas disponibles en la interfaz. Requiere el permiso correspondiente;
el detalle de permisos está en [`../reference/permisos.md`](../reference/permisos.md).

## Usuarios

En `/admin/usuarios` se crean cuentas, se asignan roles, se activan o desactivan, se eliminan y se
restablecen contraseñas.

- Una cuenta nueva recibe una contraseña temporal y debe cambiarla al entrar.
- **Desactivar** bloquea el acceso y revoca las sesiones, pero conserva la cuenta visible.
- **Eliminar** quita la cuenta de la lista y libera el nombre de usuario. Si la cuenta no tiene
  historial, se borra; si participó en tiquets, se conserva de forma lógica para que la bitácora
  mantenga su nombre.
- La última cuenta administradora activa no se puede desactivar, eliminar ni degradar.
- Una cuenta no puede quitarse a sí misma el rol de administrador ni eliminarse.
- El restablecimiento de contraseña revoca las sesiones de esa cuenta.
- Los vínculos con solicitantes y técnicos se gestionan en `/admin/ambitos`.

## Roles y permisos

En `/admin/roles` se crean roles y se asigna cada permiso con su ámbito:

| Ámbito | Alcance |
|---|---|
| `own` | Solo los tiquets propios o asignados, según el permiso |
| `team` | Los tiquets del equipo |
| `buildings` | Los edificios del ámbito de supervisor |
| `all` | Toda la instancia |

Los roles son datos: se pueden renombrar y recomponer sin cambiar el código. La interfaz se protege
por permiso, no por nombre de rol.

## Ámbitos y designaciones

En `/admin/ambitos` se vinculan cuentas con solicitantes y técnicos, se crean ámbitos de supervisor
(equipo y edificios) y se asignan técnicos a categorías.

## Catálogos

En `/admin/catalogos` se administran equipos, edificios, ubicaciones, dependencias, categorías,
subcategorías, problemas (con su equipo), tipos de servicio, prioridades, canales, solicitantes,
técnicos y motivos.

- Los catálogos se desactivan; no se borran.
- En **Dependencias**, el formulario de alta/edición incluye las ubicaciones. Hay que marcar al
  menos una; la dependencia solo aparece en esas ubicaciones del alta de tiquets.
- **Exportar** descarga `catalogos.xlsx` con una hoja por catálogo, referencias por nombre y las
  filas activas e inactivas. Ese mismo archivo se puede **Importar** en otra instancia o en la
  misma: inserta lo nuevo y actualiza lo existente sin duplicar, sin borrar y sin tocar las celdas
  vacías. Categorías, subcategorías y problemas llevan cada nivel en su propia columna
  (`Categoría`, `Subcategoría`, `Problema`) y el problema incluye su `Equipo`.
- Cada tiquet conserva una instantánea de los valores usados.
- Los motivos son jerárquicos y se agrupan por uso: pausa, rechazo, cancelación, reasignación,
  recaptura, reclamación, reactivación y apoyo auxiliar.

## Calendarios

En `/admin/calendarios` se configuran calendarios, franjas semanales y festivos. El calendario por
defecto y el calendario de cada equipo determinan el tiempo laboral de los indicadores.

## Configuración de la instancia

En `/admin/configuracion` se ajustan:

- la etiqueta del equipo y la zona horaria;
- la política de validación y los días de validación automática;
- la ventana de reclamación y la política de evidencia de la solicitud;
- el patrón de folio, la prioridad y el calendario por defecto;
- el modo de reloj de SLA y los eventos visibles para el solicitante.

Los cambios aplican a los cálculos y a las pantallas siguientes; no reescriben el historial.
