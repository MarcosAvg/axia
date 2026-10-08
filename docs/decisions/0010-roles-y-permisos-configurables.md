# 0010 — Roles y permisos configurables

- Fecha: 2026-10-07
- Estado: aceptada

## Contexto

La institución quiere ajustar quién puede hacer cada cosa sin desplegar. A la vez, la seguridad no
puede depender de metadatos editables por el usuario.

## Decisión

Los **permisos son un conjunto fijo** definido por el sistema (`permissions`, sembrados). Los
**roles son datos** (`roles`) y se arman con `role_permissions`, que asigna a cada permiso un
**ámbito** (`own`, `team`, `buildings`, `all`). `user_roles` liga cuentas y roles. La RLS y las RPC
consultan permisos con `has_permission`.

## Alternativas consideradas

- **Roles fijos en código:** descartado; la institución los quiere configurables.
- **Permisos también configurables:** demasiado; el sistema no puede proteger lo que no conoce.

## Consecuencias

- Roles semilla: solicitante, supervisor, técnico y administrador.
- La matriz de permisos vive en `docs/modelo-datos.md` §5.
- `has_permission` es `security definer` para leer los roles sin depender de la RLS.
