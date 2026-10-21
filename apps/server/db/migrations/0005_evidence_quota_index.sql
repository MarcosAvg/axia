-- axia:no-transaction
create index concurrently if not exists idx_evidence_uploaded_by_ready
  on public.evidence (uploaded_by)
  where processing_state = 'ready';
