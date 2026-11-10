-- El cierre de participaciones es responsabilidad de los servicios, que usan
-- la hora de la acción. El trigger la cerraba con now() y, al ejecutarse antes
-- del servicio, pisaba la hora manual o la del dispositivo.
drop trigger if exists tickets_close_participants on public.tickets;
