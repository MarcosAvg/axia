-- Repara duraciones negativas históricas y evita que vuelvan a insertarse.
-- Nada se inventa: una fila incoherente se colapsa a duración cero y se avisa
-- del conteo reparado. Las escrituras nuevas ya usan el instante de la acción.

do $$
declare
  repaired integer;
begin
  update public.ticket_participants
  set ended_at = started_at
  where ended_at < started_at;
  get diagnostics repaired = row_count;
  raise notice 'ticket_participants reparadas: %', repaired;

  update public.ticket_assignments
  set ended_at = assigned_at
  where ended_at < assigned_at;
  get diagnostics repaired = row_count;
  raise notice 'ticket_assignments reparadas: %', repaired;

  update public.ticket_pauses
  set closed_at = opened_at
  where closed_at < opened_at;
  get diagnostics repaired = row_count;
  raise notice 'ticket_pauses reparadas: %', repaired;

  update public.ticket_pause_steps
  set exited_at = entered_at
  where exited_at < entered_at;
  get diagnostics repaired = row_count;
  raise notice 'ticket_pause_steps reparadas: %', repaired;

  update public.tickets
  set closed_at = reported_at
  where closed_at < reported_at;
  get diagnostics repaired = row_count;
  raise notice 'tickets reparados: %', repaired;
end $$;

alter table public.ticket_participants
  add constraint ticket_participants_time_check
  check (ended_at is null or ended_at >= started_at);

alter table public.ticket_assignments
  add constraint ticket_assignments_time_check
  check (ended_at is null or ended_at >= assigned_at);

alter table public.ticket_pauses
  add constraint ticket_pauses_time_check
  check (closed_at is null or closed_at >= opened_at);

alter table public.ticket_pause_steps
  add constraint ticket_pause_steps_time_check
  check (exited_at is null or exited_at >= entered_at);

alter table public.tickets
  add constraint tickets_closed_after_reported_check
  check (closed_at is null or closed_at >= reported_at);
