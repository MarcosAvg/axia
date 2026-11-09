# Validación de ambos lados por una misma cuenta

## Intención

Una cuenta que es a la vez solicitante y supervisora del mismo tiquet debe poder registrar los dos
lados de la validación. Hoy el servidor la trata siempre como solicitante y el segundo intento
responde 409, así que el tiquet queda en `attended` (ver la revisión de multirol en
`docs/internal/estado.md`).

La persona ya decidió el 2026-11-09 que se haga con **dos pasos explícitos**: uno por lado, cada uno
con su evento y su tramo de tiempo. No se registran ambos lados en un solo clic.

## Alcance

**Dentro**

- Registrar el lado del solicitante y el del supervisor desde la misma cuenta, en pasos separados.
- Respetar la política de la instancia (`requester`, `supervisor`, `both`) y el orden solicitante →
  supervisor de `both`.
- Exponer en el detalle qué lados faltan y cuáles puede validar la cuenta.
- Mostrar dos botones explícitos en la interfaz y mantener la proyección offline.

**Fuera**

- La sombra de ámbito (`own` sustituido por `team`/`buildings`), la titularidad y la reclamación de
  un supervisor que también es solicitante. Son hallazgos separados de la misma revisión y quedan
  pendientes de decisión.
- Cambios de esquema: `ticket_validations` ya admite una fila por rol y ciclo.

## Comportamiento

### Políticas

| Política | Lados que cuentan | Orden | Qué ve una cuenta con ambos papeles |
|---|---|---|---|
| `requester` | Solicitante | — | Solo «Validar como solicitante» |
| `supervisor` | Supervisor | — | Solo «Validar como supervisor»; no se registra el lado del solicitante |
| `both` | Ambos | Solicitante y después supervisor | Primero «Validar como solicitante»; hecho ese paso, «Validar como supervisor» |

En `both`, pedir el lado del supervisor antes de que exista el del solicitante responde 409. Repetir
un lado ya registrado responde 409. Al completar los lados que exige la política, el tiquet pasa a
`closed` en la misma transacción.

### Autorización

- **Lado del solicitante:** lo registra la cuenta vinculada al solicitante del tiquet, o quien actúe
  con `subjectRequesterId` y `ticket.validate_on_behalf`. Sigue exigiendo `ticket.validate`.
- **Lado del supervisor:** lo registra quien tenga `ticket.validate` con ámbito `team`, `buildings`
  o `all` sobre el tiquet, o sea supervisor titular. Una cuenta que solo tiene `ticket.validate` con
  ámbito `own` no puede validar este lado.
- La misma cuenta puede cumplir ambos criterios; el servidor decide por `role`, no por identidad.
- Sin `role` en la petición se conserva la derivación anterior para no romper clientes ni acciones
  offline ya encoladas: `subjectRequesterId` → solicitante; política `requester` → solicitante;
  política `supervisor` → supervisor; en `both`, si falta el lado del solicitante y el actor es el
  solicitante, solicitante; en otro caso, supervisor.

### Contrato

`POST /api/tickets/:id/actions` con `action: "validate"` acepta un campo opcional:

```json
{ "role": "requester" | "supervisor" }
```

Los eventos `validated` siguen guardando `payload.role`. El lado del solicitante se atribuye con
`subjectRequesterId`; el del supervisor con `subjectUserId`. Cuando es la misma cuenta, la bitácora
muestra los dos pasos y los tramos se cortan en cada evento.

### Detalle

`GET /api/tickets/:id` agrega:

- `supervisorValidated: boolean`.
- `canValidateRequester: boolean`: la política admite ese lado y la cuenta puede registrarlo
  (solicitante o proxy). No considera si ya está registrado.
- `canValidateSupervisor: boolean`: la política admite ese lado y la cuenta puede registrarlo como
  supervisor (ámbito o titularidad). No considera el orden de `both` ni si ya está registrado.

La web combina esos indicadores con `requesterValidated`, `supervisorValidated` y la política para
decidir qué botón mostrar. Deja de adivinar ámbito.

### Interfaz

- Dos acciones de un clic: `validate_requester` («Validar como solicitante») y
  `validate_supervisor` («Validar como supervisor»). Solo aparece la que corresponde al sujeto
  elegido y a la política.
- La barra móvil y el panel comparten la misma lista de acciones.
- El modal de calificación se abre **solo** después del lado del solicitante.
- El aviso de «esperando la validación del solicitante» se mantiene para quien solo puede validar el
  lado del supervisor. La cuenta con ambos papeles ve el botón del solicitante, no el aviso.
- La regla que hoy devuelve cero acciones a un solicitante que ya validó se ajusta para conservar
  `validate_supervisor`; el servidor ya permite esa acción porque `validate` está exento de
  `assertValidatedRequesterCanAct`.

### Offline

- El comando `validate` acepta `args.role` opcional.
- La proyección local agrega `supervisorValidated` y decide el lado por `args.role`; si falta, usa la
  derivación anterior.
- En `both`, la primera acción deja el tiquet en `attended` y la segunda lo proyecta como `closed`.

## Alternativas descartadas

- **Un solo botón que registra ambos lados:** no permite separar los tramos de tiempo ni auditar dos
  decisiones; el tramo del supervisor quedaría en cero. Descartada por la persona.
- **Deducción por identidad con un segundo intento automático:** mantiene el 409 actual y no deja
  claro qué lado se registró. Descartada.

## Pruebas

- Servidor (PostgreSQL real): misma cuenta en `both` valida solicitante y después supervisor y
  cierra; repetir un lado da 409; supervisor antes que solicitante da 409; `supervisor` registra solo
  su lado; `requester` solo el suyo; cuenta solo solicitante no puede el lado del supervisor; cuenta
  solo supervisora no puede el lado del solicitante sin proxy; con proxy sí; permisos negativos;
  idempotencia por lado; eventos y atribución de tiempo.
- Web: botones por política y por lado pendiente; el aviso de espera; la calificación solo tras el
  lado del solicitante; la proyección offline de dos pasos.
- E2E: se mantiene el flujo actual de dos cuentas; se agrega, si el guion demo lo permite sin
  cambiar sus datos, un caso de una cuenta con ambos papeles. Si no, la cobertura de integración es
  la evidencia principal.
- `pnpm check:fast`, `pnpm test:affected` y, antes de integrar, `pnpm check` completo.

## Documentación y decisión

- `docs/concepts/negocio.md` (RN-15), `docs/reference/estados-y-transiciones.md`,
  `docs/reference/permisos.md` y `docs/reference/api.md`.
- ADR `docs/decisions/0123-validacion-dos-lados-misma-cuenta.md`.
- `docs/internal/estado.md` al terminar.

## Riesgos

- La derivación sin `role` debe conservar el comportamiento de las acciones offline antiguas; se
  prueba explícitamente.
- El lado del supervisor sigue sujeto al ámbito actual. Una cuenta con ambos papeles pero sin ámbito
  sobre el tiquet no verá ese botón; es la sombra de ámbito pendiente, no una regla nueva.
- Sin migración: si una instalación ya tiene una validación del solicitante, el nuevo botón del
  supervisor aparece sin pasos adicionales.
