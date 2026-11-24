alter table public.push_subscriptions
  add column session_id uuid references public.sessions(id) on delete cascade;

alter table public.notification_deliveries
  add column push_subscription_id uuid
    references public.push_subscriptions(id) on delete cascade,
  drop constraint notification_deliveries_notification_id_channel_key,
  add unique nulls not distinct (notification_id, channel, push_subscription_id);

create index notification_deliveries_push_subscription_idx
  on public.notification_deliveries (push_subscription_id);

create function public.enqueue_web_push() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  insert into public.notification_deliveries
    (notification_id, channel, push_subscription_id)
  select new.id, 'push', p.id
  from public.push_subscriptions p
  join public.sessions s on s.id = p.session_id
  where p.user_id = new.recipient_user_id
    and s.revoked_at is null and s.expires_at > now() and s.idle_expires_at > now();
  return new;
end;
$$;

create trigger notifications_enqueue_web_push
after insert on public.notifications for each row
when (new.channel = 'in_app' and new.recipient_user_id is not null)
execute function public.enqueue_web_push();

revoke execute on function public.enqueue_web_push() from public;
grant execute on function public.enqueue_web_push() to axia_app;
