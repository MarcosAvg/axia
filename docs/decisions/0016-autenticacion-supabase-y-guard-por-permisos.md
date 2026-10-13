# 0016 — Autenticación con Supabase Auth y guard por permisos

- Fecha: 2026-10-08
- Estado: aceptada

## Contexto

La Fase 2 necesita inicio de sesión, perfiles y rutas protegidas. Las cuentas y los roles ya viven
en la base (`profiles`, `user_roles`, `roles`, `permissions`, `role_permissions`) con RLS de lectura
y `has_permission`; faltaba el alta automática del perfil, una forma de que el cliente conozca su
identidad (perfil, roles y permisos) y la estructura de la interfaz.

## Decisión

- **Supabase Auth** con **correo y contraseña**. Sin auto-registro: `[auth] enable_signup = false`
  (`GOTRUE_DISABLE_SIGNUP`); las cuentas las crea o invita un administrador. La recuperación de
  contraseña y el enlace mágico quedan fuera de esta fase.
  - Ojo: `[auth.email] enable_signup` **no** es el registro, es el interruptor del **proveedor de
    correo** (`GOTRUE_EXTERNAL_EMAIL_ENABLED`); con `false` se apaga el propio login con contraseña
    (`email_provider_disabled`). En Axia va `true`. Corregido el 2026-10-13 (rama
    `fix/auth-email-provider`).
- Un **disparador** (`on_auth_user_created`) crea la fila de `profiles` a partir de
  `raw_user_meta_data` (respaldo: el prefijo del correo y, si no, el identificador).
- El cliente conoce su identidad con la RPC **`me()`**, que devuelve perfil, roles y permisos (con
  su ámbito) en una sola llamada. Editar el perfil propio es la RPC **`profile_update()`**.
- La interfaz se protege **por permiso**, no por nombre de rol (los roles son configurables).
- **Endurecimiento de permisos**: se retira `EXECUTE` a `anon` (y a `PUBLIC`) de las funciones del
  esquema `public`, y se ajustan los privilegios por defecto para que tampoco se conceda a `anon`
  en el futuro. Solo `authenticated` (y `service_role`) ejecutan las RPC.

## Alternativas consideradas

- **Guard por nombre de rol en el cliente**: se descartó porque los roles son datos configurables;
  un rol renombrado o recompuesto rompería la interfaz.
- **Consultar perfil, roles y permisos por separado**: más viajes y lógica repetida; `me()` lo
  centraliza y es más fácil de probar.
- **Escritura del perfil con política de `UPDATE` en RLS**: se prefirió la RPC (consistente con el
  ADR 0015: la RLS es para lectura y la escritura pasa por funciones validadas).

## Consecuencias

- El perfil existe desde el alta de la cuenta; un usuario sin roles entra pero no ve nada hasta que
  un administrador le asigne roles (la administración llega en la Fase 3).
- `anon` no puede ejecutar ninguna función del núcleo; si alguna vez hace falta una RPC pública,
  se concederá de forma explícita.
- Se gana una sola llamada para la identidad y pruebas pgTAP de alta de perfil, `me()` y edición.
