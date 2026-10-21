-- Login throttling is checked by IP on every attempt.
-- The table is small and this migration is initial-install only, so a normal
-- index creation is acceptable here.
create index if not exists login_attempts_ip_time_idx
  on public.login_attempts (ip, attempted_at desc)
  where ip is not null;
