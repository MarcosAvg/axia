# 0121 — Tableros de solo lectura por bandeja

**Fecha:** 2026-11-06
**Estado:** aceptada

## Decisión

Bandeja y Mi trabajo ofrecen una vista adicional de tablero en `/inbox/tablero` y
`/mi-trabajo/tablero`. El tablero muestra los siete estados activos como columnas y cada tarjeta
abre el detalle; no permite arrastrar ni cambiar estados. Las bandejas conservan su lista y solo
agregan un botón «Ver tablero»; el tablero ofrece «Ver lista» para volver.

Las rutas se declaran con el guion bajo de TanStack Router (`inbox_.tablero.tsx`,
`mi-trabajo_.tablero.tsx`) para que la URL cuelgue de la bandeja sin anidarse en su componente, que
no renderiza `Outlet`. El tablero reutiliza `GET /api/tickets`, `GET /api/tickets/mine` y
`GET /api/tickets/offers`, con un tamaño de página de 100 (el máximo de la API).

En Bandeja se muestran los tiquets del equipo con los filtros de búsqueda, edificio y categoría.
Las ofertas para la persona se marcan con la insignia «Oferta para ti» y no se duplican: ya forman
parte del ámbito visible del supervisor. Mi trabajo conserva la ausencia de filtros de su bandeja.
Si el total supera los 100 tiquets cargados, se avisa y se enlaza a la lista.

## Alternativas y consecuencias

Se descartó poner pestañas Lista/Tablero dentro de cada bandeja porque cambia su diseño, que se
quería conservar. También se descartó un tablero único con selector de ámbito porque separa la
vista de la bandeja que refleja y agrega un destino al menú.

Arrastrar tarjetas se descartó en esta fase: en Axia ningún estado cambia sin una acción del
servidor con sus datos, permisos e historial (evidencia «antes», motivo de pausa, descripción y
evidencia «después», política de validación). Un arrastre solo podría abrir el formulario de la
acción, lo que convierte una vista de lectura en otro flujo de trabajo y queda para una decisión
posterior.

El coste es que el tablero puede quedar incompleto en equipos con más de 100 tiquets activos; el
aviso lo hace explícito y la lista sigue disponible. Si el volumen lo exige, una iteración
posterior puede consultar por columna. Las ofertas que queden fuera de esos 100 no aparecen en el
tablero, pero siguen visibles en la sección de ofertas de la bandeja.
