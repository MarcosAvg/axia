-- Orden natural portable: los tramos numéricos se comparan como números.
create function public.natural_sort_key(value text)
returns text
language sql
immutable
strict
parallel safe
as $$
  select coalesce(
    string_agg(
      case
        when part[1] ~ '^[0-9]+$'
          then lpad(part[1], greatest(20, length(part[1])), '0')
        else part[1]
      end,
      '' order by ordinal
    ),
    ''
  )
  from regexp_matches(coalesce(value, ''), '[0-9]+|[^0-9]+', 'g')
    with ordinality as m(part, ordinal)
$$;

revoke all on function public.natural_sort_key(text) from public;
grant execute on function public.natural_sort_key(text) to axia_app;
