-- Permisos para actuar a nombre del solicitante de forma explícita.
-- Se retiraron en 0011 por no tener uso; ahora el proxy del solicitante los exige.
insert into public.permissions (id, description) values
  ('ticket.open_claim_on_behalf', 'Abrir una reclamación a nombre del solicitante'),
  ('ticket.cancel_on_behalf', 'Cancelar a nombre del solicitante')
on conflict (id) do nothing;

insert into public.role_permissions (role_id, permission_id, scope)
select r.id, v.permission_id, v.scope::public.permission_scope
from (
  values
    ('supervisor', 'ticket.open_claim_on_behalf', 'team'),
    ('supervisor', 'ticket.cancel_on_behalf', 'team'),
    ('administrator', 'ticket.open_claim_on_behalf', 'all'),
    ('administrator', 'ticket.cancel_on_behalf', 'all')
) as v (role_name, permission_id, scope)
join public.roles r on r.name = v.role_name
on conflict do nothing;
