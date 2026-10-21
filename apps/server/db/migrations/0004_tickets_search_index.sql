-- axia:no-transaction
create index concurrently if not exists idx_tickets_folio_trgm
  on public.tickets using gin (folio extensions.gin_trgm_ops);
