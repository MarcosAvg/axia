# 0045 — Permisos de evidencia y acciones visibles por estado

- Fecha: 2026-10-09
- Estado: aceptada

## Contexto

Dos problemas de interfaz: (a) el subidor de evidencia libre lo veía cualquier rol, aunque no
debiera saber que existe; (b) las acciones del detalle escondían todas menos la primaria en un
menú "Más acciones", cuando conviene ver de un vistazo lo que se puede hacer según el estado.

Además faltaba un paso explícito para la evidencia `during` (avance del trabajo).

## Decisión

- **Permisos configurables (conjunto fijo del sistema):**
  - `evidence.attach` — "Agregar evidencia fuera del flujo". Lo tiene **supervisor y
    administrador**; controla la visibilidad del **subidor libre**. Al técnico **se le oculta**
    (no se deshabilita).
  - `ticket.record_progress` — "Registrar el avance del trabajo con evidencia". Lo tienen
    **técnico, supervisor y administrador**; habilita el paso **"Registrar avance"**.
- **Backend:** la evidencia libre (`other`) exige `evidence.attach`; `evidence_add` acepta una
  **nota** opcional que viaja en el evento (p. ej. el avance de `during`).
- **Acciones visibles por estado:** se quita el menú "Más acciones"; se muestran **todas** las
  acciones permitidas como botones según estado y permiso, con la **primaria destacada** y los
  **descartes** (Rechazar, Cancelar, Marcar duplicado) **al final y con estilo de peligro**.
- **Paso `during`:** acción guiada "Registrar avance" (en proceso o pausado) con evidencia fija
  `during` y una nota opcional.
- **Tiempos manuales:** se mantienen gobernados por `time.record_manual` (supervisor/admin) y
  ocultos para quien no lo tenga.

## Alternativas consideradas

- **Deshabilitar en vez de ocultar:** no cumple "que el rol no sepa que existe".
- **Mantener el desplegable:** menos visible que el conjunto de acciones por estado.

## Consecuencias

- Cada rol ve solo lo que puede hacer; el subidor y los tiempos manuales dependen de permisos
  configurables por rol.
- Se retiran los e2e que abrían "Más acciones".
- Añadir un permiso nuevo obliga a actualizar la semilla, la matriz de roles y, si aplica, los
  checks de la interfaz.
