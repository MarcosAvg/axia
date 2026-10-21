# 0002 — Stack anterior (retirado)

> **Archivada.** Esta decisión describe una implementación anterior. Se conserva como historia y no debe usarse como guía del sistema actual.


- Fecha: 2026-10-07
- Estado: sustituida por 0067, 0068, 0070 y 0078

## Contexto

La primera versión necesitaba autenticación, base relacional, archivos, tiempo real y lógica
privilegiada. Se eligió una plataforma gestionada para acelerar el arranque.

## Decisión

Se usó un stack gestionado con Postgres, autenticación, almacenamiento y tiempo real, con la
seguridad en la base. El cliente hablaba solo desde `features/*/api` y `lib/`, y los secretos
privilegiados nunca llegaban al frontend.

## Consecuencias

- El modelo de datos era Postgres estándar, pero la autorización dependía de políticas de la
  plataforma y de funciones específicas.
- El desarrollo y las pruebas dependían de su CLI y de servicios externos.
- La migración al stack propio se cerró en el ADR 0078; esta decisión queda como historia.