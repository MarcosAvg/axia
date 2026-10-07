# 0002 — Supabase como backend

- Fecha: 2026-10-07
- Estado: aceptada

## Contexto

Axia necesita autenticación, base de datos relacional, almacenamiento de evidencias (fotos y
archivos), actualizaciones en tiempo real y una forma de ejecutar lógica privilegiada. Debe poder
autoalojarse y también usarse en la nube, y la seguridad debe imponerse en el servidor, no solo en
la interfaz.

## Decisión

Usar **Supabase**: Postgres con **RLS** para la seguridad, Auth, Storage, Realtime y Edge
Functions (Deno). El cliente se importa únicamente desde `features/*/api` y `lib/`; la
`service role key` nunca llega al frontend. El acceso local y autoalojado usa el stack oficial de
Docker.

## Alternativas consideradas

- **Backend propio (Node + Postgres):** más control, pero mucho más trabajo de operación y de
  seguridad.
- **Firebase:** modelo de datos no relacional y reglas de acceso que no encajan con un modelo
  relacional con roles y catálogos.
- **PocketBase / Appwrite:** más limitados en SQL y RLS para el modelo previsto.

## Consecuencias

- El modelo de datos es **Postgres estándar** y la seguridad vive en RLS, con pruebas pgTAP.
- Se puede autoalojar con Docker o usar la nube; el esquema es el mismo.
- Se depende de la CLI y del stack de Supabase para desarrollo; los tipos se generan con
  `pnpm db:types`.
- Salir sería costoso, pero el esquema y las consultas son Postgres.
