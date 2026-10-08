begin;

set search_path = extensions, public;

select plan(1);
select has_schema('public', 'existe el esquema public');

select * from finish();

rollback;
