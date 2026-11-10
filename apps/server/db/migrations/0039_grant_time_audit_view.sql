-- La auditoría de tiempos corre con el rol de aplicación y consulta esta vista,
-- creada después del grant masivo de 0001_grants.sql.
grant select on public.v_ticket_phase_coverage to axia_app;
