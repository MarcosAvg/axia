-- Índices para los filtros de la lista de tiquets.
create index idx_tickets_team on public.tickets (team_id);
create index idx_tickets_priority on public.tickets (priority_id);
create index idx_tickets_requester on public.tickets (requester_id);
create index idx_tickets_dependency on public.tickets (dependency_id);
create index idx_tickets_service_type on public.tickets (service_type_id);
create index idx_tickets_possible_duplicate on public.tickets (reported_at desc)
  where possible_duplicate;
create index idx_ticket_assignments_technician
  on public.ticket_assignments (assignee_technician_id)
  where stage = 'technician';
