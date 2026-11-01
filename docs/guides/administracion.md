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

En `/admin/roles` se crean roles y se asignan permisos con su ámbito. Consulta la tabla de
[Permisos](../reference/permisos.md) antes de ampliar un acceso: dar un rol no crea por sí solo
vínculos con solicitantes, técnicos ni edificios.

Los roles se pueden renombrar y recomponer; la interfaz y el servidor comprueban permisos,
no nombres de rol. Prueba la cuenta afectada después de cambiar roles o ámbitos.

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

Para un motivo de pausa nuevo, crear primero la raíz y después al menos un subestado con el mismo
uso y la raíz como padre. Ambos deben estar activos. Las raíces incompletas no se ofrecen al
pausar; los diez motivos preconfigurados ya tienen subestados. El padre no puede ser el mismo
motivo ni uno de sus descendientes. Los motivos nuevos se crean activos por defecto.

Mientras haya pausas abiertas en el árbol, solo se pueden cambiar nombres/orden o agregar nodos;
desactivar, mover o cambiar su uso se rechaza para conservar una salida. Guardar refresca también
los selectores operativos. La interfaz muestra los errores esperados de captura o duplicado.

Antes de operar una instancia propia, configurar al menos un recorrido activo de edificio →
ubicación → dependencia vinculada y categoría → subcategoría → problema con equipo; añadir técnicos,
designaciones y cobertura de supervisión. Una persona de catálogo puede existir sin cuenta.
La ausencia de supervisor candidato se trata como «sin ruteo» para administración (RN-03).

## Calendarios

En `/admin/calendarios` se configuran calendarios, franjas semanales y festivos. El calendario por
defecto y el calendario de cada equipo determinan el tiempo laboral de los indicadores.

## Configuración de la instancia

En `/admin/configuracion` se ajustan:

- la etiqueta del equipo y la zona horaria;
- la política de validación y el valor de días de validación automática;
- la ventana de reclamación y la política de evidencia de la solicitud;
- el patrón de folio, la prioridad y el calendario por defecto;
- la ventana, el umbral y los datos visibles de la detección de duplicados;
- el modo de reloj de SLA y los eventos visibles para el solicitante.

Los cambios no reescriben el historial. Aunque se puede guardar un número de días para validación
automática, actualmente no hay un planificador que la ejecute. Tampoco se ejecutan escalamiento
ni entregas Web Push: consulta [Notificaciones](notificaciones.md).

## Duplicados

Un tiquet nuevo se compara con los tiquets abiertos del mismo edificio dentro de la ventana
configurada. Si coincide en ubicación y problema, o el texto se parece por encima del umbral, se
marca como **posible duplicado**: aparece un badge en la lista, en la tabla y en el encabezado, y un
aviso al entrar al detalle. Quien tenga el permiso de marcar duplicados puede enlazar el original o
descartar la alerta; el formulario de marcado muestra primero los candidatos detectados y deja la
búsqueda por folio como alternativa. Los tiquets creados antes de activar la detección se pueden
recalcular con `pnpm db:duplicates`.

La administración de cuentas y catálogos se realiza aquí; respaldos, actualización y recuperación
de la instancia corresponden a [Operación](operacion.md).
