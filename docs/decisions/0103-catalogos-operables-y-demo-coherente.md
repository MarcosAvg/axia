# 0103 — Catálogos operables y demo coherente

**Fecha:** 2026-10-31
**Estado:** aceptada

## Decisión

Los catálogos pueden configurarse progresivamente, pero una acción no puede introducir un estado
sin salida por falta de sus datos obligatorios. Una raíz de pausa necesita un subestado activo
antes de usarse; no se relaja la obligación de indicar subestado al reanudar (RN-13).
La migración 0018 completa los nueve árboles iniciales incompletos de forma aditiva e idempotente,
sin editar migraciones integradas ni sobrescribir nodos configurados por el operador.

La administración valida nombres, tipos y parentesco del mismo uso, sin ciclos. Mientras un árbol
tiene pausas abiertas se permiten nombres, orden y nodos nuevos; se rechazan cambios estructurales
que puedan quitarles la salida. Pausar y editar coordinan sus comprobaciones con bloqueos de tabla
compatibles para lecturas y exclusivos para edición, dentro de sus transacciones.
Los errores esperados de captura se devuelven como 400/409 y se muestran sin exponer SQL.

La demo conserva escenarios ficticios pero con relaciones operativas reales: ofertas, asignación,
participación, evidencia privada y validaciones coherentes. Las imágenes sintéticas se rotulan DEMO
sin depender de archivos remotos. Un fallo conocido de la transacción retira solo sus archivos
nuevos; no existe atomicidad distribuida entre PostgreSQL y el sistema de archivos.
Reejecutar la semilla no reescribe tiquets ni eventos: solo recupera ofertas ausentes de tiquets
demo registrados que todavía no tienen actividad operativa.

## Alternativas y consecuencias

Completar solo las semillas dejaría el bloqueo disponible al editar catálogos. Exigir un hijo al
crear cada raíz impediría configurar un árbol por pasos. Se permiten raíces en preparación, se
excluyen de la selección operativa y el servidor comprueba la precondición de nuevo.
Los bloqueos conservadores simplifican la integridad de catálogos pequeños; no son un bloqueo
normal del trabajo de los tiquets. La edición de un árbol utilizado deberá esperar a cerrar sus
pausas, o limitarse a nombres, orden y nuevos subestados.

Las relaciones opcionales del negocio siguen siendo opcionales: personas sin cuenta son válidas.
Una instalación limpia requiere configurar edificios, equipos, clasificación y cobertura propios;
la demo no se convierte en datos obligatorios de producción. Los escenarios demo antiguos no se
reescriben retroactivamente; las evidencias y validaciones completas se generan para los nuevos.
