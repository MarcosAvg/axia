-- Las alertas pendientes son datos derivados: se recalculan al recapturar y en
-- el relleno de duplicados. El rol de la aplicación necesita retirarlas; las
-- decisiones ya tomadas no se borran.
grant delete on public.ticket_duplicate_candidates to axia_app;
