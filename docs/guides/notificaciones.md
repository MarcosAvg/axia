# Consultar avisos

La campana muestra cuántos avisos tienes sin leer. Ábrela o entra en **Avisos** (`/avisos`) para
consultarlos, abrir el tiquet relacionado y marcar uno o todos como leídos.

Los avisos llegan mientras tienes Axia abierta y con sesión. Al volver a la aplicación o recuperar
la conexión se consultan los cambios pendientes. Solo se entregan eventos que corresponden al
alcance de tu cuenta; un solicitante sin cuenta no tiene bandeja. Quien lleva su seguimiento debe
comunicarle la información por el medio que utilice su organización.

## Disponibilidad actual

Existe bandeja dentro de la aplicación y actualización en tiempo real mediante SSE. No hay entrega
por Web Push ni correo, ni un planificador activo de escalamiento o alertas por vencimiento.
Guardar una regla o un valor de configuración no activa esas capacidades futuras.

Para los contratos de bandeja, recuperación de cambios y conexión SSE, consulta
[API](../reference/api.md). Las tablas reservadas se describen en [Datos](../concepts/datos.md).
Las reglas aprobadas de alertas permanecen en [Negocio](../concepts/negocio.md), RN-21.
