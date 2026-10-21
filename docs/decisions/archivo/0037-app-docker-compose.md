# 0037 — Aplicación en Docker Compose del stack anterior

> **Archivada.** Esta decisión describe una implementación anterior. Se conserva como historia y no debe usarse como guía del sistema actual.


- Fecha: 2026-10-13
- Estado: sustituida por 0075 y 0078

## Contexto

El frontend anterior necesitaba configuración de la plataforma en runtime, así que una imagen
genérica no podía servir para cualquier instalación sin generar un archivo de configuración.

## Decisión

Se mantuvieron dos piezas: el backend gestionado por un lado y un compose con `web` y `migrate` por
otro. El contenedor `web` generaba su configuración al arrancar y las migraciones se publicaban como
imagen aparte.

## Consecuencias

- El despliegue requería coordinar dos piezas y sus secretos.
- La imagen web no era independiente del backend.
- El stack propio actual sirve el SPA y la API desde un solo servidor (ADR 0078).