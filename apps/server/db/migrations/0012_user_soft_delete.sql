-- Las cuentas con historial se conservan para no romper la bitácora.
alter table public.users
  add column deleted_at timestamp with time zone;

comment on column public.users.deleted_at is
  'Borrado lógico; la fila se conserva si la cuenta tiene historial.';

grant delete on public.users to axia_app;
