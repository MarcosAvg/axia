-- Complete the built-in pause trees. Never rewrite operator choices, existing
-- nodes or historical events; installations without demo need these exits too.
insert into public.reasons (use, parent_id, name, clock_class)
select 'pause', root.id, states.name, root.clock_class
from (values
  ('Falta de personal', 'Sin técnico disponible'),
  ('Falta de personal', 'Técnico no capacitado'),
  ('Falta de personal', 'Requiere especialista'),
  ('Falta de personal', 'Personal disponible'),
  ('Proveedor o contratista externo', 'Por contactar'),
  ('Proveedor o contratista externo', 'Contactado'),
  ('Proveedor o contratista externo', 'Visita agendada'),
  ('Proveedor o contratista externo', 'En garantía'),
  ('Proveedor o contratista externo', 'Servicio del proveedor concluido'),
  ('Acceso al área', 'Sin acceso'),
  ('Acceso al área', 'Área ocupada'),
  ('Acceso al área', 'Esperando al solicitante'),
  ('Acceso al área', 'Fuera de horario permitido'),
  ('Acceso al área', 'Acceso disponible'),
  ('Autorización', 'Esperando aprobación de presupuesto'),
  ('Autorización', 'Esperando aprobación de dirección'),
  ('Autorización', 'Autorización recibida'),
  ('Herramienta o equipo especial', 'Por conseguir'),
  ('Herramienta o equipo especial', 'En renta o préstamo'),
  ('Herramienta o equipo especial', 'Herramienta disponible'),
  ('Condiciones externas', 'Clima'),
  ('Condiciones externas', 'Falla de servicios'),
  ('Condiciones externas', 'Condiciones restablecidas'),
  ('Dependencia de otro tiquet', 'Pendiente de otro tiquet'),
  ('Dependencia de otro tiquet', 'Tiquet relacionado concluido'),
  ('Esperando información del solicitante', 'Información solicitada'),
  ('Esperando información del solicitante', 'Información recibida'),
  ('Programado', 'Fecha pendiente'),
  ('Programado', 'Fecha acordada alcanzada')
) as states(root_name, name)
join public.reasons root on root.name = states.root_name
  and root.use = 'pause' and root.parent_id is null
on conflict (use, parent_id, name) do nothing;
