-- Recalcula `closed_at` desde el último evento terminal del ciclo actual. Lo
-- usa el ajuste de hora para que el cierre y los tramos sigan al evento.

create or replace function public.recompute_ticket_closed_at(p_ticket_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ticket record;
  v_closed timestamptz;
begin
  select status, cycle, closed_at into v_ticket
  from public.tickets where id = p_ticket_id;
  if not found then return; end if;

  if v_ticket.status not in ('closed', 'rejected', 'cancelled', 'duplicate') then
    update public.tickets set closed_at = null where id = p_ticket_id;
    return;
  end if;

  select max(e.occurred_at) into v_closed
  from public.ticket_events e
  where e.ticket_id = p_ticket_id
    and e.cycle = v_ticket.cycle
    and (
      e.type in ('rejected', 'cancelled', 'duplicate_marked')
      or (e.type = 'validated'
        and coalesce(e.payload->>'partial', 'false') = 'false')
      or e.type = 'claim_resolved'
    );

  if v_closed is not null then
    update public.tickets set closed_at = v_closed where id = p_ticket_id;
  end if;
end;
$$;

comment on function public.recompute_ticket_closed_at(uuid) is
  'Recalcula el cierre del tiquet desde su evento terminal del ciclo actual.';
