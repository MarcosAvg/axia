import { sql, type SQL } from 'drizzle-orm'

/** Marca derivada de un tiquet registrado sin ofertas activas en su ciclo. */
export function isUnroutedSql(): SQL {
  return sql`(t.status = 'registered' and not exists (
    select 1 from public.ticket_offers o
    where o.ticket_id = t.id and o.cycle = t.cycle and o.status = 'offered'
  ))`
}
