-- Fase 7D: suscripciones de notificaciones push (base para futuros envíos).
-- El envío real (Edge Function con VAPID) y el `push` del service worker quedan documentados en
-- docs/notificaciones-push.md; aquí solo se guarda la suscripción del navegador.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.push_subscriptions is
  'Suscripciones Web Push del navegador de cada usuario (una por endpoint).';

create index idx_push_subscriptions_user on public.push_subscriptions (user_id);

create trigger push_subscriptions_set_updated_at before update on public.push_subscriptions
  for each row execute function public.set_updated_at();

alter table public.push_subscriptions enable row level security;

-- Cada usuario administra sus propias suscripciones.
create policy push_subscriptions_select on public.push_subscriptions
  for select to authenticated using (user_id = auth.uid());
create policy push_subscriptions_insert on public.push_subscriptions
  for insert to authenticated with check (user_id = auth.uid());
create policy push_subscriptions_update on public.push_subscriptions
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy push_subscriptions_delete on public.push_subscriptions
  for delete to authenticated using (user_id = auth.uid());
