-- Cada ruteo abre una ronda de ofertas: reasignar o recapturar no reescribe
-- las ofertas anteriores y el historial de tomas se conserva.
alter table public.ticket_offers
  add column offer_round integer not null default 1,
  drop constraint ticket_offers_ticket_id_cycle_supervisor_user_id_key,
  add constraint ticket_offers_offer_round_check check (offer_round > 0),
  add constraint ticket_offers_round_key
    unique (ticket_id, cycle, offer_round, supervisor_user_id);

comment on column public.ticket_offers.offer_round is
  'Ronda de oferta dentro del ciclo; un nuevo ruteo abre otra sin borrar las anteriores.';

alter type public.event_type add value if not exists 'unrouted';
