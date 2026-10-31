# Dominio y glosario

Axia sigue solicitudes de mantenimiento desde su registro hasta el cierre. El tiquet conserva
su captura, responsables, evidencias e historial; cuando se detiene, registra el motivo y su
avance. Funciona por sí misma, sin depender de otra plataforma.

Las reglas aprobadas están en [Negocio](negocio.md). Para operar, consulta [Uso](../guides/uso.md);
para códigos y precondiciones, [Estados y transiciones](../reference/estados-y-transiciones.md).
Este glosario ayuda a leer la interfaz y el código; no añade reglas.

| Término | Significado | Código |
|---|---|---|
| Tiquet | Solicitud con estado e historial propios | `ticket` |
| Folio / número | Identificador legible inmutable / consecutivo global | `folio` / `ticket_number` |
| Equipo | Grupo que atiende; se obtiene del problema | `team` |
| Dependencia | Unidad que solicita, vinculada a ubicaciones | `dependency` |
| Edificio / ubicación | Lugar del problema; la ubicación pertenece a un edificio | `building` / `location` |
| Clasificación | Categoría → subcategoría → problema | `category` / `subcategory` / `problem` |
| Captura / recaptura | Datos registrados / corrección con versiones, sin aprobación | `capture` / `recapture` |
| Solicitante | Persona del catálogo, con cuenta opcional | `requester` |
| Técnico | Persona del catálogo que ejecuta el trabajo, con cuenta opcional | `technician` |
| Supervisor | Persona que recibe ofertas y coordina la atención en su ámbito | `supervisor` |
| Auxiliar | Participante que apoya al responsable | `auxiliary` |
| Actor / sujeto | Quien registra una acción / a nombre de quien actúa | `actor` / `subject` |
| Ciclo de atención | Vuelta de trabajo; una reapertura inicia otra | `cycle` |
| Pausa / subestado | Motivo que impide avanzar / paso dentro de ese motivo | `pause` / `pause_step` |
| Reclamación | Inconformidad que se evalúa para cerrar, reabrir o derivar | `claim` |
| Evidencia | Archivo asociado al tiquet, al ciclo y al paso correspondiente | `evidence` |
| Bitácora | Eventos de solo agregar; distingue hora de acción y de registro | `ticket_events` |
| Tramo de tiempo | Intervalo derivado de las acciones para medir la atención | `time_span` |

Los roles agrupan permisos; sus nombres no determinan el acceso. La referencia de
[Permisos](../reference/permisos.md) explica ámbitos y actuación a nombre de otra persona.
[Datos](datos.md) describe las relaciones y la definición ejecutable del esquema.
