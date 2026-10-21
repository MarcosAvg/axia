# Auditoría de UI/UX — 2026-10-18

Auditoría de lectura y en vivo sobre la aplicación local con datos ficticios.
Se revisaron las pantallas principales y las siete secciones de administración
en escritorio (1440×900), móvil (390×844 y 360×800), claro y oscuro. No se
modificaron datos de negocio durante la revisión.

## Veredicto

La base técnica es sólida. El problema no es la falta de componentes, sino la
**falta de un modelo de operación y de seguridad**: la interfaz reporta cifras,
pero no siempre prioriza lo que no avanza; y la administración permite acciones
irreversibles sin confirmación ni guardarraíles.

| Área | Estado | Lectura |
|---|---|---|
| Operación (Panel y tiquets) | Mejorable | Funciona, pero no prioriza riesgo ni antigüedad |
| Métricas | Mejorable | Densa, repetitiva y con tablas que se recortaban |
| Administración | Crítico → Mejorable | Se corrigieron los riesgos de bloqueo; falta rediseño de IA |
| Accesibilidad | Crítico → Mejorable | Tokens AA, foco y objetivos táctiles corregidos; falta auditoría continua |
| Móvil | Mejorable | Administración ya no desborda; Métricas sigue muy larga |
| Identidad visual | Mejorable | Correcta, pero genérica |

## Hallazgos corregidos en este tramo

### Seguridad de administración

- Se podía desactivar al último administrador, quitarse el rol administrativo o
  desactivar el rol `administrator`. Ahora hay guardarraíles puros y probados.
- Borrar ámbitos, franjas y festivos era inmediato. Ahora pide confirmación.
- Los diálogos de alta/edición se cerraban antes de saber si la mutación había
  funcionado. Ahora esperan el éxito.
- Varias mutaciones fallaban en silencio. Ahora muestran error y, cuando aplica,
  éxito.
- El rol Administrador conserva todos los permisos y no se puede desactivar.

### Administración móvil y datos internos

- La matriz de permisos desbordaba (425 px en un viewport de 390) y los selects
  de ámbito quedaban en una letra. Ahora es una lista apilada con select a ancho
  completo.
- La tabla de usuarios dejaba “Vínculo”, “Activo” y acciones fuera de vista.
  Ahora hay tarjetas en móvil.
- La navegación de catálogos era una tira de 1,276 px. Ahora es un selector en
  móvil.
- “Motivos” mostraba valores internos (`cancellation`, `pause`, …). Ahora
  muestra “Cancelación”, “Pausa”, etc.
- Las fechas de calendario se mostraban en ISO. Ahora usan la zona y el formato
  de la institución.

### Confianza y accesibilidad

- El Panel mostraba ceros y “Sin actividad” mientras cargaba. Ahora espera la
  identidad, muestra skeletons y ofrece reintento ante error.
- Abrir un tiquet tomaba la oferta automáticamente. Ahora es un banner con
  “Tomar tiquet”.
- Los KPI rotaban colores por índice; “Primera resolución 100%” aparecía en
  rojo. Ahora los valores son neutros y el color queda para estado, prioridad y
  SLA.
- Se corrigieron contrastes AA en claro, bordes de campo, anillos de foco y
  objetivos táctiles de ayudas y chips.
- Se quitaron tarjetas duplicadas de SLA, se evitó el corte de la columna “Fuera
  de horario” y se añadió rango a la paginación.

## Hallazgos pendientes

### Administración

1. **Correo y ciclo de vida de cuentas.** La tabla de usuarios no muestra correo
   ni último acceso; no hay alta, invitación ni restablecimiento. Requiere una
   RPC/vista de directorio y la Edge Function de invitación.
2. **Reglas de notificación y escalamiento.** Las tablas existen, pero no hay
   pantalla de administración.
3. **Parámetros de duplicados.** `duplicate_window`, `duplicate_similarity` y
   `duplicate_shown_fields` no se exponen.
4. **Auditoría administrativa.** No se registra quién cambió roles, permisos,
   usuarios o configuración.
5. **Rediseño de la matriz de roles.** Ya tiene búsqueda y el rol admin está
   protegido, pero sigue siendo una lista de ~3,000 px. Conviene una matriz con
   grupos colapsables y “seleccionar todo el grupo”.
6. **Shell de administración.** Cada sección mantiene su propio patrón
   (maestro-detalle, pestañas, formulario largo). Un shell común con navegación
   secundaria reduciría la sensación de siete pantallas distintas.
7. **Ámbitos y designaciones.** Falta confirmar la eliminación de categorías de
   técnico y mostrar mejor el impacto de un ámbito.

### Operación y métricas

1. **Panel operativo.** No hay una bandeja “Requieren atención” con pausas
   largas, sin ruteo, sin asignar o SLA en riesgo; la lista activa sigue
   ordenada por fecha de registro.
2. **Lista de tiquets.** Faltan técnico, SLA y motivo de pausa; la antigüedad ya
   se muestra.
3. **Detalle móvil.** La actividad sigue al final; conviene una pestaña o un
   orden que ponga el “por qué” antes de la evidencia.
4. **Métricas.** Los filtros no están en la URL; en móvil la página supera los
   4,600 px y el panel de filtros ocupa demasiado. Conviene plegarlo y guardar
   el estado en la URL.
5. **Gráficas.** El volumen mensual se dibuja como línea; para conteos discretos
   es más claro barras. Las dimensiones con nombres largos funcionarían mejor en
   barras horizontales.
6. **Identidad.** El login ya no duplica la marca; falta una firma visual
   (por ejemplo, la línea de vida del tiquet) y un logo definitivo.

## Dirección propuesta

**El estado manda.** Cada pantalla debe responder, en este orden: qué requiere
atención, qué está detenido y por qué, y qué cambió. La firma puede ser la
**línea de vida del tiquet**: etapas, etapa actual, tiempo en cada una y motivo
de pausa.

**Administración con red de seguridad.** Confirmar lo irreversible, impedir
quedarse sin administrador, un modelo de guardado explícito por pantalla y
feedback visible. El siguiente paso estructural es el shell común y la matriz de
roles.

## Verificación

- `pnpm check` en verde: lint, tipos, agnosticismo, fronteras, knip, 237 Vitest,
  16 Playwright, 466 pgTAP y build.
- `pnpm test:visual` actualizado y en verde.
- Revisión en vivo de guardarraíles, confirmaciones, carga del Panel, oferta
  explícita, etiquetas de Motivos, fechas de calendario y móvil de roles,
  usuarios y catálogos.
