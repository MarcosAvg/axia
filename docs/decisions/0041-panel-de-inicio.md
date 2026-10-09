# 0041 — Panel de inicio como centro de bandejas

- Fecha: 2026-10-09
- Estado: aceptada

## Contexto

El Panel (`/`) era una sola tarjeta con un saludo y la lista de roles del usuario. No aportaba
nada: ni bandejas, ni pendientes, ni accesos. Además, la semilla no creaba tiquets, así que las
vistas se veían vacías y era difícil evaluar la interfaz.

## Decisión

Convertir el Panel en un **centro de bandejas con métricas propias del usuario**, en un feature
nuevo `features/dashboard`:

- **Números según rol**, calculados de las bandejas del propio usuario (RLS ya limita lo que ve):
  - **Técnico**: mi trabajo, en curso, en pausa, por validar.
  - **Supervisor**: ofertas pendientes, tiquets activos, en pausa, por validar.
  - **Administrador**: tiquets activos, sin asignar, en pausa, cerrados.
  - **Solo consulta / solicitante**: activos, en pausa, por validar, cerrados.
- **Bandejas**: ofertas para ti, mi trabajo y tiquets activos (del equipo o propios), con
  "Ver todos" y estado vacío.
- **Acciones rápidas**: nuevo tiquet, ver tiquets, métricas y administración, según permisos.

Los números personales son **distintos** del tablero global de `/metricas`, que no cambia. Se
reutilizan las consultas existentes de tiquets (`useMyWork`, `useMyOffers`, `useTicketsList`),
sin añadir vistas ni endpoints, y una función pura probada (`summarizeWork`).

Se complementa con una **semilla de demostración** (ver Etapa 1) para que las vistas tengan datos.

## Alternativas consideradas

- **Panel como tablero de métricas resumido:** duplicaría `/metricas` y mediría lo global, no lo
  del usuario.
- **Traer métricas nuevas por técnico:** requería vistas/consultas adicionales; basta con las
  bandejas y el RLS para lo personal.

## Consecuencias

- El Panel es útil de entrada: cada quien ve lo suyo y accesos directos.
- Cambiar de rol cambia los números; no hay lógica de negocio nueva en el cliente.
- El tablero global sigue en `/metricas` con el permiso `metrics.view`.
