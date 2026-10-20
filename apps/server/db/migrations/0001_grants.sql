-- Least-privilege grants for the application role. The role is created by the
-- migration runner from AXIA_APP_PASSWORD before this file is applied.
-- The owner role retains DDL; the app role never owns schema objects.

revoke all on schema public from public;
revoke create on schema public from public;
grant usage on schema public to axia_app;

grant usage on schema extensions to axia_app;
grant execute on all functions in schema extensions to axia_app;

-- Reads are broad; writes are narrowed below.
grant select on all tables in schema public to axia_app;

do $$
declare
  t record;
begin
  for t in
    select tablename
    from pg_tables
    where schemaname = 'public'
  loop
    execute format('grant insert, update on public.%I to axia_app', t.tablename);
  end loop;
end
$$;

-- Append-only or system-maintained tables.
revoke update on public.ticket_events, public.ticket_captures, public.ticket_ratings,
  public.ticket_validations, public.login_attempts, public.permissions from axia_app;
revoke insert on public.permissions from axia_app;
revoke delete on public.permissions from axia_app;

-- Explicit deletes only for relations, sessions, subscriptions, queues and admin catalogs.
grant delete on public.sessions, public.login_attempts, public.push_subscriptions,
  public.notification_deliveries, public.notifications, public.idempotency_keys,
  public.role_permissions, public.user_roles, public.supervisor_scope_buildings,
  public.technician_categories, public.catalog_aliases, public.import_status_map,
  public.catalog_import_rows, public.catalog_import_runs, public.catalog_import_specs,
  public.external_systems, public.ticket_external_refs, public.work_calendar_holidays,
  public.work_calendar_intervals, public.work_calendars, public.notification_rules,
  public.escalation_rules, public.reasons, public.teams, public.buildings, public.locations,
  public.dependencies, public.categories, public.subcategories, public.problems,
  public.priorities, public.service_types, public.channels, public.requesters,
  public.technicians, public.roles, public.supervisor_scopes, public.integration_tasks
  to axia_app;

grant usage, select on all sequences in schema public to axia_app;
grant execute on all functions in schema public to axia_app;

-- Keep PUBLIC from inheriting execution on functions added by future migrations.
revoke execute on all functions in schema public from public;
