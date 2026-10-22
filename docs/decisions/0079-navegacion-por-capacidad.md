# 0079 — Navegación por capacidad y permisos

## Contexto

La navegación mostraba “Mi trabajo” y “Bandeja” a cualquier usuario con `ticket.view`. Para
solicitantes y técnicos esas vistas quedaban vacías o generaban 403 al pedir ofertas. Además, el
panel consultaba ofertas, SLA y satisfacción sin comprobar el permiso, por lo que técnicos y
solicitantes veían “No se pudo cargar el panel”. Las rutas de administración y el menú usaban
permisos distintos, lo que rompía los roles personalizados.

## Decisión

- La identidad autenticada incluye `technicianId`. “Mi trabajo” solo aparece si existe.
- “Bandeja” solo aparece con `ticket.take_offer`; “Nuevo tiquet” solo con `ticket.create`.
- Las consultas opcionales del panel se habilitan por permiso: ofertas con `ticket.take_offer`, SLA
  y satisfacción con `metrics.view`.
- Las rutas ocultas también tienen guard de cliente y muestran “Sin acceso”.
- Administración usa permisos específicos: `catalog.manage`, `user.manage`, `role.manage` y
  `assignment.manage`; el layout acepta cualquiera y las tarjetas se filtran por el permiso de su
  destino.
- La autorización real sigue en el servidor; esto solo evita ofrecer destinos sin sentido o
  provocar errores visibles.

## Consecuencias

- La respuesta de `GET /api/auth/me` y del inicio de sesión añade `technicianId`; no hay migración
  de base de datos.
- Los roles personalizados ven exactamente las secciones que pueden abrir.
- Se eliminan consultas 403 evitables en el panel y en el detalle del tiquet.
- Las pruebas de roles cubren la matriz de navegación, el botón de alta y las rutas ocultas.
