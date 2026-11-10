-- Aviso interno cuando una acción queda con hora no verificada.
-- No se envía al solicitante: la corrección es responsabilidad del equipo.

insert into public.notification_rules (event_type, recipient, channel)
select 'time_alert'::public.event_type, recipients.recipient, 'in_app'
from (values ('supervisor'), ('administrators')) as recipients(recipient)
where not exists (
  select 1
  from public.notification_rules r
  where r.event_type = 'time_alert'::public.event_type
    and r.recipient = recipients.recipient
    and r.channel = 'in_app'
);
