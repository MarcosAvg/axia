-- Permisos sin acción asociada en el núcleo: no se otorgan ni se usan.
delete from public.role_permissions
where permission_id in (
  'ticket.open_claim_on_behalf',
  'ticket.cancel_on_behalf',
  'ticket.reopen',
  'data.import'
);

delete from public.permissions
where id in (
  'ticket.open_claim_on_behalf',
  'ticket.cancel_on_behalf',
  'ticket.reopen',
  'data.import'
);
