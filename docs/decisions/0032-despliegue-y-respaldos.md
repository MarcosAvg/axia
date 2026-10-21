# 0032 — Despliegue y respaldos del stack anterior

- Fecha: 2026-10-12
- Estado: sustituida por 0075

## Decisión

El despliegue anterior separaba el backend gestionado del frontend y las migraciones. Los secretos
se mantenían fuera del repositorio, el frontend se servía como estático y se documentaba un contrato
de reverse proxy. Los respaldos usaban `pg_dump` y se conservaban fuera del servidor.

## Consecuencias

- El frontend se publicaba aparte del backend.
- Las migraciones dependían de la CLI anterior.
- El respaldo de archivos y base se trataba por separado.

La instalación actual con Compose, secretos generados y respaldos propios está en el ADR 0075.
