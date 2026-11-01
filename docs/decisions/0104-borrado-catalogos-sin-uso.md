# 0104 — Borrado de catálogos solo cuando no tienen uso

**Fecha:** 2026-10-31
**Estado:** aceptada

## Decisión

Un registro de catálogo puede eliminarse solo si nada lo referencia. Si tiquets, historial,
configuración o avisos lo usan, el servidor conserva la fila y responde `409` con la causa
(“tiene subestados”, “hay tiquets que usan este motivo”) para que la persona lo desactive en su
lugar. Es la excepción mínima a RN-22: se borra lo que nunca entró al negocio y se conserva todo
lo demás.

El borrado corre en una transacción y se apoya en las claves foráneas ya existentes. Los vínculos
que pertenecen al propio registro (vínculos dependencia–ubicación, franjas y festivos de un
calendario, designaciones de un técnico) se retiran con él. Los vínculos compartidos que no deben
desaparecer en silencio se comprueban antes: designaciones de una categoría, ubicaciones vinculadas
a dependencias y avisos de un solicitante. La administración pide confirmación explícita y las
acciones siguen exigiendo `catalog.manage`.

## Alternativas y consecuencias

Desactivar automáticamente lo usado con un clic en “Eliminar” habría sido más corto, pero deja un
registro visible que la persona creía eliminado. Borrar en cascada habría roto bitácora, métricas y
referencias históricas, y habría exigido cambiar el esquema. Se elige el conflicto explícito: la
persona entiende por qué no se borró y desactiva, que es la salida prevista por el negocio.

Consecuencia: el menú de fila gana una acción destructiva que puede fallar; el mensaje debe ser
claro y la confirmación debe advertir que lo usado no se borrará. Un catálogo sin uso se pierde de
forma definitiva, sin historial que conservar.
