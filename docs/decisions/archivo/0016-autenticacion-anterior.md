# 0016 — Autenticación anterior y guard por permisos

> **Archivada.** Esta decisión describe una implementación anterior. Se conserva como historia y no debe usarse como guía del sistema actual.


- Fecha: 2026-10-08
- Estado: sustituida por 0070

## Contexto

La primera versión necesitaba inicio de sesión, perfiles y rutas protegidas. Las cuentas y los
roles vivían en la base, pero faltaba una identidad única para el cliente.

## Decisión

- Autenticación con correo y contraseña en la plataforma anterior, sin auto-registro.
- Un disparador creaba el perfil al alta de la cuenta.
- El cliente obtenía perfil, roles y permisos con una función de identidad.
- La interfaz se protegía por permiso, no por nombre de rol.

## Consecuencias

- La identidad y los permisos quedaron centralizados en una llamada.
- La autorización dependía de políticas y funciones de la plataforma anterior.
- La autenticación local con sesiones opacas la sustituyó en el ADR 0070.